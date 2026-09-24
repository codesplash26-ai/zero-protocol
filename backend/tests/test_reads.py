def test_read_initial_state(client):
    response = client.get("/api/v1/state")

    assert response.status_code == 200
    assert response.json() == {
        "organization_id": "pulseboard",
        "organization_name": "PulseBoard",
        "budget_usd": 4000,
        "engineering_capacity_hours": 60,
        "reserved_engineering_hours": 36,
        "available_engineering_hours": 24,
        "eligible_traffic": 10000,
        "approval_threshold_usd": 2000,
        "state_version": 1,
    }


def test_overview_hydrates_bootstrap_projection(client):
    response = client.get("/api/v1/overview")

    assert response.status_code == 200
    body = response.json()
    assert body["organization_state"]["state_version"] == 1
    assert body["active_goal"]["id"] == "GOAL-001"
    assert body["governor_status"]["state"] == "MONITORING"
    assert [item["id"] for item in body["experiments"]] == ["A", "B", "C"]
    assert [item["id"] for item in body["commitments"]] == ["enterprise_sso"]
    assert body["latest_recommendation"] is None
    assert body["pending_approval_count"] == 0


def test_experiments_are_canonical_and_sorted(client):
    response = client.get("/api/v1/experiments")

    assert response.status_code == 200
    body = response.json()
    assert body["next_cursor"] is None
    assert [item["id"] for item in body["items"]] == ["A", "B", "C"]
    assert body["items"][1]["dependencies"] == ["A"]
    assert all(item["outcome"] == "PENDING" for item in body["items"])
    assert all(item["cost_usd"] is not None for item in body["items"])


def test_experiment_filters_and_cursor_pagination(client):
    first = client.get("/api/v1/experiments", params={"limit": 2})
    second = client.get(
        "/api/v1/experiments", params={"limit": 2, "cursor": "B"}
    )
    filtered = client.get(
        "/api/v1/experiments", params={"status": "PROPOSED", "outcome": "PENDING"}
    )

    assert [item["id"] for item in first.json()["items"]] == ["A", "B"]
    assert first.json()["next_cursor"] == "B"
    assert [item["id"] for item in second.json()["items"]] == ["C"]
    assert second.json()["next_cursor"] is None
    assert len(filtered.json()["items"]) == 3


def test_read_experiment_and_not_found_error(client):
    response = client.get("/api/v1/experiments/B")
    missing = client.get("/api/v1/experiments/UNKNOWN")

    assert response.status_code == 200
    assert response.json()["dependencies"] == ["A"]
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "EXPERIMENT_NOT_FOUND"
    assert missing.json()["error"]["request_id"].startswith("REQ-")


def test_read_goal_commitment_and_evidence(client):
    goal = client.get("/api/v1/goals/GOAL-001")
    commitments = client.get("/api/v1/commitments")
    evidence = client.get("/api/v1/evidence", params={"experiment_id": "A"})

    assert goal.status_code == 200
    assert goal.json()["protected_commitments"] == ["enterprise_sso"]
    assert commitments.json()["items"][0]["priority"] == "CRITICAL"
    assert commitments.json()["items"][0]["reserved_engineering_hours"] == 36
    assert [item["id"] for item in evidence.json()["items"]] == ["EVIDENCE-002"]


def test_invalid_collection_cursor_uses_standard_error(client):
    response = client.get("/api/v1/experiments", params={"cursor": "UNKNOWN"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_CURSOR"

