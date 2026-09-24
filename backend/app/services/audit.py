from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AuditRecord
from app.services.identifiers import new_id


def append_audit(
    session: Session,
    *,
    organization_id: str,
    state_version: int,
    title: str,
    summary: str,
    decision_id: str | None = None,
    goal_id: str | None = None,
    tool_calls: list[str] | None = None,
    candidate_strategy_ids: list[str] | None = None,
    optimization_status: str | None = None,
    recommended_strategy_id: str | None = None,
    approval_id: str | None = None,
    action_receipt_id: str | None = None,
    event_ids: list[str] | None = None,
) -> AuditRecord:
    record = AuditRecord(
        id=new_id("AUD"),
        organization_id=organization_id,
        decision_id=decision_id,
        goal_id=goal_id,
        state_version=state_version,
        tool_calls=tool_calls or [],
        candidate_strategy_ids=candidate_strategy_ids or [],
        optimization_status=optimization_status,
        recommended_strategy_id=recommended_strategy_id,
        approval_id=approval_id,
        action_receipt_id=action_receipt_id,
        event_ids=event_ids or [],
        title=title,
        summary=summary,
    )
    session.add(record)
    return record

