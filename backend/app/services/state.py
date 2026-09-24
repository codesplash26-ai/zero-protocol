from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import ApprovalRecord, Decision, Organization, OrganizationState


def lock_current_state(session: Session, organization_id: str) -> OrganizationState:
    organization = session.scalar(
        select(Organization)
        .where(Organization.id == organization_id)
        .with_for_update()
    )
    if organization is None:
        raise APIError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found.")
    state = session.scalar(
        select(OrganizationState)
        .where(OrganizationState.organization_id == organization_id)
        .order_by(OrganizationState.state_version.desc())
        .limit(1)
    )
    if state is None:
        raise APIError(404, "ORGANIZATION_NOT_FOUND", "Organization state was not found.")
    return state


def require_state_version(state: OrganizationState, expected: int) -> None:
    if state.state_version != expected:
        raise APIError(
            409,
            "STATE_VERSION_CONFLICT",
            "The organization state changed.",
            {"expected": expected, "actual": state.state_version},
        )


def copy_next_state(session: Session, current: OrganizationState) -> OrganizationState:
    next_state = OrganizationState(
        organization_id=current.organization_id,
        state_version=current.state_version + 1,
        budget_usd=current.budget_usd,
        engineering_capacity_hours=current.engineering_capacity_hours,
        reserved_engineering_hours=current.reserved_engineering_hours,
        available_engineering_hours=current.available_engineering_hours,
        eligible_traffic=current.eligible_traffic,
        approval_threshold_usd=current.approval_threshold_usd,
    )
    session.add(next_state)
    return next_state


def invalidate_approvals_for_version(
    session: Session,
    *,
    organization_id: str,
    state_version: int,
    exclude_approval_id: str | None = None,
) -> None:
    conditions = [
        ApprovalRecord.decision_id.in_(
            select(Decision.id).where(Decision.organization_id == organization_id)
        ),
        ApprovalRecord.state_version == state_version,
        ApprovalRecord.decision.in_(["NOT_REQUIRED", "PENDING", "APPROVED"]),
    ]
    if exclude_approval_id is not None:
        conditions.append(ApprovalRecord.id != exclude_approval_id)
    session.execute(
        update(ApprovalRecord).where(*conditions).values(decision="INVALIDATED")
    )

