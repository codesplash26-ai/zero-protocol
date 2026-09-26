from app.config import Settings, get_settings
from tests.test_orchestration import create_decision

SERVICE_HEADERS = {"X-Internal-Service-Key": "local-development-only"}


def enable_demo_mode(client) -> None:
    client.app.dependency_overrides[get_settings] = lambda: Settings(demo_mode=True)


def test_reset_is_refused_when_demo_mode_is_off(client):
    response = client.post("/api/v1/demo/reset")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "DEMO_MODE_DISABLED"


def test_reset_restores_the_seeded_starting_point(client):
    enable_demo_mode(client)
    run = create_decision(client).json()
    client.post(
        "/api/v1/recommendations",
        json={
            "decision_id": run["decision_id"],
            "recommended_strategy_id": "STRATEGY-A",
            "now": ["A"],
            "next": [],
            "later": [],
            "defer": ["B", "C"],
            "reasoning_summary": "A first.",
            "requires_approval": False,
            "state_version": 1,
        },
        headers={**SERVICE_HEADERS, "Idempotency-Key": "reset-rec"},
    )
    client.post(
        "/api/v1/experiments",
        json={
            "name": "Smoke test",
            "cost_usd": 100,
            "engineering_hours": 1,
            "traffic_required": 100,
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "reset-exp"},
    )
    assert client.get("/api/v1/state").json()["state_version"] == 2

    reset = client.post("/api/v1/demo/reset")

    assert reset.status_code == 200, reset.text
    assert reset.json() == {"status": "reset", "state_version": 1}
    overview = client.get("/api/v1/overview").json()
    assert overview["organization_state"]["state_version"] == 1
    assert overview["organization_state"]["available_engineering_hours"] == 24
    assert [item["id"] for item in overview["experiments"]] == ["A", "B", "C"]
    assert overview["latest_recommendation"] is None
    assert overview["governor_status"]["state"] == "MONITORING"
    assert client.get("/api/v1/approvals").json()["items"] == []
    assert client.get("/api/v1/decision-runs/" + run["id"]).status_code == 404
    # Idempotency records were cleared too: the same key creates a fresh decision.
    again = create_decision(client)
    assert again.status_code == 202
    assert again.json()["decision_id"] != run["decision_id"]
