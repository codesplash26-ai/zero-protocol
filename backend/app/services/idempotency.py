from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import IdempotencyRecord
from app.services.identifiers import new_id


def request_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), default=str
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def acquire_idempotency_lock(session: Session, scope: str, key: str) -> None:
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:lock_key, 0))"),
            {"lock_key": f"{scope}:{key}"},
        )


def get_replay(
    session: Session,
    *,
    scope: str,
    key: str,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    acquire_idempotency_lock(session, scope, key)
    digest = request_hash(payload)
    record = session.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.scope == scope,
            IdempotencyRecord.idempotency_key == key,
        )
    )
    if record is None:
        return None
    if record.request_hash != digest:
        raise APIError(
            409,
            "IDEMPOTENCY_KEY_REUSED",
            "The idempotency key was already used with a different request.",
            {"scope": scope},
        )
    return record.response_body


def store_response(
    session: Session,
    *,
    scope: str,
    key: str,
    payload: dict[str, Any],
    status_code: int,
    response_body: dict[str, Any],
) -> None:
    session.add(
        IdempotencyRecord(
            id=new_id("IDEMP"),
            scope=scope,
            idempotency_key=key,
            request_hash=request_hash(payload),
            status_code=status_code,
            response_body=response_body,
        )
    )

