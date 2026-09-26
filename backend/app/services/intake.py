from __future__ import annotations

import hashlib
from base64 import b64encode
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import (
    EvidenceItem as EvidenceRecord,
)
from app.models import (
    Experiment as ExperimentRecord,
)
from app.models import (
    ExperimentDependency,
    ExperimentImportRecord,
)
from app.repositories import experiment_to_schema
from app.schemas import (
    CanonicalExperimentInput,
    EvidenceQuality,
    Experiment,
    ExperimentCreateRequest,
    ExperimentEvidenceInput,
    ExperimentImportConfirmRequest,
    ExperimentImportDraft,
    ExperimentImportJob,
    ExperimentImportSource,
    ExperimentImportSourceType,
    ExperimentImportStatus,
    ImportInterpretationRequest,
)
from app.services.audit import append_audit
from app.services.identifiers import new_id
from app.services.state import (
    copy_next_state,
    invalidate_approvals_for_version,
    lock_current_state,
    require_state_version,
)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def import_to_schema(record: ExperimentImportRecord) -> ExperimentImportJob:
    return ExperimentImportJob(
        id=record.id,
        status=record.status,
        source_name=record.source_name,
        draft=(
            ExperimentImportDraft.model_validate(record.draft)
            if record.draft is not None
            else None
        ),
        error=record.error,
        created_at=_as_utc(record.created_at),
        completed_at=_as_utc(record.completed_at),
    )


def create_import_job(
    session: Session,
    *,
    organization_id: str,
    source_type: ExperimentImportSourceType,
    source_name: str,
    content: bytes,
    source_text: str | None,
) -> ExperimentImportJob:
    record = ExperimentImportRecord(
        id=new_id("IMPORT"),
        organization_id=organization_id,
        status=ExperimentImportStatus.QUEUED.value,
        source_type=source_type.value,
        source_name=source_name,
        source_text=source_text,
        source_blob=None if source_text is not None else content,
        source_sha256=hashlib.sha256(content).hexdigest(),
        draft=None,
        error=None,
        confirmed_experiment_id=None,
        completed_at=None,
        confirmed_at=None,
    )
    session.add(record)
    session.flush()
    return import_to_schema(record)


def get_import_job(
    session: Session, *, organization_id: str, import_id: str
) -> ExperimentImportJob:
    record = session.scalar(
        select(ExperimentImportRecord).where(
            ExperimentImportRecord.id == import_id,
            ExperimentImportRecord.organization_id == organization_id,
        )
    )
    if record is None:
        raise APIError(404, "IMPORT_NOT_FOUND", "The import job was not found.")
    return import_to_schema(record)


def get_import_source(
    session: Session, *, organization_id: str, import_id: str
) -> ExperimentImportSource:
    record = session.scalar(
        select(ExperimentImportRecord).where(
            ExperimentImportRecord.id == import_id,
            ExperimentImportRecord.organization_id == organization_id,
        )
    )
    if record is None:
        raise APIError(404, "IMPORT_NOT_FOUND", "The import job was not found.")
    return ExperimentImportSource(
        id=record.id,
        source_type=record.source_type,
        source_name=record.source_name,
        text=record.source_text,
        content_base64=(
            b64encode(record.source_blob).decode("ascii")
            if record.source_blob is not None
            else None
        ),
        sha256=record.source_sha256,
    )


def persist_interpretation(
    session: Session,
    *,
    organization_id: str,
    import_id: str,
    request: ImportInterpretationRequest,
) -> ExperimentImportJob:
    record = session.scalar(
        select(ExperimentImportRecord)
        .where(
            ExperimentImportRecord.id == import_id,
            ExperimentImportRecord.organization_id == organization_id,
        )
        .with_for_update()
    )
    if record is None:
        raise APIError(404, "IMPORT_NOT_FOUND", "The import job was not found.")
    if record.status not in {
        ExperimentImportStatus.QUEUED.value,
        ExperimentImportStatus.RUNNING.value,
    }:
        raise APIError(409, "IMPORT_ALREADY_RESOLVED", "The import job is closed.")
    now = datetime.now(UTC)
    if request.draft is not None:
        record.status = ExperimentImportStatus.SUCCEEDED.value
        record.draft = request.draft.model_dump(mode="json")
        record.error = None
    else:
        record.status = ExperimentImportStatus.FAILED.value
        record.draft = None
        record.error = request.error
    record.completed_at = now
    session.flush()
    return import_to_schema(record)


