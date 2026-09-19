from schemas.models import (
    Approval,
    ApprovalDecision,
    ConsequenceResult,
    OrganizationState,
)


def check_approval_requirement(
    decision_id: str,
    strategy_id: str,
    consequences: ConsequenceResult,
    state: OrganizationState,
) -> Approval:

    requires_approval = (
        consequences.budget_used_usd
        > state.approval_threshold_usd
    )

    if requires_approval:

        decision = ApprovalDecision.PENDING

        reason = (
            "Strategy cost exceeds "
            "configured approval threshold."
        )

    else:

        decision = (
            ApprovalDecision.NOT_REQUIRED
        )

        reason = (
            "Strategy cost is within "
            "the configured approval threshold."
        )

    return Approval(
        id="APR-001",
        decision_id=decision_id,
        strategy_id=strategy_id,
        decision=decision,
        reason=reason,
        threshold_usd=
            state.approval_threshold_usd,
        state_version=state.state_version,
    )