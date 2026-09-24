from __future__ import annotations

from app.services.agent_gateway import get_agent_gateway


class RecordingGateway:
    def __init__(self) -> None:
        self.import_ids: list[str] = []

    def dispatch_initial(self, run_id: str) -> None:
        return None

    def dispatch_replan(self, run_id: str) -> None:
        return None

    def dispatch_import(self, import_id: str) -> None:
        self.import_ids.append(import_id)


def _create_import(client, key: str = "intake-create") -> dict:
    response = client.post(
        "/api/v1/experiment-imports",
        json={
            "source_type": "TEXT",
            "text": "Test a shorter enterprise onboarding flow with 5,000 sessions.",
            "source_name": "Pasted Founder Notes",
        },
        headers={"Idempotency-Key": key},
    )
    assert response.status_code == 202
    return response.json()


def _persist_draft(client, import_id: str, key: str = "intake-draft") -> dict:
    response = client.post(
        f"/api/v1/experiment-imports/{import_id}/interpretation",
        json={
            "draft": {
                "name": "Enterprise Self Serve Onboarding Flow",
                "short_description": "A shorter onboarding experience.",
                "objective": "Improve enterprise activation.",
                "hypothesis": "A shorter flow increases completed onboarding.",
                "cost_usd": None,
                "engineering_hours": 8,
                "traffic_required": 5000,
                "duration": "Two weeks",
                "success_threshold": "10% activation improvement",
                "dependencies": [],
                "decision_role": "Validate enterprise onboarding",
                "field_provenance": [
                    {
                        "field": "hypothesis",
                        "source": "Pasted Founder Notes",
                        "quality": "HIGH",
                        "excerpt": "shorter enterprise onboarding flow",
                    }
                ],
                "missing_fields": ["cost_usd"],
                "confidence": 0.86,
            },
            "error": None,
        },
        headers={
            "X-Internal-Service-Key": "local-development-only",
            "Idempotency-Key": key,
        },
    )
    assert response.status_code == 200
    return response.json()


def test_manual_experiment_creation_is_canonical_atomic_and_idempotent(client):
    request = {
        "name": "Onboarding Copy Test",
        "cost_usd": 500,
        "engineering_hours": 8,
        "traffic_required": 2000,
        "dependencies": ["A"],
        "decision_role": "Validate activation improvement",
        "evidence_items": [
            {
                "source": "Founder brief",
                "content": "A clearer onboarding message may improve activation.",
                "quality": "MEDIUM",
            }
        ],
        "expected_state_version": 1,
    }
    headers = {"Idempotency-Key": "manual-experiment"}
    first = client.post("/api/v1/experiments", json=request, headers=headers)
    replay = client.post("/api/v1/experiments", json=request, headers=headers)

    assert first.status_code == 201
    assert first.json() == replay.json()
    experiment = first.json()
    assert experiment["id"].startswith("EXP-")
    assert experiment["dependencies"] == ["A"]
    assert experiment["status"] == "PROPOSED"
    assert experiment["outcome"] == "PENDING"
    assert client.get("/api/v1/state").json()["state_version"] == 2
    evidence = client.get(
        "/api/v1/evidence", params={"experiment_id": experiment["id"]}
    ).json()["items"]
    assert len(evidence) == 1
    assert evidence[0]["source"] == "Founder brief"


