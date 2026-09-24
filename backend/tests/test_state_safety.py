from sqlalchemy import func, select

from app.models import AuditRecord, EvidenceItem, Goal, IdempotencyRecord, OrganizationState


def goal_payload(expected_state_version: int = 1) -> dict:
    return {
        "text": "Choose the next retention strategy.",
        "horizon_weeks": 6,
        "protected_commitments": ["enterprise_sso"],
        "expected_state_version": expected_state_version,
    }


def test_goal_creation_increments_state_once_and_writes_audit(client, session_factory):
    response = client.post(
        "/api/v1/goals",
        json=goal_payload(),
        headers={"Idempotency-Key": "create-retention-goal"},
    )

    assert response.status_code == 201
    assert response.json()["id"].startswith("GOAL-")
    assert client.get("/api/v1/state").json()["state_version"] == 2

    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(OrganizationState)) == 2
        audit = session.scalar(
            select(AuditRecord).where(AuditRecord.title == "Goal created")
        )
        assert audit is not None
        assert audit.state_version == 2


def test_goal_creation_replays_same_idempotent_response(client, session_factory):
    headers = {"Idempotency-Key": "repeat-goal"}
    first = client.post("/api/v1/goals", json=goal_payload(), headers=headers)
    second = client.post("/api/v1/goals", json=goal_payload(), headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json() == second.json()
    assert client.get("/api/v1/state").json()["state_version"] == 2
    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Goal)) == 2
        assert session.scalar(select(func.count()).select_from(IdempotencyRecord)) == 1


def test_reusing_idempotency_key_with_different_request_is_rejected(client):
    headers = {"Idempotency-Key": "conflicting-goal"}
    first = client.post("/api/v1/goals", json=goal_payload(), headers=headers)
    changed = goal_payload()
    changed["text"] = "A different goal"
    second = client.post("/api/v1/goals", json=changed, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_stale_goal_write_is_rejected_without_mutation(client, session_factory):
    first = client.post(
        "/api/v1/goals",
        json=goal_payload(),
        headers={"Idempotency-Key": "first-goal"},
    )
    stale = client.post(
        "/api/v1/goals",
        json=goal_payload(),
        headers={"Idempotency-Key": "stale-goal"},
    )

    assert first.status_code == 201
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "STATE_VERSION_CONFLICT"
    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(OrganizationState)) == 2


def test_evidence_is_idempotent_and_does_not_increment_state(client, session_factory):
    payload = {
        "goal_id": "GOAL-001",
        "experiment_id": "A",
        "source": "founder_interview",
        "content": "Customers value predictable annual billing.",
        "quality": "HIGH",
        "relevance": "Supports annual-plan validation.",
    }
    headers = {"Idempotency-Key": "evidence-annual-billing"}
    first = client.post("/api/v1/evidence", json=payload, headers=headers)
    second = client.post("/api/v1/evidence", json=payload, headers=headers)

    assert first.status_code == 201
    assert first.json() == second.json()
    assert client.get("/api/v1/state").json()["state_version"] == 1
    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(EvidenceItem)) == 4


def test_persistent_write_requires_idempotency_key(client):
    response = client.post("/api/v1/goals", json=goal_payload())

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

