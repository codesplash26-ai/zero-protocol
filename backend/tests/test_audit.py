from __future__ import annotations

from datetime import timedelta

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from app.models import AuditRecord as AuditRecordModel
from app.schemas import AuditRecord, SolverStatus

CONTRACT_FIELDS = {
    "id",
    "decision_id",
    "goal_id",
    "state_version",
    "tool_calls",
    "candidate_strategy_ids",
    "optimization_status",
    "recommended_strategy_id",
    "approval_id",
    "action_receipt_id",
    "event_ids",
    "created_at",
}


def _create_decision(client) -> dict:
    response = client.post(
        "/api/v1/decisions",
        json={"goal_id": "GOAL-001", "expected_state_version": 1},
        headers={"Idempotency-Key": "audit-decision"},
    )
    assert response.status_code == 202
    return response.json()


def _audit_payload(**overrides) -> dict:
    return {
        "id": "AUD-001",
        "decision_id": "DEC-001",
        "goal_id": "GOAL-001",
        "state_version": 1,
        "tool_calls": [],
        "candidate_strategy_ids": [],
        "optimization_status": None,
        "recommended_strategy_id": None,
        "approval_id": None,
        "action_receipt_id": None,
        "event_ids": [],
        "created_at": "2026-09-25T08:00:00Z",
        **overrides,
    }


def test_decision_trace_contains_only_contract_fields_and_is_ordered(client):
    run = _create_decision(client)
    optimization = client.post(
        "/api/v1/optimization-results",
        json={
            "decision_id": run["decision_id"],
            "result": {
                "status": "FEASIBLE",
                "selected_experiment_ids": [],
                "feasible_combinations": [[], ["A"]],
                "objective_value": None,
                "solver_run_id": "SOLVER-AUDIT",
                "evaluated_state_version": 1,
            },
        },
        headers={
            "X-Internal-Service-Key": "local-development-only",
            "Idempotency-Key": "audit-optimization",
        },
    )
    assert optimization.status_code == 201

    response = client.get(f"/api/v1/audit/{run['decision_id']}")

    assert response.status_code == 200
    records = response.json()["items"]
    assert records
    assert all(set(record) == CONTRACT_FIELDS for record in records)
    assert all(record["decision_id"] == run["decision_id"] for record in records)
    assert all(record["goal_id"] == "GOAL-001" for record in records)
    assert [record["created_at"] for record in records] == sorted(
        record["created_at"] for record in records
    )
    assert any(record["optimization_status"] == "FEASIBLE" for record in records)
    assert all(record["created_at"].endswith("Z") for record in records)


@pytest.mark.parametrize("missing_field", ["decision_id", "goal_id"])
def test_audit_record_requires_decision_and_goal_ids(missing_field):
    payload = _audit_payload()
    del payload[missing_field]

    with pytest.raises(ValidationError):
        AuditRecord.model_validate(payload)


@pytest.mark.parametrize("status", list(SolverStatus))
def test_audit_record_accepts_solver_status_values(status):
    record = AuditRecord.model_validate(
        _audit_payload(optimization_status=status.value)
    )

    assert record.optimization_status is status


def test_audit_record_rejects_invalid_optimization_status():
    with pytest.raises(ValidationError):
        AuditRecord.model_validate(
            _audit_payload(optimization_status="COMPLETE")
        )


@pytest.mark.parametrize("field", ["title", "summary"])
def test_audit_record_rejects_presentation_fields(field):
    with pytest.raises(ValidationError):
        AuditRecord.model_validate(_audit_payload(**{field: "Internal only"}))


def test_audit_record_requires_utc_created_at():
    record = AuditRecord.model_validate(_audit_payload())
    assert record.created_at.utcoffset() == timedelta(0)

    with pytest.raises(ValidationError):
        AuditRecord.model_validate(
            _audit_payload(created_at="2026-09-25T13:30:00+05:30")
        )


def test_internal_activity_fields_and_history_retrieval_remain_available(
    client,
    session_factory,
):
    run = _create_decision(client)

    history = client.get(
        "/api/v1/audit",
        params={"decision_id": run["decision_id"]},
    )
    assert history.status_code == 200
    assert history.json()["items"][0]["title"] == "Decision run queued"
    assert history.json()["items"][0]["summary"]

    with session_factory() as session:
        internal = session.scalar(
            select(AuditRecordModel).where(
                AuditRecordModel.decision_id == run["decision_id"]
            )
        )
        assert internal is not None
        assert internal.title == "Decision run queued"
        assert internal.summary
