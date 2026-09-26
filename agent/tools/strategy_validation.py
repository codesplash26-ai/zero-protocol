from schemas.models import CandidateStrategy


def strategy_consistency_violations(
    strategy: CandidateStrategy,
) -> list[str]:
    """Mirror the backend's INVALID_STRATEGY rules (services/evaluation.py).

    A candidate that breaks any of them is rejected by POST /feasibility/check
    and would fail the whole Governor run, so it must be filtered out first.
    """
    violations = []

    if not strategy.experiment_ids:
        violations.append("experiment_ids must not be empty")
    if len(set(strategy.experiment_ids)) != len(strategy.experiment_ids):
        violations.append("experiment_ids must be unique")
    if len(set(strategy.sequence)) != len(strategy.sequence):
        violations.append("sequence must contain unique experiment identifiers")
    if set(strategy.sequence) != set(strategy.experiment_ids):
        violations.append("sequence must contain exactly the experiment_ids")
    if strategy.conditional and not (strategy.condition or "").strip():
        violations.append("conditional strategies require a condition")
    if not strategy.conditional and strategy.condition is not None:
        violations.append("non-conditional strategies must use a null condition")

    return violations
