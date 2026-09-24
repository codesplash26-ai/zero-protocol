from __future__ import annotations

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
                "current_executable_experiment_id": "A",
                "now": ["Run Experiment A"],
                "next": ["Evaluate Experiment A"],
                "later": ["Run Experiment B after A succeeds"],
                "defer": [],
                "reasoning_summary": "A is the evidence gate for B.",
                # Deliberately wrong: backend policy must override the agent flag.
                "requires_approval": True,
                "state_version": 1,
            },
            "tool_calls": ["check_feasibility", "check_approval"],
        },
        headers=INTERNAL_HEADERS,
    )
    assert response.status_code == 201
    return {"run": run, "recommendation": response.json()}


def _create_b_approval(client, decision_id: str) -> dict:
    response = client.post(
        "/api/v1/approvals",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "action_type": "START_EXPERIMENT",
            "expected_state_version": 1,
            "requested_by": "governor",
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


def test_high_cost_action_requires_human_decision_without_state_change(client):
    result = _create_recommendation(client)
    decision_id = result["run"]["decision_id"]

    policy = client.post(
        "/api/v1/approvals/check",
        json={
            "decision_id": decision_id,
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "action_type": "START_EXPERIMENT",
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
    assert policy.json()["approval_required"] is True
    assert policy.json()["decision"] == "PENDING"
    assert approval["decision"] == "PENDING"
    assert decided.status_code == 200
    assert decided.json()["decision"] == "APPROVED"
    assert client.get("/api/v1/state").json()["state_version"] == 1


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
            "action_type": "START_EXPERIMENT",
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
            "action_type": "START_EXPERIMENT",
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
        "action_type": "START_EXPERIMENT",
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
    assert receipt["previous_status"] == "PROPOSED"
    assert receipt["new_status"] == "RUNNING"
    assert receipt["status"] == "SUCCESS"
    assert receipt["state_version"] == 2

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


def test_internal_approval_creation_requires_service_key(client):
    result = _create_recommendation(client)
    response = client.post(
        "/api/v1/approvals",
        json={
            "decision_id": result["run"]["decision_id"],
            "strategy_id": "STRATEGY-A-B",
            "experiment_id": "B",
            "action_type": "START_EXPERIMENT",
            "expected_state_version": 1,
            "requested_by": "governor",
        },
        headers={"Idempotency-Key": "missing-internal-key"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INTERNAL_AUTH_FAILED"
