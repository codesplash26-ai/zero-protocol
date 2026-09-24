from __future__ import annotations

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
from app.models import Commitment as CommitmentRecord
from app.models import EvidenceItem as EvidenceRecord
from app.models import Experiment as ExperimentRecord
from app.models import Goal as GoalRecord
from app.repositories import evidence_to_schema, goal_to_schema
from app.schemas import EvidenceCreateRequest, EvidenceItem, Goal, GoalCreateRequest
from app.services.audit import append_audit
from app.services.idempotency import get_replay, store_response
from app.services.identifiers import new_id
from app.services.state import copy_next_state, lock_current_state, require_state_version

router = APIRouter()


@router.post("/goals", response_model=Goal, status_code=status.HTTP_201_CREATED)
def create_goal(
    request: GoalCreateRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Goal:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/goals"
    with session.begin():
        replay = get_replay(
            session, scope=scope, key=idempotency_key, payload=payload
        )
        if replay is not None:
            return Goal.model_validate(replay)

        current = lock_current_state(session, settings.default_organization_id)
        require_state_version(current, request.expected_state_version)

        commitments = session.scalars(
            select(CommitmentRecord).where(
                CommitmentRecord.organization_id == settings.default_organization_id,
                CommitmentRecord.id.in_(request.protected_commitments),
            )
        ).all()
        found = {item.id for item in commitments}
        missing = sorted(set(request.protected_commitments) - found)
        if missing:
            raise APIError(
                404,
                "COMMITMENT_NOT_FOUND",
                "One or more protected commitments were not found.",
                {"commitment_ids": missing},
            )

        record = GoalRecord(
            id=new_id("GOAL"),
            organization_id=settings.default_organization_id,
            text=request.text,
            horizon_weeks=request.horizon_weeks,
        )
        record.protected_commitments.extend(commitments)
        session.add(record)
        next_state = copy_next_state(session, current)
        session.flush()

        response = goal_to_schema(record)
        append_audit(
            session,
            organization_id=settings.default_organization_id,
            state_version=next_state.state_version,
            goal_id=record.id,
            title="Goal created",
            summary=f"Created founder goal {record.id}.",
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
    "/evidence", response_model=EvidenceItem, status_code=status.HTTP_201_CREATED
)
def create_evidence(
    request: EvidenceCreateRequest,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> EvidenceItem:
    payload = request.model_dump(mode="json")
    scope = "POST:/api/v1/evidence"
    with session.begin():
        replay = get_replay(
            session, scope=scope, key=idempotency_key, payload=payload
        )
        if replay is not None:
            return EvidenceItem.model_validate(replay)

        if request.goal_id and session.get(GoalRecord, request.goal_id) is None:
            raise APIError(404, "GOAL_NOT_FOUND", "The linked goal was not found.")
        if request.experiment_id and session.get(ExperimentRecord, request.experiment_id) is None:
            raise APIError(
                404, "EXPERIMENT_NOT_FOUND", "The linked experiment was not found."
            )

        current = lock_current_state(session, settings.default_organization_id)
        record = EvidenceRecord(
            id=new_id("EVIDENCE"),
            organization_id=settings.default_organization_id,
            goal_id=request.goal_id,
            experiment_id=request.experiment_id,
            source=request.source,
            content=request.content,
            quality=request.quality.value,
            relevance=request.relevance,
            retrieved_at=request.retrieved_at,
            freshness=request.freshness,
            trust_level=request.trust_level,
            conflicts=request.conflicts,
        )
        session.add(record)
        session.flush()
        response = evidence_to_schema(record)
        append_audit(
            session,
            organization_id=settings.default_organization_id,
            state_version=current.state_version,
            goal_id=request.goal_id,
            title="Evidence recorded",
            summary=f"Recorded evidence item {record.id} from {record.source}.",
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
