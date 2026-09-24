from app.services.agent_gateway import get_agent_gateway

INTERNAL_HEADERS = {
    "X-Internal-Service-Key": "local-development-only",
    "Idempotency-Key": "internal-operation",
}


class RecordingGateway:
    def __init__(self) -> None:
        self.run_ids: list[str] = []

    def dispatch_initial(self, run_id: str) -> None:
        self.run_ids.append(run_id)


def create_decision(client, key: str = "decision-initial"):
    return client.post(
        "/api/v1/decisions",
        json={"goal_id": "GOAL-001", "expected_state_version": 1},
        headers={"Idempotency-Key": key},
    )


def recommendation_payload(run: dict) -> dict:
    return {
        "run_id": run["id"],
        "candidate_strategies": [
            {
                "id": "STRATEGY-A-B",
                "experiment_ids": ["A", "B"],
                "sequence": ["A", "B"],
                "conditional": True,
                "condition": "Run B only after A completes with SUCCESS.",
            },
            {
                "id": "STRATEGY-C",
                "experiment_ids": ["C"],
                "sequence": ["C"],
                "conditional": False,
                "condition": None,
            },
        ],
        "recommendation": {
            "decision_id": run["decision_id"],
            "recommended_strategy_id": "STRATEGY-A-B",
            "current_executable_experiment_id": "A",
            "now": ["Run Experiment A"],
            "next": ["Evaluate Experiment A result"],
            "later": ["Consider Experiment B after A succeeds"],
            "defer": ["C"],
            "reasoning_summary": "A provides evidence before the larger B investment.",
            "requires_approval": False,
            "state_version": 1,
        },
        "tool_calls": ["check_feasibility", "calculate_consequences"],
    }


def test_create_decision_queues_run_without_changing_state(client):
    gateway = RecordingGateway()
    client.app.dependency_overrides[get_agent_gateway] = lambda: gateway

    response = create_decision(client)

    assert response.status_code == 202
    body = response.json()
    assert body["id"].startswith("RUN-")
    assert body["decision_id"].startswith("DEC-")
    assert body["run_type"] == "INITIAL"
    assert body["status"] == "QUEUED"
    assert body["input_state_version"] == 1
    assert gateway.run_ids == [body["id"]]
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_create_decision_is_idempotent_and_dispatches_once(client):
    gateway = RecordingGateway()
    client.app.dependency_overrides[get_agent_gateway] = lambda: gateway

    first = create_decision(client, "same-decision")
    second = create_decision(client, "same-decision")

    assert first.json() == second.json()
    assert gateway.run_ids == [first.json()["id"]]


def test_second_active_run_for_goal_is_rejected(client):
    first = create_decision(client, "first-run")
    second = create_decision(client, "second-run")

    assert first.status_code == 202
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "ACTIVE_RUN_EXISTS"


def test_internal_endpoints_require_service_credential(client):
    run = create_decision(client).json()
    response = client.post(
        "/api/v1/recommendations",
        json=recommendation_payload(run),
        headers={
            "X-Internal-Service-Key": "wrong",
            "Idempotency-Key": "bad-auth",
        },
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INTERNAL_AUTH_FAILED"


def test_agent_can_persist_optimization_and_recommendation(client):
    run = create_decision(client).json()
    optimization = client.post(
        "/api/v1/optimization-results",
        json={
            "decision_id": run["decision_id"],
            "status": "FEASIBLE",
            "selected_experiment_ids": ["A"],
            "feasible_combinations": [[], ["A"], ["C"]],
            "objective_value": 85,
            "solver_run_id": "SOLVER-001",
            "evaluated_state_version": 1,
        },
        headers={
            "X-Internal-Service-Key": "local-development-only",
            "Idempotency-Key": "solver-001",
        },
    )
    recommendation = client.post(
        "/api/v1/recommendations",
        json=recommendation_payload(run),
        headers={
            "X-Internal-Service-Key": "local-development-only",
            "Idempotency-Key": "recommendation-001",
        },
    )

    assert optimization.status_code == 201
    assert optimization.json()["status"] == "FEASIBLE"
    assert recommendation.status_code == 201
    assert recommendation.json()["current_executable_experiment_id"] == "A"
    assert client.get("/api/v1/state").json()["state_version"] == 1

    completed_run = client.get(f"/api/v1/decision-runs/{run['id']}")
    assert completed_run.json()["status"] == "SUCCEEDED"
    assert completed_run.json()["result"] == "NEW_RECOMMENDATION"
    assert completed_run.json()["recommendation_state_version"] == 1

    workspace = client.get(
        f"/api/v1/decisions/{run['decision_id']}/workspace"
    )
    assert workspace.status_code == 200
    body = workspace.json()
    assert body["state_version"] == 1
    assert body["recommendation"]["recommended_strategy_id"] == "STRATEGY-A-B"
    assert body["optimization_result"]["solver_run_id"] == "SOLVER-001"
    assert len(body["strategies"]) == 2
    strategy_ab = next(item for item in body["strategies"] if item["id"] == "STRATEGY-A-B")
    assert strategy_ab["feasibility"]["feasible"] is False
    assert strategy_ab["evaluation_status"] == "INFEASIBLE"


def test_recommendation_rejects_infeasible_current_action(client):
    run = create_decision(client).json()
    payload = recommendation_payload(run)
    payload["recommendation"]["current_executable_experiment_id"] = "B"
    response = client.post(
        "/api/v1/recommendations",
        json=payload,
        headers={
            "X-Internal-Service-Key": "local-development-only",
            "Idempotency-Key": "bad-current-action",
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "CURRENT_ACTION_INFEASIBLE"

