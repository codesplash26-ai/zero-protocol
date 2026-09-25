from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select

from app.models import Experiment as ExperimentRecord
from app.models import OrganizationState as OrganizationStateRecord

INTERNAL_HEADERS = {
    "X-Internal-Service-Key": "local-development-only",
    "Idempotency-Key": "recommendation-governance",
}


def _create_recommendation(client) -> dict:
    run = client.post(
        "/api/v1/decisions",
        json={"goal_id": "GOAL-001", "expected_state_version": 1},
        headers={"Idempotency-Key": "governance-decision"},
    ).json()
    response = client.post(
        "/api/v1/recommendations",
        json={
            "decision_id": run["decision_id"],
            "recommended_strategy_id": "STRATEGY-A-B",
            "now": ["A"],
            "next": ["B"],
            "later": [],
            "defer": ["C"],
            "reasoning_summary": "A is the evidence gate for B.",
            "requires_approval": False,
            "state_version": 1,
        },
        headers=INTERNAL_HEADERS,
    )
    assert response.status_code == 201, response.text
    return {"run": run, "recommendation": response.json()}


def _create_b_approval(client, decision_id: str) -> dict:
    response = client.post(
        "/api/v1/approvals",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_ids": ["B"],
            "expected_state_version": 1,
        },
        headers={
            "X-Internal-Service-Key": "local-development-only",
            "Idempotency-Key": "approval-b",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_recommendation_uses_backend_policy_and_creates_action_approval(client):
    result = _create_recommendation(client)

    assert result["recommendation"]["requires_approval"] is False
    response = client.get(
        "/api/v1/approvals",
        params={
            "decision_id": result["run"]["decision_id"],
            "experiment_id": "A",
        },
    )
    assert response.status_code == 200
    approval = response.json()["items"][0]
    assert approval["decision"] == "NOT_REQUIRED"
    assert approval["experiment_id"] == "A"
    assert approval["authorized_cost_usd"] == 600
    assert approval["authorized_engineering_hours"] == 6
    assert approval["authorized_traffic"] == 4000
    assert approval["state_version"] == 1


def test_approval_check_for_a_matches_contract_v1(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]

    policy = client.post(
        "/api/v1/approvals/check",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_ids": ["A"],
            "expected_state_version": 1,
        },
    )

    assert policy.status_code == 200
    body = policy.json()
    assert body == {
        "approval_required": False,
        "reason": "Strategy cost is within the configured approval threshold.",
        "threshold_usd": 2000,
        "evaluated_cost_usd": 600,
        "state_version": 1,
    }
    assert "authorized_cost_usd" not in body


