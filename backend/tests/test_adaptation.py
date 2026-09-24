from __future__ import annotations

from app.services.agent_gateway import get_agent_gateway

INTERNAL_KEY = "local-development-only"


class RecordingGateway:
    def __init__(self) -> None:
        self.initial_runs: list[str] = []
        self.replan_runs: list[str] = []

    def dispatch_initial(self, run_id: str) -> None:
        self.initial_runs.append(run_id)

    def dispatch_replan(self, run_id: str) -> None:
        self.replan_runs.append(run_id)


def _persist_recommendation(
    client,
    *,
    run: dict,
    executable: str,
    state_version: int,
    key: str,
) -> dict:
    response = client.post(
        "/api/v1/recommendations",
        json={
            "run_id": run["id"],
            "candidate_strategies": [
                {
                    "id": "STRATEGY-A-B",
                    "experiment_ids": ["A", "B"],
                    "sequence": ["A", "B"],
                    "conditional": True,
                    "condition": "Run B only after A completes with SUCCESS.",
                }
            ],
            "recommendation": {
                "decision_id": run["decision_id"],
                "recommended_strategy_id": "STRATEGY-A-B",
                "current_executable_experiment_id": executable,
                "now": [f"Run Experiment {executable}"],
                "next": [f"Evaluate Experiment {executable}"],
                "later": [],
                "defer": [],
                "reasoning_summary": f"Experiment {executable} is now executable.",
                "requires_approval": False,
                "state_version": state_version,
            },
            "tool_calls": ["check_feasibility", "calculate_consequences"],
        },
        headers={
            "X-Internal-Service-Key": INTERNAL_KEY,
            "Idempotency-Key": key,
        },
    )
    assert response.status_code == 201
    return response.json()


def _start_a(client) -> tuple[dict, dict]:
    run_response = client.post(
        "/api/v1/decisions",
        json={"goal_id": "GOAL-001", "expected_state_version": 1},
        headers={"Idempotency-Key": "adaptation-initial"},
    )
    assert run_response.status_code == 202
    run = run_response.json()
    _persist_recommendation(
        client,
        run=run,
        executable="A",
        state_version=1,
        key="adaptation-rec-a",
    )
    approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]
    action = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": run["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "A",
            "action_type": "START_EXPERIMENT",
            "approval_id": approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "adaptation-start-a"},
    )
    assert action.status_code == 201
    return run, action.json()


def _complete_a_and_release_sso(client) -> tuple[dict, dict]:
    completion = client.post(
        "/api/v1/events",
        json={
            "event_type": "EXPERIMENT_RESULT",
            "description": "Experiment A completed successfully.",
            "engineering_delta_hours": 0,
            "budget_delta_usd": 0,
            "experiment_id": "A",
            "experiment_outcome": "SUCCESS",
            "commitment_id": None,
            "source": "experiment_runner",
            "occurred_at": "2026-09-22T08:15:00Z",
            "expected_state_version": 2,
        },
        headers={"Idempotency-Key": "complete-a"},
    )
    capacity = client.post(
        "/api/v1/events",
        json={
            "event_type": "CAPACITY_CHANGE",
            "description": "SSO vendor block releases 18 protected engineering hours.",
            "engineering_delta_hours": 18,
            "budget_delta_usd": 0,
            "experiment_id": None,
            "experiment_outcome": None,
            "commitment_id": "enterprise_sso",
            "source": "demo_simulation",
            "occurred_at": "2026-09-22T08:20:00Z",
            "expected_state_version": 3,
        },
        headers={"Idempotency-Key": "release-sso"},
    )
    assert completion.status_code == 201
    assert capacity.status_code == 201
    return completion.json(), capacity.json()


