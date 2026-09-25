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
        "decision_id": run["decision_id"],
        "recommended_strategy_id": "STRATEGY-A-B",
        "now": ["A"],
        "next": ["B"],
        "later": [],
        "defer": ["C"],
        "reasoning_summary": "A provides evidence before the larger B investment.",
        "requires_approval": False,
        "state_version": 1,
    }


def optimization_result_payload(
    *,
    solver_run_id: str = "SOLVER-001",
    state_version: int = 1,
) -> dict:
    return {
        "status": "FEASIBLE",
        "selected_experiment_ids": [],
        "feasible_combinations": [[], ["A"], ["C"]],
        "objective_value": None,
        "solver_run_id": solver_run_id,
        "evaluated_state_version": state_version,
    }


def optimization_payload(run: dict, **result_overrides) -> dict:
    return {
        "decision_id": run["decision_id"],
        "result": {
            **optimization_result_payload(),
            **result_overrides,
        },
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
        json=optimization_payload(run),
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
    assert optimization.json() == optimization_result_payload()
    assert recommendation.status_code == 201, recommendation.text
    assert recommendation.json() == recommendation_payload(run)
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
    assert len(body["strategies"]) == 1
    strategy_ab = next(item for item in body["strategies"] if item["id"] == "STRATEGY-A-B")
    assert strategy_ab["feasibility"]["feasible"] is False
    assert strategy_ab["evaluation_status"] == "INFEASIBLE"


def test_optimization_contract_shape_and_idempotency(client):
    run = create_decision(client).json()
    payload = optimization_payload(run)
    headers = {
        "X-Internal-Service-Key": "local-development-only",
        "Idempotency-Key": "optimization-contract",
    }

    first = client.post(
        "/api/v1/optimization-results",
        json=payload,
        headers=headers,
    )
    replay = client.post(
        "/api/v1/optimization-results",
        json=payload,
        headers=headers,
    )
    changed = client.post(
        "/api/v1/optimization-results",
        json=optimization_payload(
            run,
            feasible_combinations=[[], ["A"]],
        ),
        headers=headers,
    )

    assert first.status_code == 201, first.text
    assert replay.status_code == 201
    assert replay.json() == first.json() == optimization_result_payload()
    assert set(first.json()) == {
        "status",
        "selected_experiment_ids",
        "feasible_combinations",
        "objective_value",
        "solver_run_id",
        "evaluated_state_version",
    }
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_optimization_rejects_flat_and_extra_public_shapes(client):
    run = create_decision(client).json()
    result = optimization_result_payload()
    headers = {
        "X-Internal-Service-Key": "local-development-only",
        "Idempotency-Key": "legacy-optimization",
    }

    flat = client.post(
        "/api/v1/optimization-results",
        json={"decision_id": run["decision_id"], **result},
        headers=headers,
    )
    extra = client.post(
        "/api/v1/optimization-results",
        json={
            "decision_id": run["decision_id"],
            "result": {**result, "decision_id": run["decision_id"]},
        },
        headers={**headers, "Idempotency-Key": "extra-optimization"},
    )

    assert flat.status_code == 422
    assert extra.status_code == 422


def test_optimization_rejects_authorizing_unknown_and_stale_state(client):
    run = create_decision(client).json()
    headers = {"X-Internal-Service-Key": "local-development-only"}

    authorizing_unknown = client.post(
        "/api/v1/optimization-results",
        json=optimization_payload(
            run,
            status="UNKNOWN",
            selected_experiment_ids=["A"],
            feasible_combinations=[],
        ),
        headers={**headers, "Idempotency-Key": "unknown-optimization"},
    )
    stale = client.post(
        "/api/v1/optimization-results",
        json=optimization_payload(
            run,
            solver_run_id="SOLVER-STALE",
            evaluated_state_version=2,
        ),
        headers={**headers, "Idempotency-Key": "stale-optimization"},
    )

    assert authorizing_unknown.status_code == 422
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "STATE_VERSION_CONFLICT"


def test_recommendation_rejects_infeasible_current_action(client):
    run = create_decision(client).json()
    payload = recommendation_payload(run)
    payload["recommended_strategy_id"] = "STRATEGY-B"
    payload["now"] = ["B"]
    payload["next"] = []
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


def test_recommendation_contract_shape_get_and_idempotency(client):
    run = create_decision(client).json()
    payload = recommendation_payload(run)
    headers = {
        "X-Internal-Service-Key": "local-development-only",
        "Idempotency-Key": "recommendation-contract",
    }


    first = client.post("/api/v1/recommendations", json=payload, headers=headers)
    replay = client.post("/api/v1/recommendations", json=payload, headers=headers)
    changed = client.post(
        "/api/v1/recommendations",
        json={**payload, "reasoning_summary": "Changed reasoning."},
        headers=headers,
    )
    retrieved = client.get(f"/api/v1/recommendations/{run['decision_id']}")

    assert first.status_code == 201, first.text
    assert replay.status_code == 201
    assert replay.json() == first.json() == payload
    assert retrieved.status_code == 200
    assert retrieved.json() == payload
    assert set(retrieved.json()) == {
        "decision_id",
        "recommended_strategy_id",
        "now",
        "next",
        "later",
        "defer",
        "reasoning_summary",
        "requires_approval",
        "state_version",
    }
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_recommendation_rejects_legacy_public_fields(client):
    run = create_decision(client).json()
    payload = recommendation_payload(run)
    headers = {
        "X-Internal-Service-Key": "local-development-only",
        "Idempotency-Key": "legacy-recommendation",
    }

    old_envelope = client.post(
        "/api/v1/recommendations",
        json={
            "run_id": run["id"],
            "candidate_strategies": [],
            "recommendation": payload,
            "tool_calls": [],
        },
        headers=headers,
    )
    extra_executable = client.post(
        "/api/v1/recommendations",
        json={**payload, "current_executable_experiment_id": "A"},
        headers={**headers, "Idempotency-Key": "legacy-executable"},
    )

    assert old_envelope.status_code == 422
    assert extra_executable.status_code == 422


def test_recommendation_rejects_unknown_decision_and_stale_state(client):
    run = create_decision(client).json()
    payload = recommendation_payload(run)
    headers = {"X-Internal-Service-Key": "local-development-only"}

    unknown = client.post(
        "/api/v1/recommendations",
        json={**payload, "decision_id": "DEC-UNKNOWN"},
        headers={**headers, "Idempotency-Key": "unknown-decision-rec"},
    )
    stale = client.post(
        "/api/v1/recommendations",
        json={**payload, "state_version": 2},
        headers={**headers, "Idempotency-Key": "stale-recommendation"},
    )
    invalid_strategy = client.post(
        "/api/v1/recommendations",
        json={**payload, "recommended_strategy_id": "B"},
        headers={**headers, "Idempotency-Key": "invalid-strategy-id"},
    )
    missing = client.get("/api/v1/recommendations/DEC-UNKNOWN")

    assert unknown.status_code == 404
    assert unknown.json()["error"]["code"] == "DECISION_NOT_FOUND"
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "DECISION_NOT_FOUND"
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "STATE_VERSION_CONFLICT"
    assert invalid_strategy.status_code == 422