def _validate_dependencies(
    session: Session,
    *,
    organization_id: str,
    dependency_ids: list[str],
) -> list[ExperimentRecord]:
    if len(set(dependency_ids)) != len(dependency_ids):
        raise APIError(400, "INVALID_DEPENDENCY", "Dependencies must be unique.")
    if not dependency_ids:
        return []
    records = session.scalars(
        select(ExperimentRecord).where(
            ExperimentRecord.organization_id == organization_id,
            ExperimentRecord.id.in_(dependency_ids),
        )
    ).all()
    found = {record.id for record in records}
    missing = sorted(set(dependency_ids) - found)
    if missing:
        raise APIError(
            400,
            "INVALID_DEPENDENCY",
            "One or more experiment dependencies were not found.",
            {"dependency_ids": missing},
        )
    by_id = {record.id: record for record in records}
    return [by_id[item] for item in dependency_ids]


def experiment_letter(index: int) -> str:
    """0 -> A, 25 -> Z, 26 -> AA, 27 -> AB ..."""
    letters = ""
    number = index + 1
    while number:
        number, remainder = divmod(number - 1, 26)
        letters = chr(ord("A") + remainder) + letters
    return letters


def _next_experiment_id(session: Session) -> str:
    # Continue the seeded A, B, C naming. Callers already hold the organization
    # state lock, and experiment IDs are a global key, so check all of them.
    taken = set(session.scalars(select(ExperimentRecord.id)).all())
    index = 0
    while experiment_letter(index) in taken:
        index += 1
    return experiment_letter(index)


def _create_experiment_record(
    session: Session,
    *,
    organization_id: str,
    experiment: CanonicalExperimentInput,
    evidence_items: list[ExperimentEvidenceInput],
) -> ExperimentRecord:
    dependencies = _validate_dependencies(
        session,
        organization_id=organization_id,
        dependency_ids=experiment.dependencies,
    )
    record = ExperimentRecord(
        id=_next_experiment_id(session),
        organization_id=organization_id,
        name=experiment.name,
        cost_usd=experiment.cost_usd,
        engineering_hours=experiment.engineering_hours,
        traffic_required=experiment.traffic_required,
        status="PROPOSED",
        outcome="PENDING",
        decision_role=experiment.decision_role,
    )
    for dependency in dependencies:
        record.dependency_links.append(
            ExperimentDependency(dependency_id=dependency.id)
        )
    session.add(record)
    session.flush()
    for item in evidence_items:
        session.add(
            EvidenceRecord(
                id=new_id("EVIDENCE"),
                organization_id=organization_id,
                goal_id=None,
                experiment_id=record.id,
                source=item.source,
                content=item.content,
                quality=item.quality.value,
                relevance=item.relevance,
                retrieved_at=item.retrieved_at,
                freshness=item.freshness,
                trust_level=item.trust_level,
                conflicts=item.conflicts,
            )
        )
    session.flush()
    return record


def create_experiment(
    session: Session,
    *,
    organization_id: str,
    request: ExperimentCreateRequest,
) -> Experiment:
    current = lock_current_state(session, organization_id)
    require_state_version(current, request.expected_state_version)
    experiment = CanonicalExperimentInput(
        name=request.name,
        cost_usd=request.cost_usd,
        engineering_hours=request.engineering_hours,
        traffic_required=request.traffic_required,
        dependencies=request.dependencies,
        decision_role=request.decision_role,
    )
    record = _create_experiment_record(
        session,
        organization_id=organization_id,
        experiment=experiment,
        evidence_items=request.evidence_items,
    )
    next_state = copy_next_state(session, current)
    invalidate_approvals_for_version(
        session,
        organization_id=organization_id,
        state_version=current.state_version,
    )
    append_audit(
        session,
        organization_id=organization_id,
        state_version=next_state.state_version,
        title="Experiment created",
        summary=f"Created canonical experiment {record.id}.",
    )
    session.flush()
    return experiment_to_schema(record)


