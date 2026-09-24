from __future__ import annotations

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.schemas import DecisionCreateRequest, DecisionRun, DecisionWorkspace
from app.services.agent_gateway import AgentGateway, get_agent_gateway
from app.services.idempotency import get_replay, store_response
from app.services.orchestration import (
    create_initial_decision,
    get_decision_run,
    get_decision_workspace,
)

router = APIRouter()


@router.post(
    "/decisions", response_model=DecisionRun, status_code=status.HTTP_202_ACCEPTED
)
def create_decision(
    request: DecisionCreateRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    gateway: AgentGateway = Depends(get_agent_gateway),
) -> DecisionRun:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/decisions"
    replayed = False
    with session.begin():
        replay = get_replay(
            session, scope=scope, key=idempotency_key, payload=payload
        )
        if replay is not None:
            response = DecisionRun.model_validate(replay)
            replayed = True
        else:
            response = create_initial_decision(
                session,
                organization_id=settings.default_organization_id,
                goal_id=request.goal_id,
                expected_state_version=request.expected_state_version,
            )
            store_response(
                session,
                scope=scope,
                key=idempotency_key,
                payload=payload,
                status_code=202,
                response_body=response.model_dump(mode="json"),
            )
    if not replayed:
        gateway.dispatch_initial(response.id)
    return response


@router.get("/decision-runs/{run_id}", response_model=DecisionRun)
def read_decision_run(
    run_id: str,
    session: Session = Depends(get_db),
) -> DecisionRun:
    return get_decision_run(session, run_id)


@router.get(
    "/decisions/{decision_id}/workspace", response_model=DecisionWorkspace
)
def read_decision_workspace(
    decision_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DecisionWorkspace:
    return get_decision_workspace(
        session,
        organization_id=settings.default_organization_id,
        decision_id=decision_id,
    )