def test_event_application_materiality_and_replan_complete_v1_to_v5(client):
    gateway = RecordingGateway()
    client.app.dependency_overrides[get_agent_gateway] = lambda: gateway
    initial_run, action_a = _start_a(client)

    lifecycle_events = client.get(
        "/api/v1/events", params={"from_state_version": 2, "to_state_version": 2}
    ).json()["items"]
    assert action_a["state_version"] == 2
    assert len(lifecycle_events) == 1
    assert lifecycle_events[0]["source"] == "controlled_action"

    completion, capacity = _complete_a_and_release_sso(client)
    assert completion["state_version"] == 3
    assert client.get("/api/v1/experiments/A").json()["outcome"] == "SUCCESS"
    assert capacity["state_version"] == 4
    state_v4 = client.get("/api/v1/state").json()
    assert state_v4["reserved_engineering_hours"] == 18
    assert state_v4["available_engineering_hours"] == 42

    materiality = client.post(
        f"/api/v1/events/{capacity['id']}/materiality",
        headers={"Idempotency-Key": "capacity-materiality"},
    )
    assert materiality.status_code == 200
    assert materiality.json()["potentially_material"] is True
    assert materiality.json()["affected_fields"] == [
        "available_engineering_hours",
        "reserved_engineering_hours",
    ]
    assert client.get(
        f"/api/v1/events/{capacity['id']}/materiality"
    ).json() == materiality.json()

    replan_request = {
        "trigger_event_id": capacity["id"],
        "trigger_approval_id": None,
        "expected_state_version": 4,
    }
    replan = client.post(
        f"/api/v1/decisions/{initial_run['decision_id']}/replans",
        json=replan_request,
        headers={"Idempotency-Key": "capacity-replan"},
    )
    replay = client.post(
        f"/api/v1/decisions/{initial_run['decision_id']}/replans",
        json=replan_request,
        headers={"Idempotency-Key": "capacity-replan"},
    )
    assert replan.status_code == 202
    assert replan.json() == replay.json()
    assert replan.json()["run_type"] == "MATERIAL_EVENT"
    assert replan.json()["input_state_version"] == 4
    assert gateway.replan_runs == [replan.json()["id"]]

    recommendation = _persist_recommendation(
        client,
        run=replan.json(),
        executable="B",
        state_version=4,
        key="adaptation-rec-b",
    )
    assert recommendation["requires_approval"] is True
    approval_b = client.get(
        "/api/v1/approvals",
        params={"experiment_id": "B", "state_version": 4},
    ).json()["items"][0]
    approved = client.post(
        f"/api/v1/approvals/{approval_b['id']}/decision",
        json={
            "decision": "APPROVED",
            "reason": "Founder authorizes B after A succeeded.",
            "actor_id": "founder-demo",
            "expected_state_version": 4,
        },
        headers={"Idempotency-Key": "adaptation-approve-b"},
    )
    assert approved.status_code == 200
    action_b = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": initial_run["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "action_type": "START_EXPERIMENT",
            "approval_id": approval_b["id"],
            "expected_state_version": 4,
        },
        headers={"Idempotency-Key": "adaptation-start-b"},
    )
    assert action_b.status_code == 201
    assert action_b.json()["state_version"] == 5
    assert client.get("/api/v1/experiments/B").json()["status"] == "RUNNING"


def test_invalid_event_rolls_back_without_state_change(client):
    response = client.post(
        "/api/v1/events",
        json={
            "event_type": "CAPACITY_CHANGE",
            "description": "Invalid capacity loss.",
            "engineering_delta_hours": -25,
            "budget_delta_usd": 0,
            "experiment_id": None,
            "experiment_outcome": None,
            "commitment_id": None,
            "source": "test",
            "occurred_at": "2026-09-22T08:20:00Z",
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "invalid-capacity"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INVALID_RESOURCE_STATE"
    assert client.get("/api/v1/state").json()["state_version"] == 1
    assert client.get("/api/v1/events").json()["items"] == []


def test_replan_requires_stored_materiality(client):
    initial_run, _ = _start_a(client)
    _, capacity = _complete_a_and_release_sso(client)

    response = client.post(
        f"/api/v1/decisions/{initial_run['decision_id']}/replans",
        json={
            "trigger_event_id": capacity["id"],
            "trigger_approval_id": None,
            "expected_state_version": 4,
        },
        headers={"Idempotency-Key": "unclassified-replan"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EVENT_NOT_MATERIAL"
