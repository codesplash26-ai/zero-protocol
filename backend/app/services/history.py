from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import AuditRecord as AuditRecordModel
from app.models import Decision, DecisionRun
from app.schemas import AuditActivity, AuditRecord


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def audit_to_activity(record: AuditRecordModel) -> AuditActivity:
    return AuditActivity(
        id=record.id,
        decision_id=record.decision_id,
        goal_id=record.goal_id,
        state_version=record.state_version,
        tool_calls=record.tool_calls,
        candidate_strategy_ids=record.candidate_strategy_ids,
        optimization_status=record.optimization_status,
        recommended_strategy_id=record.recommended_strategy_id,
        approval_id=record.approval_id,
        action_receipt_id=record.action_receipt_id,
        event_ids=record.event_ids,
        title=record.title,
        summary=record.summary,
        created_at=_as_utc(record.created_at),
    )


def audit_to_schema(
    record: AuditRecordModel,
    *,
    decision_id: str,
    goal_id: str,
) -> AuditRecord:
    if record.decision_id not in {None, decision_id}:
        raise ValueError("Audit record belongs to a different decision")
    if record.goal_id not in {None, goal_id}:
        raise ValueError("Audit record belongs to a different goal")
    return AuditRecord(
        id=record.id,
        decision_id=decision_id,
        goal_id=goal_id,
        state_version=record.state_version,
        tool_calls=record.tool_calls,
        candidate_strategy_ids=record.candidate_strategy_ids,
        optimization_status=record.optimization_status,
        recommended_strategy_id=record.recommended_strategy_id,
        approval_id=record.approval_id,
        action_receipt_id=record.action_receipt_id,
        event_ids=record.event_ids,
        created_at=_as_utc(record.created_at),
    )


def list_audit_records(
    session: Session,
    *,
    organization_id: str,
    decision_id: str | None = None,
    state_version: int | None = None,
    event_id: str | None = None,
    query_text: str | None = None,
) -> list[AuditActivity]:
    query = select(AuditRecordModel).where(
        AuditRecordModel.organization_id == organization_id
    )
    if decision_id is not None:
        query = query.where(AuditRecordModel.decision_id == decision_id)
    if state_version is not None:
        query = query.where(AuditRecordModel.state_version == state_version)
    if query_text:
        pattern = f"%{query_text.strip()}%"
        query = query.where(
            or_(
                AuditRecordModel.title.ilike(pattern),
                AuditRecordModel.summary.ilike(pattern),
            )
        )
    records = session.scalars(
        query.order_by(AuditRecordModel.created_at.desc(), AuditRecordModel.id.desc())
    ).all()
    if event_id is not None:
        records = [record for record in records if event_id in record.event_ids]
    return [audit_to_activity(record) for record in records]


def get_decision_trace(
    session: Session, *, organization_id: str, decision_id: str
) -> list[AuditRecord]:
    decision = session.scalar(
        select(Decision).where(
            Decision.id == decision_id,
            Decision.organization_id == organization_id,
        )
    )
    if decision is None:
        raise APIError(404, "DECISION_NOT_FOUND", "The decision was not found.")
    trigger_event_ids = set(
        session.scalars(
            select(DecisionRun.trigger_event_id).where(
                DecisionRun.decision_id == decision_id,
                DecisionRun.trigger_event_id.is_not(None),
            )
        ).all()
    )
    organization_records = session.scalars(
        select(AuditRecordModel)
        .where(AuditRecordModel.organization_id == organization_id)
        .order_by(AuditRecordModel.created_at.asc(), AuditRecordModel.id.asc())
    ).all()
    records = [
        record
        for record in organization_records
        if record.decision_id == decision_id
        or (
            record.decision_id is None
            and record.goal_id == decision.goal_id
        )
        or bool(trigger_event_ids.intersection(record.event_ids))
    ]
    return [
        audit_to_schema(
            record,
            decision_id=decision.id,
            goal_id=decision.goal_id,
        )
        for record in records
    ]
