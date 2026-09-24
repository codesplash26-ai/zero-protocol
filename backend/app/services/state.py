from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import Organization, OrganizationState


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

