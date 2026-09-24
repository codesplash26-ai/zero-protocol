from __future__ import annotations

from sqlalchemy import Select, case, select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.errors import APIError
from app.schemas import (
    Commitment,
    EvidenceItem,
    Experiment,
    ExperimentOutcome,
    ExperimentStatus,
    Goal,
    OrganizationState,
)


def get_current_state(session: Session, organization_id: str) -> OrganizationState:
    statement = (
        select(models.OrganizationState, models.Organization.name)
        .join(models.Organization)
        .where(models.OrganizationState.organization_id == organization_id)
        .order_by(models.OrganizationState.state_version.desc())
        .limit(1)
    )
    row = session.execute(statement).first()
    if row is None:
        raise APIError(404, "ORGANIZATION_NOT_FOUND", "Organization state was not found.")
    state, organization_name = row
    return OrganizationState(
        organization_id=state.organization_id,
        organization_name=organization_name,
        budget_usd=state.budget_usd,
        engineering_capacity_hours=state.engineering_capacity_hours,
        reserved_engineering_hours=state.reserved_engineering_hours,
        available_engineering_hours=state.available_engineering_hours,
        eligible_traffic=state.eligible_traffic,
        approval_threshold_usd=state.approval_threshold_usd,
        state_version=state.state_version,
    )


def experiment_to_schema(experiment: models.Experiment) -> Experiment:
    return Experiment(
        id=experiment.id,
        name=experiment.name,
        cost_usd=experiment.cost_usd,
        engineering_hours=experiment.engineering_hours,
        traffic_required=experiment.traffic_required,
        dependencies=sorted(link.dependency_id for link in experiment.dependency_links),
        status=experiment.status,
        outcome=experiment.outcome,
        decision_role=experiment.decision_role,
    )


def experiment_query(organization_id: str) -> Select[tuple[models.Experiment]]:
    return (
        select(models.Experiment)
        .options(selectinload(models.Experiment.dependency_links))
        .where(models.Experiment.organization_id == organization_id)
    )


def list_experiments(
    session: Session,
    organization_id: str,
    *,
    status: ExperimentStatus | None = None,
    outcome: ExperimentOutcome | None = None,
) -> list[Experiment]:
    statement = experiment_query(organization_id)
    if status is not None:
        statement = statement.where(models.Experiment.status == status.value)
    if outcome is not None:
        statement = statement.where(models.Experiment.outcome == outcome.value)
    records = session.scalars(statement.order_by(models.Experiment.id.asc())).all()
    return [experiment_to_schema(record) for record in records]


def get_experiment(
    session: Session, organization_id: str, experiment_id: str
) -> Experiment:
    statement = experiment_query(organization_id).where(
        models.Experiment.id == experiment_id
    )
    record = session.scalar(statement)
    if record is None:
        raise APIError(
            404,
            "EXPERIMENT_NOT_FOUND",
            "The requested experiment was not found.",
            {"experiment_id": experiment_id},
        )
    return experiment_to_schema(record)


def commitment_to_schema(commitment: models.Commitment) -> Commitment:
    return Commitment(
        id=commitment.id,
        name=commitment.name,
        reserved_engineering_hours=commitment.reserved_engineering_hours,
        priority=commitment.priority,
        protected=commitment.protected,
        notes=commitment.notes,
        updated_at=commitment.updated_at,
    )


def list_commitments(session: Session, organization_id: str) -> list[Commitment]:
    priority_order = case(
        (models.Commitment.priority == "CRITICAL", 0),
        (models.Commitment.priority == "HIGH", 1),
        else_=2,
    )
    records = session.scalars(
        select(models.Commitment)
        .where(models.Commitment.organization_id == organization_id)
        .order_by(priority_order, models.Commitment.id.asc())
    ).all()
    return [commitment_to_schema(record) for record in records]


def goal_to_schema(goal: models.Goal) -> Goal:
    return Goal(
        id=goal.id,
        text=goal.text,
        horizon_weeks=goal.horizon_weeks,
        protected_commitments=sorted(item.id for item in goal.protected_commitments),
    )


def get_goal(session: Session, organization_id: str, goal_id: str) -> Goal:
    record = session.scalar(
        select(models.Goal)
        .options(selectinload(models.Goal.protected_commitments))
        .where(
            models.Goal.organization_id == organization_id,
            models.Goal.id == goal_id,
        )
    )
    if record is None:
        raise APIError(
            404,
            "GOAL_NOT_FOUND",
            "The requested goal was not found.",
            {"goal_id": goal_id},
        )
    return goal_to_schema(record)


def get_active_goal(session: Session, organization_id: str) -> Goal | None:
    record = session.scalar(
        select(models.Goal)
        .options(selectinload(models.Goal.protected_commitments))
        .where(models.Goal.organization_id == organization_id)
        .order_by(models.Goal.created_at.desc(), models.Goal.id.desc())
        .limit(1)
    )
    return goal_to_schema(record) if record else None


def evidence_to_schema(evidence: models.EvidenceItem) -> EvidenceItem:
    return EvidenceItem(
        id=evidence.id,
        source=evidence.source,
        content=evidence.content,
        quality=evidence.quality,
        relevance=evidence.relevance,
        retrieved_at=evidence.retrieved_at,
        freshness=evidence.freshness,
        trust_level=evidence.trust_level,
        conflicts=[str(item) for item in evidence.conflicts],
    )


def list_evidence(
    session: Session,
    organization_id: str,
    *,
    goal_id: str | None = None,
    experiment_id: str | None = None,
    quality: str | None = None,
) -> list[EvidenceItem]:
    statement = select(models.EvidenceItem).where(
        models.EvidenceItem.organization_id == organization_id
    )
    if goal_id is not None:
        statement = statement.where(models.EvidenceItem.goal_id == goal_id)
    if experiment_id is not None:
        statement = statement.where(models.EvidenceItem.experiment_id == experiment_id)
    if quality is not None:
        statement = statement.where(models.EvidenceItem.quality == quality)
    records = session.scalars(statement.order_by(models.EvidenceItem.id.asc())).all()
    return [evidence_to_schema(record) for record in records]

