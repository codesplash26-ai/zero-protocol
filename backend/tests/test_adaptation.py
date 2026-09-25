from __future__ import annotations

import pytest

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
            "decision_id": run["decision_id"],
            "recommended_strategy_id": f"STRATEGY-{executable}",
            "now": [executable],
            "next": [],
            "later": [],
            "defer": [item for item in ["A", "B", "C"] if item != executable],
            "reasoning_summary": f"Experiment {executable} is now executable.",
            "requires_approval": executable == "B",
            "state_version": state_version,
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
            "strategy_id": "STRATEGY-A",
            "experiment_id": "A",
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


def _budget_event_payload(occurred_at: str, *, expected_state_version: int = 1) -> dict:
    return {
        "event_type": "BUDGET_CHANGE",
        "description": "Budget increased for contract verification.",
        "engineering_delta_hours": 0,
        "budget_delta_usd": 1,
        "experiment_id": None,
        "experiment_outcome": None,
        "commitment_id": None,
        "source": "contract_test",
        "occurred_at": occurred_at,
        "expected_state_version": expected_state_version,
    }


@pytest.mark.parametrize(
    "occurred_at",
    [
        "2026-09-25T05:43:47Z",
        "2026-09-25T05:43:47+00:00",
    ],
)
def test_event_accepts_utc_timestamps(client, occurred_at):
    response = client.post(
        "/api/v1/events",
        json=_budget_event_payload(occurred_at),
        headers={"Idempotency-Key": f"utc-event-{occurred_at}"},
    )

    assert response.status_code == 201
    assert response.json()["occurred_at"].endswith("Z")


@pytest.mark.parametrize(
    "occurred_at",
    [
        "2026-09-25T05:43:47",
        "2026-09-25T11:13:47+05:30",
    ],
)
def test_event_rejects_non_utc_timestamps(client, occurred_at):
    response = client.post(
        "/api/v1/events",
        json=_budget_event_payload(occurred_at),
        headers={"Idempotency-Key": f"invalid-utc-event-{occurred_at}"},
    )

    assert response.status_code == 422
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_event_is_idempotent_and_rejects_key_reuse(client):
    payload = _budget_event_payload("2026-09-25T05:43:47Z")
    headers = {"Idempotency-Key": "event-idempotency"}

    first = client.post("/api/v1/events", json=payload, headers=headers)
    replay = client.post("/api/v1/events", json=payload, headers=headers)
    changed = client.post(
        "/api/v1/events",
        json={**payload, "description": "Different event payload."},
        headers=headers,
    )

    assert first.status_code == 201
    assert replay.status_code == 201
    assert replay.json() == first.json()
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"
    assert client.get("/api/v1/state").json()["state_version"] == 2


def test_event_rejects_stale_state_version(client):
    response = client.post(
        "/api/v1/events",
        json=_budget_event_payload(
            "2026-09-25T05:43:47Z",
            expected_state_version=2,
        ),
        headers={"Idempotency-Key": "stale-event"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "STATE_VERSION_CONFLICT"


@pytest.mark.parametrize(
    ("outcome", "dependency_satisfied"),
    [("SUCCESS", True), ("FAILURE", False)],
)
def test_experiment_result_completes_a_and_preserves_dependency_rule(
    client,
    outcome,
    dependency_satisfied,
):
    _start_a(client)
    response = client.post(
        "/api/v1/events",
        json={
            "event_type": "EXPERIMENT_RESULT",
            "description": f"Experiment A completed with {outcome}.",
            "engineering_delta_hours": 0,
            "budget_delta_usd": 0,
            "experiment_id": "A",
            "experiment_outcome": outcome,
            "commitment_id": None,
            "source": "experiment_runner",
            "occurred_at": "2026-09-25T05:43:47Z",
            "expected_state_version": 2,
        },
        headers={"Idempotency-Key": f"complete-a-{outcome.lower()}"},
    )

    assert response.status_code == 201
    assert response.json()["state_version"] == 3
    experiment = client.get("/api/v1/experiments/A").json()
    assert experiment["status"] == "COMPLETED"
    assert experiment["outcome"] == outcome
    state = client.get("/api/v1/state").json()
    assert state["state_version"] == 3
    assert state["reserved_engineering_hours"] == 36
    assert state["available_engineering_hours"] == 24

    feasibility = client.post(
        "/api/v1/feasibility/check",
        json={
            "strategy": {
                "id": "STRATEGY-B",
                "experiment_ids": ["B"],
                "sequence": ["B"],
                "conditional": False,
                "condition": None,
            }
        },
    )
    assert feasibility.status_code == 200
    assert feasibility.json()["feasible"] is dependency_satisfied


def test_experiment_result_rejects_non_running_experiment(client):
    response = client.post(
        "/api/v1/events",
        json={
            "event_type": "EXPERIMENT_RESULT",
            "description": "Invalid result for proposed A.",
            "engineering_delta_hours": 0,
            "budget_delta_usd": 0,
            "experiment_id": "A",
            "experiment_outcome": "SUCCESS",
            "commitment_id": None,
            "source": "experiment_runner",
            "occurred_at": "2026-09-25T05:43:47Z",
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "invalid-a-result"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INVALID_EXPERIMENT_TRANSITION"
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_materiality_event_not_found(client):
    response = client.post(
        "/api/v1/events/EVENT-UNKNOWN/materiality",
        headers={"Idempotency-Key": "missing-event-materiality"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "EVENT_NOT_FOUND"


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
    assert state_v4["engineering_capacity_hours"] == 60
    assert state_v4["available_engineering_hours"] == (
        state_v4["engineering_capacity_hours"]
        - state_v4["reserved_engineering_hours"]
    )

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
    assert materiality.json()["state_version"] == 4
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
            "strategy_id": "STRATEGY-B",
            "experiment_id": "B",
            "approval_id": approval_b["id"],
            "expected_state_version": 4,
        },
        headers={"Idempotency-Key": "adaptation-start-b"},
    )
    assert action_b.status_code == 201
    assert action_b.json()["state_version"] == 5
    assert client.get("/api/v1/experiments/B").json()["status"] == "RUNNING"
    latest = client.get(
        f"/api/v1/recommendations/{initial_run['decision_id']}"
    )
    assert latest.status_code == 200
    assert latest.json()["now"] == ["B"]
    assert "current_executable_experiment_id" not in latest.json()
    audit = client.get(f"/api/v1/audit/{initial_run['decision_id']}")
    assert audit.status_code == 200
    trace = audit.json()["items"]
    assert all("title" not in item and "summary" not in item for item in trace)
    assert any(capacity["id"] in item["event_ids"] for item in trace)
    assert sum(item["action_receipt_id"] is not None for item in trace) == 2
    filtered_audit = client.get(
        "/api/v1/audit",
        params={"event_id": capacity["id"], "query": "materiality"},
    )
    assert len(filtered_audit.json()["items"]) == 1
    overview = client.get("/api/v1/overview").json()
    assert overview["organization_state"]["state_version"] == 5
    assert overview["latest_recommendation"]["now"] == ["B"]
    assert overview["governor_status"]["state"] == "MONITORING"
    assert overview["recent_activity"]


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
