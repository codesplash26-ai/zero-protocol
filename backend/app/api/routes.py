from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
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
    return OverviewSnapshot(
        organization_state=get_current_state(session, organization_id),
        active_goal=get_active_goal(session, organization_id),
        governor_status=GovernorStatus(
            state="MONITORING",
            decision_cycle="READY",
            active_run_id=None,
            last_activity_at=None,
        ),
        experiments=list_experiments(session, organization_id),
        commitments=list_commitments(session, organization_id),
        latest_recommendation=None,
        pending_approval_count=0,
        recent_activity=[],
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

