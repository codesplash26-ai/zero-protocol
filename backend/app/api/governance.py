from __future__ import annotations

from typing import TypeVar

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_internal_service
from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
from app.schemas import (
    ActionExecuteRequest,
    ActionReceipt,
    ActionReceiptStatus,
    Approval,
    ApprovalCheckRequest,
    ApprovalCreateRequest,
    ApprovalDecision,
    ApprovalDecisionRequest,
    ApprovalPolicyResult,
    CollectionPage,
)
from app.services.governance import (
    check_approval_policy,
    create_approval,
    decide_approval,
    execute_action,
    get_action_receipt,
    get_approval,
    list_action_receipts,
    list_approvals,
)
from app.services.idempotency import get_replay, store_response

router = APIRouter()
T = TypeVar("T")


def _page(items: list[T], cursor: str | None, limit: int) -> CollectionPage[T]:
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
    return CollectionPage(items=page_items, next_cursor=next_cursor)


@router.get("/approvals", response_model=CollectionPage[Approval])
def read_approvals(
    decision: ApprovalDecision | None = None,
    decision_id: str | None = None,
    strategy_id: str | None = None,
    experiment_id: str | None = None,
    state_version: int | None = Query(default=None, ge=1),
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[Approval]:
    items = list_approvals(
        session,
        organization_id=settings.default_organization_id,
        decision=decision,
        decision_id=decision_id,
        strategy_id=strategy_id,
        experiment_id=experiment_id,
        state_version=state_version,
    )
    return _page(items, cursor, limit)


@router.get("/approvals/{approval_id}", response_model=Approval)
def read_approval(
    approval_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Approval:
    return get_approval(
        session,
        organization_id=settings.default_organization_id,
        approval_id=approval_id,
    )


@router.post("/approvals/check", response_model=ApprovalPolicyResult)
def evaluate_approval_policy(
    request: ApprovalCheckRequest,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ApprovalPolicyResult:
    return check_approval_policy(
        session,
        organization_id=settings.default_organization_id,
        request=request,
    )


@router.post(
    "/approvals",
    response_model=Approval,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_internal_service)],
)
def request_approval(
    request: ApprovalCreateRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Approval:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/approvals"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return Approval.model_validate(replay)
        response = create_approval(
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


@router.post("/approvals/{approval_id}/decision", response_model=Approval)
def record_approval_decision(
    approval_id: str,
    request: ApprovalDecisionRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Approval:
    payload = request.model_dump(mode="json")
    scope = f"POST:/api/v1/approvals/{approval_id}/decision"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return Approval.model_validate(replay)
        response = decide_approval(
            session,
            organization_id=settings.default_organization_id,
            approval_id=approval_id,
            request=request,
        )
        store_response(
            session,
            scope=scope,
            key=idempotency_key,
            payload=payload,
            status_code=200,
            response_body=response.model_dump(mode="json"),
        )
        return response


@router.post(
    "/actions/execute",
    response_model=ActionReceipt,
    status_code=status.HTTP_201_CREATED,
)
def run_authorized_action(
    request: ActionExecuteRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ActionReceipt:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/actions/execute"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return ActionReceipt.model_validate(replay)
        response = execute_action(
            session,
            organization_id=settings.default_organization_id,
            request=request,
            idempotency_key=idempotency_key,
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


@router.get("/action-receipts", response_model=CollectionPage[ActionReceipt])
def read_action_receipts(
    decision_id: str | None = None,
    approval_id: str | None = None,
    experiment_id: str | None = None,
    status: ActionReceiptStatus | None = None,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[ActionReceipt]:
    items = list_action_receipts(
        session,
        organization_id=settings.default_organization_id,
        decision_id=decision_id,
        approval_id=approval_id,
        experiment_id=experiment_id,
        status=status,
    )
    return _page(items, cursor, limit)


@router.get("/action-receipts/{receipt_id}", response_model=ActionReceipt)
def read_action_receipt(
    receipt_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ActionReceipt:
    return get_action_receipt(
        session,
        organization_id=settings.default_organization_id,
        receipt_id=receipt_id,
    )
