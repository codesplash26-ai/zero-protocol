from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import (
    Commitment as CommitmentRecord,
)
from app.models import (
    EventRecord,
    MaterialityRecord,
)
from app.models import (
    Experiment as ExperimentRecord,
)
from app.models import (
    OrganizationState as OrganizationStateRecord,
)
from app.schemas import (
    Event,
    EventCreateRequest,
    EventType,
    ExperimentOutcome,
    ExperimentStatus,
    MaterialityResult,
)
from app.services.audit import append_audit
from app.services.identifiers import new_id
from app.services.state import (
    invalidate_approvals_for_version,
    lock_current_state,
    require_state_version,
)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def event_to_schema(record: EventRecord) -> Event:
    return Event(
        id=record.id,
        event_type=record.event_type,
        description=record.description,
        engineering_delta_hours=record.engineering_delta_hours,
        budget_delta_usd=record.budget_delta_usd,
        experiment_id=record.experiment_id,
        experiment_outcome=record.experiment_outcome,
        commitment_id=record.commitment_id,
        source=record.source,
        occurred_at=_as_utc(record.occurred_at),
        state_version=record.state_version,
    )


def materiality_to_schema(record: MaterialityRecord) -> MaterialityResult:
    return MaterialityResult(
        event_id=record.event_id,
        potentially_material=record.potentially_material,
        affected_fields=record.affected_fields,
        reasons=record.reasons,
        state_version=record.state_version,
    )


def record_system_event(
    session: Session,
    *,
    organization_id: str,
    event_type: EventType,
    description: str,
    source: str,
    state_version: int,
    experiment_id: str | None = None,
    experiment_outcome: ExperimentOutcome | None = None,
    changes: dict | None = None,
    occurred_at: datetime | None = None,
) -> EventRecord:
    record = EventRecord(
        id=new_id("EVENT"),
        organization_id=organization_id,
        event_type=event_type.value,
        description=description,
        engineering_delta_hours=0,
        budget_delta_usd=0,
        experiment_id=experiment_id,
        experiment_outcome=(experiment_outcome.value if experiment_outcome else None),
        commitment_id=None,
        source=source,
        occurred_at=occurred_at or datetime.now(UTC),
        state_version=state_version,
        changes=changes or {},
    )
    session.add(record)
    session.flush()
    return record


def _payload_error(message: str) -> APIError:
    return APIError(400, "EVENT_PAYLOAD_MISMATCH", message)


def _load_commitment(
    session: Session, organization_id: str, commitment_id: str
) -> CommitmentRecord:
    record = session.scalar(
        select(CommitmentRecord)
        .where(
            CommitmentRecord.id == commitment_id,
            CommitmentRecord.organization_id == organization_id,
        )
        .with_for_update()
    )
    if record is None:
        raise APIError(404, "COMMITMENT_NOT_FOUND", "The commitment was not found.")
    return record


def _load_experiment(
    session: Session, organization_id: str, experiment_id: str
) -> ExperimentRecord:
    record = session.scalar(
        select(ExperimentRecord)
        .where(
            ExperimentRecord.id == experiment_id,
            ExperimentRecord.organization_id == organization_id,
        )
        .with_for_update()
    )
    if record is None:
        raise APIError(404, "EXPERIMENT_NOT_FOUND", "The experiment was not found.")
    return record


