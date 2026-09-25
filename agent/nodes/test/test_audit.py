from __future__ import annotations

from datetime import timedelta

import pytest
from pydantic import ValidationError

from nodes.retrieve_audit import retrieve_audit_node
from schemas.models import AuditRecord, SolverStatus

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


def _audit_payload(**overrides) -> dict:
    return {
        "id": "AUD-001",
        "decision_id": "DEC-001",
        "goal_id": "GOAL-001",
        "state_version": 4,
        "tool_calls": ["calculate_materiality"],
        "candidate_strategy_ids": ["STRATEGY-B"],
        "optimization_status": "FEASIBLE",
        "recommended_strategy_id": "STRATEGY-B",
        "approval_id": "APR-001",
        "action_receipt_id": None,
        "event_ids": ["EVENT-001"],
        "created_at": "2026-09-25T08:00:00Z",
        **overrides,
    }


def test_agent_audit_record_exact_contract_and_required_ids():
    record = AuditRecord.model_validate(_audit_payload())

    assert set(record.model_dump()) == CONTRACT_FIELDS
    assert record.decision_id == "DEC-001"
    assert record.goal_id == "GOAL-001"
    assert record.optimization_status is SolverStatus.FEASIBLE

    for field in ("decision_id", "goal_id"):
        payload = _audit_payload()
        del payload[field]
        with pytest.raises(ValidationError):
            AuditRecord.model_validate(payload)


def test_agent_audit_record_requires_utc_created_at():
    record = AuditRecord.model_validate(_audit_payload())
    assert record.created_at.utcoffset() == timedelta(0)

    with pytest.raises(ValidationError):
        AuditRecord.model_validate(
            _audit_payload(created_at="2026-09-25T13:30:00+05:30")
        )


def test_agent_audit_record_rejects_invalid_solver_status():
    with pytest.raises(ValidationError):
        AuditRecord.model_validate(
            _audit_payload(optimization_status="COMPLETE")
        )


@pytest.mark.parametrize("field", ["title", "summary"])
def test_agent_audit_record_rejects_extra_fields(field):
    with pytest.raises(ValidationError):
        AuditRecord.model_validate(
            _audit_payload(**{field: "Not in Contract v1"})
        )


def test_retrieve_audit_node_reads_backend_without_persisting(monkeypatch):
    record = AuditRecord.model_validate(_audit_payload())

    class ReadOnlyAuditClient:
        def __init__(self):
            self.requested_decision_id = None

        def get_audit(self, decision_id):
            self.requested_decision_id = decision_id
            return [record]

    client = ReadOnlyAuditClient()
    monkeypatch.setattr(
        "nodes.retrieve_audit.get_backend_client",
        lambda: client,
    )

    result = retrieve_audit_node({"decision_id": "DEC-001"})

    assert client.requested_decision_id == "DEC-001"
    assert result == {
        "audit_trace": [record.model_dump(mode="json")]
    }
