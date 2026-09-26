from __future__ import annotations

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_internal_service
from app.config import Settings, get_settings
from app.database import get_db
from app.schemas import (
    DecisionRun,
    DecisionRunClaim,
    DecisionRunFailureRequest,
    OptimizationPersistRequest,
    OptimizationResult,
    Recommendation,
)
from app.services.idempotency import get_replay, store_response
from app.services.orchestration import (
    claim_next_decision_run,
    fail_decision_run,
    persist_optimization,
    persist_recommendation,
)

router = APIRouter(dependencies=[Depends(require_internal_service)])


@router.post(
    "/optimization-results",
    response_model=OptimizationResult,
    status_code=status.HTTP_201_CREATED,
)
def create_optimization_result(
    request: OptimizationPersistRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> OptimizationResult:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/optimization-results"
    with session.begin():
        replay = get_replay(
            session, scope=scope, key=idempotency_key, payload=payload
        )
        if replay is not None:
            return OptimizationResult.model_validate(replay)
        response = persist_optimization(
            session,
            organization_id=settings.default_organization_id,
            request=request,
        )
        store_response(
            session,
            scope=scope,
            key=idempotency_key,
            payload=payload,
            status_code=201,
            response_body=response.model_dump(mode="json"),
        )
        return response


@router.post(
    "/recommendations",
    response_model=Recommendation,
    status_code=status.HTTP_201_CREATED,
)
def create_recommendation(
    request: Recommendation,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Recommendation:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/recommendations"
    with session.begin():
        replay = get_replay(
            session, scope=scope, key=idempotency_key, payload=payload
        )
        if replay is not None:
            return Recommendation.model_validate(replay)
        response = persist_recommendation(
            session,
            organization_id=settings.default_organization_id,
            request=request,
        )
        store_response(
            session,
            scope=scope,
            key=idempotency_key,
            payload=payload,
            status_code=201,
            response_body=response.model_dump(mode="json"),
        )
        return response


@router.post("/internal/decision-runs/claim", response_model=DecisionRunClaim)
def claim_decision_run(
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DecisionRunClaim:
    """Hand the oldest QUEUED run to the Governor worker and mark it RUNNING."""
    with session.begin():
        return claim_next_decision_run(
            session, organization_id=settings.default_organization_id
        )


@router.post("/internal/decision-runs/{run_id}/fail", response_model=DecisionRun)
def fail_run(
    run_id: str,
    request: DecisionRunFailureRequest,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DecisionRun:
    with session.begin():
        return fail_decision_run(
            session,
            organization_id=settings.default_organization_id,
            run_id=run_id,
            request=request,
        )