def create_event(
    session: Session,
    *,
    organization_id: str,
    request: EventCreateRequest,
) -> Event:
    current = lock_current_state(session, organization_id)
    require_state_version(current, request.expected_state_version)

    budget = current.budget_usd
    capacity = current.engineering_capacity_hours
    reserved = current.reserved_engineering_hours
    available = current.available_engineering_hours
    traffic = current.eligible_traffic
    changes: dict[str, dict[str, int | str]] = {}

    if request.event_type is EventType.BUDGET_CHANGE:
        if (
            request.budget_delta_usd == 0
            or request.engineering_delta_hours != 0
            or request.experiment_id is not None
            or request.experiment_outcome is not None
            or request.commitment_id is not None
        ):
            raise _payload_error(
                "BUDGET_CHANGE requires only a non-zero budget_delta_usd."
            )
        new_budget = budget + request.budget_delta_usd
        changes["budget_usd"] = {"before": budget, "after": new_budget}
        budget = new_budget

    elif request.event_type in {
        EventType.CAPACITY_CHANGE,
        EventType.COMMITMENT_CHANGE,
    }:
        if (
            request.engineering_delta_hours == 0
            or request.budget_delta_usd != 0
            or request.experiment_id is not None
            or request.experiment_outcome is not None
        ):
            raise _payload_error(
                "Capacity events require only a non-zero engineering_delta_hours."
            )
        if request.event_type is EventType.COMMITMENT_CHANGE and not request.commitment_id:
            raise _payload_error("COMMITMENT_CHANGE requires commitment_id.")
        if request.commitment_id:
            commitment = _load_commitment(
                session, organization_id, request.commitment_id
            )
            new_commitment_reserved = (
                commitment.reserved_engineering_hours
                - request.engineering_delta_hours
            )
            if new_commitment_reserved < 0:
                raise APIError(
                    409,
                    "INVALID_RESOURCE_STATE",
                    "The event would make the commitment reservation negative.",
                )
            new_reserved = reserved - request.engineering_delta_hours
            new_available = available + request.engineering_delta_hours
            changes["reserved_engineering_hours"] = {
                "before": reserved,
                "after": new_reserved,
            }
            changes["available_engineering_hours"] = {
                "before": available,
                "after": new_available,
            }
            commitment.reserved_engineering_hours = new_commitment_reserved
            reserved = new_reserved
            available = new_available
        else:
            new_capacity = capacity + request.engineering_delta_hours
            new_available = available + request.engineering_delta_hours
            changes["engineering_capacity_hours"] = {
                "before": capacity,
                "after": new_capacity,
            }
            changes["available_engineering_hours"] = {
                "before": available,
                "after": new_available,
            }
            capacity = new_capacity
            available = new_available

    elif request.event_type is EventType.EXPERIMENT_RESULT:
        if (
            request.experiment_id is None
            or request.experiment_outcome
            not in {ExperimentOutcome.SUCCESS, ExperimentOutcome.FAILURE}
            or request.engineering_delta_hours != 0
            or request.budget_delta_usd != 0
            or request.commitment_id is not None
        ):
            raise _payload_error(
                "EXPERIMENT_RESULT requires an experiment and SUCCESS or FAILURE."
            )
        experiment = _load_experiment(
            session, organization_id, request.experiment_id
        )
        if experiment.status != ExperimentStatus.RUNNING.value:
            raise APIError(
                409,
                "INVALID_EXPERIMENT_TRANSITION",
                "Only a running experiment can record a result.",
            )
        new_reserved = reserved - experiment.engineering_hours
        new_available = available + experiment.engineering_hours
        changes.update(
            {
                "experiment_status": {
                    "before": experiment.status,
                    "after": ExperimentStatus.COMPLETED.value,
                },
                "experiment_outcome": {
                    "before": experiment.outcome,
                    "after": request.experiment_outcome.value,
                },
                "reserved_engineering_hours": {
                    "before": reserved,
                    "after": new_reserved,
                },
                "available_engineering_hours": {
                    "before": available,
                    "after": new_available,
                },
            }
        )
        experiment.status = ExperimentStatus.COMPLETED.value
        experiment.outcome = request.experiment_outcome.value
        reserved = new_reserved
        available = new_available

    elif request.event_type is EventType.DEPENDENCY_CHANGE:
        if (
            request.experiment_id is None
            or request.experiment_outcome is not None
            or request.commitment_id is not None
            or request.engineering_delta_hours != 0
            or request.budget_delta_usd != 0
        ):
            raise _payload_error(
                "DEPENDENCY_CHANGE requires only the affected experiment_id."
            )
        _load_experiment(session, organization_id, request.experiment_id)
        changes["dependencies"] = {
            "before": "previous dependency facts",
            "after": request.description,
        }

    if min(budget, capacity, reserved, available, traffic) < 0:
        raise APIError(
            409,
            "INVALID_RESOURCE_STATE",
            "The event would produce a negative resource balance.",
        )
    if capacity != reserved + available:
        raise APIError(
            409,
            "INVALID_RESOURCE_STATE",
            "The event would violate the engineering capacity balance.",
        )

    next_version = current.state_version + 1
    next_state = OrganizationStateRecord(
        organization_id=organization_id,
        state_version=next_version,
        budget_usd=budget,
        engineering_capacity_hours=capacity,
        reserved_engineering_hours=reserved,
        available_engineering_hours=available,
        eligible_traffic=traffic,
        approval_threshold_usd=current.approval_threshold_usd,
    )
    record = EventRecord(
        id=new_id("EVENT"),
        organization_id=organization_id,
        event_type=request.event_type.value,
        description=request.description,
        engineering_delta_hours=request.engineering_delta_hours,
        budget_delta_usd=request.budget_delta_usd,
        experiment_id=request.experiment_id,
        experiment_outcome=(
            request.experiment_outcome.value if request.experiment_outcome else None
        ),
        commitment_id=request.commitment_id,
        source=request.source,
        occurred_at=request.occurred_at,
        state_version=next_version,
        changes=changes,
    )
    session.add_all([next_state, record])
    invalidate_approvals_for_version(
        session,
        organization_id=organization_id,
        state_version=current.state_version,
    )
    append_audit(
        session,
        organization_id=organization_id,
        state_version=next_version,
        event_ids=[record.id],
        title="Organization event applied",
        summary=f"Applied {record.event_type} event {record.id} atomically.",
    )
    session.flush()
    return event_to_schema(record)