def _draft_evidence(
    record: ExperimentImportRecord, draft: ExperimentImportDraft
) -> ExperimentEvidenceInput:
    sections = [
        ("Description", draft.short_description),
        ("Objective", draft.objective),
        ("Hypothesis", draft.hypothesis),
        ("Duration", draft.duration),
        ("Success threshold", draft.success_threshold),
    ]
    content = "\n".join(f"{label}: {value}" for label, value in sections if value)
    if not content:
        content = "Human confirmed the interpreted experiment plan."
    quality = (
        EvidenceQuality.HIGH
        if draft.confidence >= 0.8
        else EvidenceQuality.MEDIUM
        if draft.confidence >= 0.5
        else EvidenceQuality.LOW
    )
    return ExperimentEvidenceInput(
        source=record.source_name,
        content=content,
        quality=quality,
        relevance=draft.decision_role,
        retrieved_at=record.completed_at,
        freshness="CURRENT_AT_CONFIRMATION",
        trust_level="AI_INTERPRETED_HUMAN_CONFIRMED",
        conflicts=[],
    )


def confirm_import(
    session: Session,
    *,
    organization_id: str,
    import_id: str,
    request: ExperimentImportConfirmRequest,
) -> Experiment:
    current = lock_current_state(session, organization_id)
    require_state_version(current, request.expected_state_version)
    record = session.scalar(
        select(ExperimentImportRecord)
        .where(
            ExperimentImportRecord.id == import_id,
            ExperimentImportRecord.organization_id == organization_id,
        )
        .with_for_update()
    )
    if record is None:
        raise APIError(404, "IMPORT_NOT_FOUND", "The import job was not found.")
    if record.status == ExperimentImportStatus.CONFIRMED.value:
        raise APIError(
            409, "IMPORT_ALREADY_CONFIRMED", "The import was already confirmed."
        )
    if record.status != ExperimentImportStatus.SUCCEEDED.value or record.draft is None:
        raise APIError(409, "IMPORT_NOT_READY", "The import draft is not ready.")

    supplied = request.experiment
    values = {
        "name": supplied.name,
        "cost_usd": supplied.cost_usd,
        "engineering_hours": supplied.engineering_hours,
        "traffic_required": supplied.traffic_required,
    }
    missing = sorted(key for key, value in values.items() if value is None or value == "")
    if missing:
        raise APIError(
            422,
            "MISSING_CANONICAL_FIELD",
            "All canonical experiment fields must be supplied before confirmation.",
            {"fields": missing},
        )
    experiment = CanonicalExperimentInput(
        name=str(supplied.name),
        cost_usd=int(supplied.cost_usd),
        engineering_hours=int(supplied.engineering_hours),
        traffic_required=int(supplied.traffic_required),
        dependencies=supplied.dependencies,
        decision_role=supplied.decision_role,
    )
    draft = ExperimentImportDraft.model_validate(record.draft)
    evidence_items = request.evidence_items or [_draft_evidence(record, draft)]
    experiment_record = _create_experiment_record(
        session,
        organization_id=organization_id,
        experiment=experiment,
        evidence_items=evidence_items,
    )
    next_state = copy_next_state(session, current)
    invalidate_approvals_for_version(
        session,
        organization_id=organization_id,
        state_version=current.state_version,
    )
    record.status = ExperimentImportStatus.CONFIRMED.value
    record.confirmed_experiment_id = experiment_record.id
    record.confirmed_at = datetime.now(UTC)
    append_audit(
        session,
        organization_id=organization_id,
        state_version=next_state.state_version,
        title="Experiment import confirmed",
        summary=(
            f"Confirmed import {record.id} as canonical experiment "
            f"{experiment_record.id}."
        ),
    )
    session.flush()
    return experiment_to_schema(experiment_record)
