def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.1.0"}
    assert response.headers["X-Request-ID"].startswith("REQ-")


def test_openapi_exposes_phase_two_endpoints(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/state" in paths
    assert "/api/v1/overview" in paths
    assert "/api/v1/experiments" in paths
    assert "/api/v1/feasibility/check" in paths
    assert "/api/v1/consequences/calculate" in paths