def test_import_draft_stays_noncanonical_until_human_confirmation(client):
    gateway = RecordingGateway()
    client.app.dependency_overrides[get_agent_gateway] = lambda: gateway
    queued = _create_import(client)
    replay = _create_import(client)

    assert queued == replay
    assert queued["status"] == "QUEUED"
    assert queued["draft"] is None
    assert gateway.import_ids == [queued["id"]]
    assert client.get("/api/v1/state").json()["state_version"] == 1
    denied_source = client.get(
        f"/api/v1/experiment-imports/{queued['id']}/source"
    )
    source = client.get(
        f"/api/v1/experiment-imports/{queued['id']}/source",
        headers={"X-Internal-Service-Key": "local-development-only"},
    )
    assert denied_source.status_code == 401
    assert source.status_code == 200
    assert source.json()["text"].startswith("Test a shorter")
    assert source.json()["content_base64"] is None

    interpreted = _persist_draft(client, queued["id"])
    assert interpreted["status"] == "SUCCEEDED"
    assert interpreted["draft"]["cost_usd"] is None
    assert interpreted["draft"]["missing_fields"] == ["cost_usd"]
    assert client.get("/api/v1/state").json()["state_version"] == 1

    incomplete = client.post(
        f"/api/v1/experiment-imports/{queued['id']}/confirm",
        json={
            "experiment": {
                "name": "Enterprise Self Serve Onboarding Flow",
                "cost_usd": None,
                "engineering_hours": 8,
                "traffic_required": 5000,
                "dependencies": [],
                "decision_role": "Validate enterprise onboarding",
            },
            "evidence_items": [],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "confirm-incomplete"},
    )
    assert incomplete.status_code == 422
    assert incomplete.json()["error"]["code"] == "MISSING_CANONICAL_FIELD"
    assert client.get("/api/v1/state").json()["state_version"] == 1

    confirmation = {
        "experiment": {
            "name": "Enterprise Self Serve Onboarding Flow",
            "cost_usd": 0,
            "engineering_hours": 8,
            "traffic_required": 5000,
            "dependencies": [],
            "decision_role": "Validate enterprise onboarding",
        },
        "evidence_items": [],
        "expected_state_version": 1,
    }
    confirmed = client.post(
        f"/api/v1/experiment-imports/{queued['id']}/confirm",
        json=confirmation,
        headers={"Idempotency-Key": "confirm-complete"},
    )
    confirmed_replay = client.post(
        f"/api/v1/experiment-imports/{queued['id']}/confirm",
        json=confirmation,
        headers={"Idempotency-Key": "confirm-complete"},
    )

    assert confirmed.status_code == 201
    assert confirmed.json() == confirmed_replay.json()
    experiment = confirmed.json()
    assert experiment["cost_usd"] == 0
    assert experiment["engineering_hours"] == 8
    assert client.get("/api/v1/state").json()["state_version"] == 2
    job = client.get(f"/api/v1/experiment-imports/{queued['id']}").json()
    assert job["status"] == "CONFIRMED"
    evidence = client.get(
        "/api/v1/evidence", params={"experiment_id": experiment["id"]}
    ).json()["items"]
    assert len(evidence) == 1
    assert "Hypothesis:" in evidence[0]["content"]
    assert evidence[0]["trust_level"] == "AI_INTERPRETED_HUMAN_CONFIRMED"


def test_txt_multipart_import_and_file_type_validation(client):
    txt = client.post(
        "/api/v1/experiment-imports",
        files={"file": ("plan.txt", b"Hypothesis: faster onboarding", "text/plain")},
        data={"source_name": "Onboarding plan"},
        headers={"Idempotency-Key": "txt-upload"},
    )
    unsupported = client.post(
        "/api/v1/experiment-imports",
        files={"file": ("plan.csv", b"name,cost", "text/csv")},
        headers={"Idempotency-Key": "csv-upload"},
    )
    pdf = client.post(
        "/api/v1/experiment-imports",
        files={"file": ("plan.pdf", b"%PDF-1.7\nfixture", "application/pdf")},
        headers={"Idempotency-Key": "pdf-upload"},
    )
    docx = client.post(
        "/api/v1/experiment-imports",
        files={
            "file": (
                "plan.docx",
                b"PK\x03\x04fixture",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers={"Idempotency-Key": "docx-upload"},
    )

    assert txt.status_code == 202
    assert txt.json()["source_name"] == "Onboarding plan"
    assert pdf.status_code == 202
    assert docx.status_code == 202
    assert unsupported.status_code == 400
    assert unsupported.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_confirm_with_unknown_dependency_rolls_back_job_and_state(client):
    queued = _create_import(client, "invalid-dependency-import")
    _persist_draft(client, queued["id"], "invalid-dependency-draft")

    response = client.post(
        f"/api/v1/experiment-imports/{queued['id']}/confirm",
        json={
            "experiment": {
                "name": "Dependent experiment",
                "cost_usd": 200,
                "engineering_hours": 2,
                "traffic_required": 100,
                "dependencies": ["UNKNOWN"],
                "decision_role": "Test transaction rollback",
            },
            "evidence_items": [],
            "expected_state_version": 1,
        },
        headers={"Idempotency-Key": "invalid-dependency-confirm"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_DEPENDENCY"
    assert client.get("/api/v1/state").json()["state_version"] == 1
    assert client.get(f"/api/v1/experiment-imports/{queued['id']}").json()[
        "status"
    ] == "SUCCEEDED"