def test_high_cost_action_requires_human_decision_without_state_change(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]

    policy = client.post(
        "/api/v1/approvals/check",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_ids": ["B"],
            "expected_state_version": 1,
        },
    )
    approval = _create_b_approval(client, decision_id)
    decided = client.post(
        f"/api/v1/approvals/{approval['id']}/decision",
        json={
            "decision": "APPROVED",
            "reason": "Founder authorizes the bounded B start action.",
            "actor_id": "founder-001",
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "approve-b"},
    )

    assert policy.status_code == 200
    policy_body = policy.json()
    assert policy_body["approval_required"] is True
    assert policy_body["reason"] == "Strategy cost exceeds the configured approval threshold."
    assert policy_body["threshold_usd"] == 2000
    assert policy_body["evaluated_cost_usd"] == 2500
    assert policy_body["state_version"] == 1
    assert "authorized_cost_usd" not in policy_body
    assert approval["decision"] == "PENDING"
    assert decided.status_code == 200
    assert decided.json()["decision"] == "APPROVED"
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_approval_check_rejects_unknown_experiment(client):
    result = _create_recommendation(client)

    response = client.post(
        "/api/v1/approvals/check",
        json={
            "decision_id": result["run"]["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_ids": ["UNKNOWN"],
            "expected_state_version": 1,
        },
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "EXPERIMENT_NOT_FOUND"


def test_approval_check_rejects_stale_state_version(client):
    result = _create_recommendation(client)

    response = client.post(
        "/api/v1/approvals/check",
        json={
            "decision_id": result["run"]["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_ids": ["A"],
            "expected_state_version": 2,
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "STATE_VERSION_CONFLICT"


def test_approval_check_rejects_unknown_extra_fields(client):
    result = _create_recommendation(client)

    response = client.post(
        "/api/v1/approvals/check",
        json={
            "decision_id": result["run"]["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_ids": ["A"],
            "expected_state_version": 1,
            "unexpected": True,
        },
    )

    assert response.status_code == 422


def test_approval_check_rejects_old_action_scoped_shape(client):
    result = _create_recommendation(client)

    response = client.post(
        "/api/v1/approvals/check",
        json={
            "decision_id": result["run"]["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "action_type": "START",
            "expected_state_version": 1,
        },
    )

    assert response.status_code == 422


def test_action_enforces_exact_scope_and_successful_dependencies(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    approvals = client.get("/api/v1/approvals").json()["items"]
    a_approval = next(item for item in approvals if item["experiment_id"] == "A")
    b_approval = _create_b_approval(client, decision_id)
    client.post(
        f"/api/v1/approvals/{b_approval['id']}/decision",
        json={
            "decision": "APPROVED",
            "reason": "Approved within the recorded resource limits.",
            "actor_id": "founder-001",
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "approve-b-for-dependency-test"},
    )

    mismatch = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "approval_id": a_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "scope-mismatch"},
    )
    dependency = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "approval_id": b_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "dependency-not-ready"},
    )

    assert mismatch.status_code == 409
    assert mismatch.json()["error"]["code"] == "APPROVAL_SCOPE_MISMATCH"
    assert dependency.status_code == 409
    assert dependency.json()["error"]["code"] == "DEPENDENCY_NOT_SATISFIED"
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_pending_approval_cannot_execute_controlled_action(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    b_approval = _create_b_approval(client, decision_id)

    response = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "approval_id": b_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "pending-b-action"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "APPROVAL_REQUIRED"
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_execute_action_rejects_old_action_type_field(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    a_approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]

    response = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "A",
            "action_type": "START_EXPERIMENT",
            "approval_id": a_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "old-action-type-shape"},
    )

    assert response.status_code == 422


def test_execute_action_rejects_wrong_decision_and_strategy_scope(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    a_approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]

    wrong_decision = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": "DEC-WRONG",
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "A",
            "approval_id": a_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "wrong-action-decision"},
    )
    wrong_strategy = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-WRONG",
            "experiment_id": "A",
            "approval_id": a_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "wrong-action-strategy"},
    )

    assert wrong_decision.status_code == 409
    assert wrong_decision.json()["error"]["code"] == "APPROVAL_SCOPE_MISMATCH"
    assert wrong_strategy.status_code == 409
    assert wrong_strategy.json()["error"]["code"] == "APPROVAL_SCOPE_MISMATCH"
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_execute_action_rejects_stale_state_version(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    a_approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]

    response = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "A",
            "approval_id": a_approval["id"],
            "expected_state_version": 2,
        },
        headers={"Idempotency-Key": "stale-action-state"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "STATE_VERSION_CONFLICT"
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_execute_action_rolls_back_when_resources_are_insufficient(
    client,
    session_factory,
):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    a_approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]

    with session_factory() as session:
        current = session.scalar(
            select(OrganizationStateRecord)
            .where(OrganizationStateRecord.organization_id == "pulseboard")
            .order_by(OrganizationStateRecord.state_version.desc())
            .limit(1)
        )
        current.budget_usd = 100
        session.commit()

    response = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "A",
            "approval_id": a_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "insufficient-budget-action"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INSUFFICIENT_RESOURCES"
    assert client.get("/api/v1/state").json()["state_version"] == 1
    assert client.get("/api/v1/experiments/A").json()["status"] == "PROPOSED"


