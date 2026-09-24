from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
from app.models import (
    ApprovalRecord,
    AuditRecord,
    Decision,
    DecisionRun,
    RecommendationRecord,
)
from app.repositories import (
    get_active_goal,
    get_current_state,
    get_experiment,
    get_goal,
    list_commitments,
    list_evidence,
    list_experiments,
)
from app.schemas import (
    CollectionPage,
    Commitment,
    ConsequenceCalculateRequest,
    ConsequenceResult,
    EvidenceItem,
    EvidenceQuality,
    Experiment,
    ExperimentOutcome,
    ExperimentStatus,
    FeasibilityCheckRequest,
    FeasibilityResult,
    Goal,
    GovernorStatus,
    OrganizationState,
    OverviewSnapshot,
)
from app.services.evaluation import calculate_consequences, check_feasibility
from app.services.history import audit_to_schema
from app.services.orchestration import recommendation_to_schema

router = APIRouter()


def _page(items: list, cursor: str | None, limit: int) -> tuple[list, str | None]:
    start = 0
    if cursor is not None:
        ids = [item.id for item in items]
        if cursor not in ids:
            raise APIError(
                400,
                "INVALID_CURSOR",
                "The collection cursor is not valid for this result set.",
                {"cursor": cursor},
            )
        start = ids.index(cursor) + 1
    window = items[start : start + limit + 1]
    has_more = len(window) > limit
    page_items = window[:limit]
    next_cursor = page_items[-1].id if has_more and page_items else None
    return page_items, next_cursor


@router.get("/state", response_model=OrganizationState)
def read_state(
    session: Session = Depends(get_db), settings: Settings = Depends(get_settings)
) -> OrganizationState:
    return get_current_state(session, settings.default_organization_id)


@router.get("/overview", response_model=OverviewSnapshot)
def read_overview(
    session: Session = Depends(get_db), settings: Settings = Depends(get_settings)
) -> OverviewSnapshot:
    organization_id = settings.default_organization_id
    current = get_current_state(session, organization_id)
    active_run = session.scalar(
        select(DecisionRun)
        .join(Decision, Decision.id == DecisionRun.decision_id)
        .where(
            Decision.organization_id == organization_id,
            DecisionRun.status.in_(["QUEUED", "RUNNING"]),
        )
        .order_by(DecisionRun.created_at.desc())
        .limit(1)
    )
    latest_run = session.scalar(
        select(DecisionRun)
        .join(Decision, Decision.id == DecisionRun.decision_id)
        .where(Decision.organization_id == organization_id)
        .order_by(DecisionRun.created_at.desc())
        .limit(1)
    )
    latest_recommendation = session.scalar(
        select(RecommendationRecord)
        .join(Decision, Decision.id == RecommendationRecord.decision_id)
        .where(Decision.organization_id == organization_id)
        .order_by(RecommendationRecord.created_at.desc())
        .limit(1)
    )
    pending_approvals = session.scalar(
        select(func.count(ApprovalRecord.id))
        .join(Decision, Decision.id == ApprovalRecord.decision_id)
        .where(
            Decision.organization_id == organization_id,
            ApprovalRecord.decision == "PENDING",
        )
    )
    recent_records = session.scalars(
        select(AuditRecord)
        .where(AuditRecord.organization_id == organization_id)
        .order_by(AuditRecord.created_at.desc(), AuditRecord.id.desc())
        .limit(10)
    ).all()
    latest_activity = recent_records[0].created_at if recent_records else None
    governor_state = "MONITORING"
    if active_run is not None:
        governor_state = (
            "REPLANNING" if active_run.run_type != "INITIAL" else "RUNNING"
        )
    elif latest_run is not None and latest_run.status == "FAILED":
        governor_state = "FAILED"
    return OverviewSnapshot(
        organization_state=current,
        active_goal=get_active_goal(session, organization_id),
        governor_status=GovernorStatus(
            state=governor_state,
            decision_cycle=(
                active_run.run_type
                if active_run is not None
                else latest_run.result or latest_run.status
                if latest_run is not None
                else "READY"
            ),
            active_run_id=active_run.id if active_run else None,
            last_activity_at=latest_activity,
        ),
        experiments=list_experiments(session, organization_id),
        commitments=list_commitments(session, organization_id),
        latest_recommendation=(
            recommendation_to_schema(latest_recommendation).model_dump(mode="json")
            if latest_recommendation
            else None
        ),
        pending_approval_count=pending_approvals or 0,
        recent_activity=[
            audit_to_schema(record).model_dump(mode="json") for record in recent_records
        ],
    )


@router.get("/experiments", response_model=CollectionPage[Experiment])
def read_experiments(
    status: ExperimentStatus | None = None,
    outcome: ExperimentOutcome | None = None,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[Experiment]:
    items = list_experiments(
        session,
        settings.default_organization_id,
        status=status,
        outcome=outcome,
    )
    page_items, next_cursor = _page(items, cursor, limit)
    return CollectionPage(items=page_items, next_cursor=next_cursor)


@router.get("/experiments/{experiment_id}", response_model=Experiment)
def read_experiment(
    experiment_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Experiment:
    return get_experiment(session, settings.default_organization_id, experiment_id)


@router.get("/commitments", response_model=CollectionPage[Commitment])
def read_commitments(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[Commitment]:
    items = list_commitments(session, settings.default_organization_id)
    page_items, next_cursor = _page(items, cursor, limit)
    return CollectionPage(items=page_items, next_cursor=next_cursor)


@router.get("/goals/{goal_id}", response_model=Goal)
def read_goal(
    goal_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Goal:
    return get_goal(session, settings.default_organization_id, goal_id)


@router.get("/evidence", response_model=CollectionPage[EvidenceItem])
def read_evidence(
    goal_id: str | None = None,
    experiment_id: str | None = None,
    quality: EvidenceQuality | None = None,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[EvidenceItem]:
    items = list_evidence(
        session,
        settings.default_organization_id,
        goal_id=goal_id,
        experiment_id=experiment_id,
        quality=quality.value if quality else None,
    )
    page_items, next_cursor = _page(items, cursor, limit)
    return CollectionPage(items=page_items, next_cursor=next_cursor)


@router.post("/feasibility/check", response_model=FeasibilityResult)
def evaluate_feasibility(
    request: FeasibilityCheckRequest,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> FeasibilityResult:
    return check_feasibility(
        session, settings.default_organization_id, request.strategy
    )


@router.post("/consequences/calculate", response_model=ConsequenceResult)
def evaluate_consequences(
    request: ConsequenceCalculateRequest,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ConsequenceResult:
    return calculate_consequences(
        session, settings.default_organization_id, request
    )

