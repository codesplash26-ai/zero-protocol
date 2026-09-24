def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.1.0"}
    assert response.headers["X-Request-ID"].startswith("REQ-")


def test_readiness_checks_database(client):
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "available"}


def test_openapi_exposes_phase_two_endpoints(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/state" in paths
    assert "/api/v1/overview" in paths
    assert "/api/v1/experiments" in paths
    assert "/api/v1/feasibility/check" in paths
    assert "/api/v1/consequences/calculate" in paths


def test_openapi_exposes_frozen_contract_surface(client):
    paths = client.get("/openapi.json").json()["paths"]
    required = {
        "/api/v1/overview",
        "/api/v1/state",
        "/api/v1/experiments",
        "/api/v1/experiments/{experiment_id}",
        "/api/v1/commitments",
        "/api/v1/goals/{goal_id}",
        "/api/v1/goals",
        "/api/v1/evidence",
        "/api/v1/decisions",
        "/api/v1/decision-runs/{run_id}",
        "/api/v1/decisions/{decision_id}/workspace",
        "/api/v1/decisions/{decision_id}/replans",
        "/api/v1/feasibility/check",
        "/api/v1/consequences/calculate",
        "/api/v1/optimization-results",
        "/api/v1/experiment-imports",
        "/api/v1/experiment-imports/{import_id}",
        "/api/v1/experiment-imports/{import_id}/confirm",
        "/api/v1/approvals",
        "/api/v1/approvals/{approval_id}",
        "/api/v1/approvals/check",
        "/api/v1/approvals/{approval_id}/decision",
        "/api/v1/actions/execute",
        "/api/v1/events",
        "/api/v1/events/{event_id}",
        "/api/v1/events/{event_id}/materiality",
        "/api/v1/recommendations/{decision_id}",
        "/api/v1/action-receipts",
        "/api/v1/action-receipts/{receipt_id}",
        "/api/v1/audit",
        "/api/v1/audit/{decision_id}",
    }

    assert required <= set(paths)