def test_execute_action_rejects_invalid_experiment_transition(
    client,
    session_factory,
):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    a_approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]
    with session_factory() as session:
        experiment = session.get(ExperimentRecord, "A")
        experiment.status = "RUNNING"
        session.commit()

    response = client.post(
        "/api/v1/actions/execute",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "A",
            "approval_id": a_approval["id"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "invalid-transition-action"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INVALID_EXPERIMENT_TRANSITION"
    assert client.get("/api/v1/state").json()["state_version"] == 1


def test_execute_action_is_atomic_idempotent_and_invalidates_old_approvals(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    a_approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]
    b_approval = _create_b_approval(client, decision_id)
    request = {
        "decision_id": decision_id,
        "strategy_id": "STRATEGY-A-B",
        "experiment_id": "A",
        "approval_id": a_approval["id"],
        "expected_state_version": 1,
    }
    headers = {"Idempotency-Key": "execute-a"}

    first = client.post("/api/v1/actions/execute", json=request, headers=headers)
    replay = client.post("/api/v1/actions/execute", json=request, headers=headers)

    assert first.status_code == 201
    assert replay.status_code == 201
    assert first.json() == replay.json()
    receipt = first.json()
    assert set(receipt) == {
        "id",
        "decision_id",
        "strategy_id",
        "experiment_id",
        "previous_status",
        "new_status",
        "budget_reserved_usd",
        "engineering_reserved_hours",
        "status",
        "state_version",
        "executed_at",
        "idempotency_key",
    }
    assert receipt["previous_status"] == "PROPOSED"
    assert receipt["new_status"] == "RUNNING"
    assert receipt["status"] == "SUCCESS"
    assert receipt["state_version"] == 2
    executed_at = datetime.fromisoformat(receipt["executed_at"].replace("Z", "+00:00"))
    assert executed_at.tzinfo is not None
    assert executed_at.utcoffset() == UTC.utcoffset(executed_at)
    assert "approval_id" not in receipt

    state = client.get("/api/v1/state").json()
    assert state["state_version"] == 2
    assert state["budget_usd"] == 3400
    assert state["reserved_engineering_hours"] == 42
    assert state["available_engineering_hours"] == 18
    assert state["eligible_traffic"] == 6000
    assert client.get("/api/v1/experiments/A").json()["status"] == "RUNNING"

    receipt_lookup = client.get(f"/api/v1/action-receipts/{receipt['id']}")
    receipt_list = client.get(
        "/api/v1/action-receipts", params={"experiment_id": "A"}
    )
    invalidated = client.get(f"/api/v1/approvals/{b_approval['id']}")
    assert receipt_lookup.json() == receipt
    assert receipt_list.json()["items"] == [receipt]
    assert invalidated.json()["decision"] == "INVALIDATED"

    stale = client.post(
        f"/api/v1/approvals/{b_approval['id']}/decision",
        json={
            "decision": "APPROVED",
            "reason": "This approval is now stale.",
            "actor_id": "founder-001",
            "expected_state_version": 2,
        },
        headers={"Idempotency-Key": "stale-b"},
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "APPROVAL_INVALIDATED"


def test_execute_action_rejects_reused_idempotency_key_with_different_body(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]
    a_approval = client.get(
        "/api/v1/approvals", params={"experiment_id": "A"}
    ).json()["items"][0]
    first_body = {
        "decision_id": decision_id,
        "strategy_id": "STRATEGY-A-B",
        "experiment_id": "A",
        "approval_id": a_approval["id"],
        "expected_state_version": 1,
    }
    second_body = dict(first_body)
    second_body["experiment_id"] = "B"
    headers = {"Idempotency-Key": "execute-action-reused-key"}

    first = client.post("/api/v1/actions/execute", json=first_body, headers=headers)
    second = client.post("/api/v1/actions/execute", json=second_body, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_internal_approval_creation_requires_service_key(client):
    result = _create_recommendation(client)
    response = client.post(
        "/api/v1/approvals",
        json={
            "decision_id": result["run"]["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_ids": ["B"],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "missing-internal-key"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INTERNAL_AUTH_FAILED"
