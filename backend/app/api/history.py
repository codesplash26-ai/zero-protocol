from __future__ import annotations

from typing import TypeVar

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
from app.schemas import AuditRecord, CollectionPage, Recommendation
from app.services.history import get_decision_trace, list_audit_records
from app.services.orchestration import get_latest_recommendation

router = APIRouter()
T = TypeVar("T")


def _page(items: list[T], cursor: str | None, limit: int) -> CollectionPage[T]:
    start = 0
    if cursor is not None:
        ids = [item.id for item in items]
        if cursor not in ids:
            raise APIError(400, "INVALID_CURSOR", "The collection cursor is invalid.")
        start = ids.index(cursor) + 1
    window = items[start : start + limit + 1]
    page_items = window[:limit]
    return CollectionPage(
        items=page_items,
        next_cursor=(page_items[-1].id if len(window) > limit and page_items else None),
    )


@router.get("/recommendations/{decision_id}", response_model=Recommendation)
def read_latest_recommendation(
    decision_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Recommendation:
    return get_latest_recommendation(
        session,
        organization_id=settings.default_organization_id,
        decision_id=decision_id,
    )


@router.get("/audit", response_model=CollectionPage[AuditRecord])
def read_audit_records(
    decision_id: str | None = None,
    state_version: int | None = Query(default=None, ge=1),
    event_id: str | None = None,
    query: str | None = None,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[AuditRecord]:
    items = list_audit_records(
        session,
        organization_id=settings.default_organization_id,
        decision_id=decision_id,
        state_version=state_version,
        event_id=event_id,
        query_text=query,
    )
    return _page(items, cursor, limit)


@router.get("/audit/{decision_id}", response_model=CollectionPage[AuditRecord])
def read_decision_trace(
    decision_id: str,
    cursor: str | None = None,
    limit: int = Query(default=200, ge=1, le=500),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[AuditRecord]:
    items = get_decision_trace(
        session,
        organization_id=settings.default_organization_id,
        decision_id=decision_id,
    )
    return _page(items, cursor, limit)
