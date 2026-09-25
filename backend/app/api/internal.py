from __future__ import annotations

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_internal_service
from app.config import Settings, get_settings
from app.database import get_db
from app.schemas import (
    OptimizationPersistRequest,
    OptimizationResult,
    Recommendation,
)
from app.services.idempotency import get_replay, store_response
from app.services.orchestration import persist_optimization, persist_recommendation

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

