from datetime import UTC, datetime, timedelta

from app.models import DecisionRun as DecisionRunRecord
from tests.test_orchestration import create_decision, recommendation_payload

SERVICE_HEADERS = {"X-Internal-Service-Key": "local-development-only"}


def claim(client):
    return client.post("/api/v1/internal/decision-runs/claim", headers=SERVICE_HEADERS)


def test_claim_requires_service_credential(client):
    create_decision(client)

    response = client.post("/api/v1/internal/decision-runs/claim")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INTERNAL_AUTH_FAILED"


def test_claim_returns_empty_when_nothing_is_queued(client):
    response = claim(client)

    assert response.status_code == 200
    assert response.json() == {"run": None, "goal_id": None}


def test_claim_marks_oldest_queued_run_running_once(client):
    run = create_decision(client).json()

    first = claim(client)
    second = claim(client)
    polled = client.get(f"/api/v1/decision-runs/{run['id']}")

    assert first.status_code == 200
    assert first.json()["goal_id"] == "GOAL-001"
    assert first.json()["run"]["id"] == run["id"]
    assert first.json()["run"]["status"] == "RUNNING"
    assert second.json() == {"run": None, "goal_id": None}
    assert polled.json()["status"] == "RUNNING"
    assert client.get("/api/v1/overview").json()["governor_status"]["state"] == "RUNNING"


def test_recommendation_completes_a_claimed_run(client):
    run = create_decision(client).json()
    claim(client)

    persisted = client.post(
        "/api/v1/recommendations",
        json=recommendation_payload(run),
        headers={**SERVICE_HEADERS, "Idempotency-Key": "claimed-recommendation"},
    )
    polled = client.get(f"/api/v1/decision-runs/{run['id']}").json()

    assert persisted.status_code == 201, persisted.text
    assert polled["status"] == "SUCCEEDED"
    assert polled["result"] == "NEW_RECOMMENDATION"


def test_fail_records_error_and_releases_the_goal(client):
    run = create_decision(client).json()
    claim(client)

    failed = client.post(
        f"/api/v1/internal/decision-runs/{run['id']}/fail",
        json={"code": "AGENT_ERROR", "message": "All LLM providers failed."},
        headers=SERVICE_HEADERS,
    )
    retry = create_decision(client, key="decision-after-failure")

    assert failed.status_code == 200, failed.text
    assert failed.json()["status"] == "FAILED"
    assert failed.json()["error"] == {
        "code": "AGENT_ERROR",
        "message": "All LLM providers failed.",
    }
    assert failed.json()["completed_at"] is not None
    assert retry.status_code == 202


def test_fail_rejects_finished_and_unknown_runs(client):
    run = create_decision(client).json()
    body = {"code": "AGENT_ERROR", "message": "boom"}
    client.post(
        f"/api/v1/internal/decision-runs/{run['id']}/fail",
        json=body,
        headers=SERVICE_HEADERS,
    )

    again = client.post(
        f"/api/v1/internal/decision-runs/{run['id']}/fail",
        json=body,
        headers=SERVICE_HEADERS,
    )
    unknown = client.post(
        "/api/v1/internal/decision-runs/RUN-MISSING/fail",
        json=body,
        headers=SERVICE_HEADERS,
    )

    assert again.status_code == 409
    assert again.json()["error"]["code"] == "RUN_NOT_ACTIVE"
    assert unknown.status_code == 404


def test_claim_times_out_stale_running_runs(client, session_factory):
    run = create_decision(client).json()
    claim(client)
    with session_factory() as session:
        record = session.get(DecisionRunRecord, run["id"])
        record.created_at = datetime.now(UTC) - timedelta(minutes=30)
        session.commit()

    claim(client)
    polled = client.get(f"/api/v1/decision-runs/{run['id']}").json()

    assert polled["status"] == "FAILED"
    assert polled["error"]["code"] == "RUN_TIMEOUT"
