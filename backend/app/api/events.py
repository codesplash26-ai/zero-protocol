from __future__ import annotations

from typing import TypeVar

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
from app.schemas import CollectionPage, Event, EventCreateRequest, EventType, MaterialityResult
from app.services.events import (
    calculate_materiality,
    create_event,
    get_event,
    get_materiality,
    list_events,
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
    page_items = window[:limit]
    return CollectionPage(
        items=page_items,
        next_cursor=(page_items[-1].id if len(window) > limit and page_items else None),
    )


@router.get("/events", response_model=CollectionPage[Event])
def read_events(
    event_type: EventType | None = None,
    potentially_material: bool | None = None,
    from_state_version: int | None = Query(default=None, ge=1),
    to_state_version: int | None = Query(default=None, ge=1),
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CollectionPage[Event]:
    if (
        from_state_version is not None
        and to_state_version is not None
        and from_state_version > to_state_version
    ):
        raise APIError(
            400,
            "INVALID_STATE_VERSION_RANGE",
            "from_state_version cannot exceed to_state_version.",
        )
    items = list_events(
        session,
        organization_id=settings.default_organization_id,
        event_type=event_type,
        potentially_material=potentially_material,
        from_state_version=from_state_version,
        to_state_version=to_state_version,
    )
    return _page(items, cursor, limit)


@router.get("/events/{event_id}", response_model=Event)
def read_event(
    event_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Event:
    return get_event(
        session,
        organization_id=settings.default_organization_id,
        event_id=event_id,
    )


@router.post("/events", response_model=Event, status_code=status.HTTP_201_CREATED)
def ingest_event(
    request: EventCreateRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Event:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/events"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return Event.model_validate(replay)
        response = create_event(
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


@router.post("/events/{event_id}/materiality", response_model=MaterialityResult)
def evaluate_event_materiality(
    event_id: str,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MaterialityResult:
    payload = {"event_id": event_id}
    scope = f"POST:/api/v1/events/{event_id}/materiality"
    with session.begin():
        replay = get_replay(session, scope=scope, key=idempotency_key, payload=payload)
        if replay is not None:
            return MaterialityResult.model_validate(replay)
        response = calculate_materiality(
            session,
            organization_id=settings.default_organization_id,
            event_id=event_id,
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


@router.get("/events/{event_id}/materiality", response_model=MaterialityResult)
def read_event_materiality(
    event_id: str,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MaterialityResult:
    return get_materiality(
        session,
        organization_id=settings.default_organization_id,
        event_id=event_id,
    )