def list_events(
    session: Session,
    *,
    organization_id: str,
    event_type: EventType | None = None,
    potentially_material: bool | None = None,
    from_state_version: int | None = None,
    to_state_version: int | None = None,
) -> list[Event]:
    query = select(EventRecord).where(EventRecord.organization_id == organization_id)
    if potentially_material is not None:
        query = query.join(
            MaterialityRecord, MaterialityRecord.event_id == EventRecord.id
        ).where(MaterialityRecord.potentially_material == potentially_material)
    if event_type is not None:
        query = query.where(EventRecord.event_type == event_type.value)
    if from_state_version is not None:
        query = query.where(EventRecord.state_version >= from_state_version)
    if to_state_version is not None:
        query = query.where(EventRecord.state_version <= to_state_version)
    records = session.scalars(
        query.order_by(EventRecord.occurred_at.desc(), EventRecord.id.desc())
    ).all()
    return [event_to_schema(record) for record in records]


def get_event(session: Session, *, organization_id: str, event_id: str) -> Event:
    record = session.scalar(
        select(EventRecord).where(
            EventRecord.id == event_id,
            EventRecord.organization_id == organization_id,
        )
    )
    if record is None:
        raise APIError(404, "EVENT_NOT_FOUND", "The event was not found.")
    return event_to_schema(record)


def calculate_materiality(
    session: Session, *, organization_id: str, event_id: str
) -> MaterialityResult:
    event = session.scalar(
        select(EventRecord)
        .where(
            EventRecord.id == event_id,
            EventRecord.organization_id == organization_id,
        )
        .with_for_update()
    )
    if event is None:
        raise APIError(404, "EVENT_NOT_FOUND", "The event was not found.")
    existing = session.get(MaterialityRecord, event_id)
    if existing is not None:
        return materiality_to_schema(existing)

    affected_fields = sorted(event.changes)
    reasons = []
    for field in affected_fields:
        change = event.changes[field]
        reasons.append(
            f"{field} changed from {change.get('before')} to {change.get('after')}"
        )
    record = MaterialityRecord(
        event_id=event.id,
        potentially_material=bool(affected_fields),
        affected_fields=affected_fields,
        reasons=reasons,
        state_version=event.state_version,
    )
    session.add(record)
    append_audit(
        session,
        organization_id=organization_id,
        state_version=event.state_version,
        event_ids=[event.id],
        tool_calls=["calculate_materiality"],
        title="Event materiality evaluated",
        summary=(
            f"Event {event.id} was classified as "
            f"{'potentially material' if affected_fields else 'not material'}."
        ),
    )
    session.flush()
    return materiality_to_schema(record)


def get_materiality(
    session: Session, *, organization_id: str, event_id: str
) -> MaterialityResult:
    record = session.scalar(
        select(MaterialityRecord)
        .join(EventRecord, EventRecord.id == MaterialityRecord.event_id)
        .where(
            MaterialityRecord.event_id == event_id,
            EventRecord.organization_id == organization_id,
        )
    )
    if record is None:
        raise APIError(
            404,
            "EVENT_OR_MATERIALITY_NOT_FOUND",
            "The event materiality result was not found.",
        )
    return materiality_to_schema(record)
