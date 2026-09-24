from __future__ import annotations

from sqlalchemy.orm import Session

from app.errors import APIError
from app.repositories import get_current_state, list_commitments, list_experiments
from app.schemas import (
    CandidateStrategy,
    ConsequenceCalculateRequest,
    ConsequenceResult,
    Experiment,
    ExperimentOutcome,
    ExperimentStatus,
    FeasibilityResult,
)


def _load_selected_experiments(
    session: Session, organization_id: str, experiment_ids: list[str]
) -> tuple[list[Experiment], dict[str, Experiment]]:
    experiments = list_experiments(session, organization_id)
    experiment_map = {experiment.id: experiment for experiment in experiments}
    missing = sorted(set(experiment_ids) - experiment_map.keys())
    if missing:
        raise APIError(
            404,
            "EXPERIMENT_NOT_FOUND",
            "One or more requested experiments were not found.",
            {"experiment_ids": missing},
        )
    return [experiment_map[item] for item in experiment_ids], experiment_map


def _dependency_is_complete(experiment: Experiment | None) -> bool:
    return bool(
        experiment
        and experiment.status is ExperimentStatus.COMPLETED
        and experiment.outcome is ExperimentOutcome.SUCCESS
    )


def _validate_strategy(strategy: CandidateStrategy) -> None:
    reasons: list[str] = []
    if not strategy.experiment_ids:
        reasons.append("experiment_ids must not be empty")
    if len(set(strategy.experiment_ids)) != len(strategy.experiment_ids):
        reasons.append("experiment_ids must be unique")
    if len(set(strategy.sequence)) != len(strategy.sequence):
        reasons.append("sequence must contain unique experiment identifiers")
    if set(strategy.sequence) != set(strategy.experiment_ids):
        reasons.append("sequence must contain exactly the experiment_ids")
    if strategy.conditional and not strategy.condition:
        reasons.append("conditional strategies require a condition")
    if not strategy.conditional and strategy.condition is not None:
        reasons.append("non-conditional strategies must use a null condition")
    if reasons:
        raise APIError(
            400,
            "INVALID_STRATEGY",
            "The candidate strategy is not internally consistent.",
            {"violations": reasons},
        )


def check_feasibility(
    session: Session, organization_id: str, strategy: CandidateStrategy
) -> FeasibilityResult:
    _validate_strategy(strategy)
    state = get_current_state(session, organization_id)
    selected, experiment_map = _load_selected_experiments(
        session, organization_id, strategy.experiment_ids
    )
    selected_ids = set(strategy.experiment_ids)
    sequence_position = {item: index for index, item in enumerate(strategy.sequence)}
    violations: list[str] = []

    for experiment in selected:
        if experiment.status is ExperimentStatus.COMPLETED:
            violations.append(f"{experiment.id} is already completed")
        elif experiment.status is ExperimentStatus.REJECTED:
            violations.append(f"{experiment.id} is rejected")

        for dependency_id in experiment.dependencies:
            dependency = experiment_map.get(dependency_id)
            if _dependency_is_complete(dependency):
                continue
            dependency_is_prior_step = (
                dependency_id in selected_ids
                and sequence_position[dependency_id] < sequence_position[experiment.id]
                and strategy.conditional
            )
            if not dependency_is_prior_step:
                violations.append(
                    f"{experiment.id} requires {dependency_id} to complete with SUCCESS"
                )

    budget_used = sum(item.cost_usd for item in selected)
    engineering_used = sum(item.engineering_hours for item in selected)
    traffic_used = sum(item.traffic_required for item in selected)

    if budget_used > state.budget_usd:
        violations.append(
            f"Budget constraint exceeded: requires {budget_used}, available {state.budget_usd}"
        )
    if engineering_used > state.available_engineering_hours:
        violations.append(
            "Engineering capacity exceeded: "
            f"requires {engineering_used}, available {state.available_engineering_hours}"
        )
    if traffic_used > state.eligible_traffic:
        violations.append(
            "Traffic constraint exceeded: "
            f"requires {traffic_used}, available {state.eligible_traffic}"
        )

    return FeasibilityResult(
        strategy_id=strategy.id,
        feasible=not violations,
        violations=violations,
        evaluated_state_version=state.state_version,
    )


def calculate_consequences(
    session: Session,
    organization_id: str,
    request: ConsequenceCalculateRequest,
) -> ConsequenceResult:
    state = get_current_state(session, organization_id)
    selected, _ = _load_selected_experiments(
        session, organization_id, request.experiment_ids
    )

    budget_used = sum(item.cost_usd for item in selected)
    engineering_used = sum(item.engineering_hours for item in selected)
    traffic_used = sum(item.traffic_required for item in selected)

    affected_commitments: list[str] = []
    if engineering_used > state.available_engineering_hours:
        affected_commitments = [
            commitment.id
            for commitment in list_commitments(session, organization_id)
            if commitment.protected
        ]

    return ConsequenceResult(
        strategy_id=request.strategy_id,
        budget_used_usd=budget_used,
        remaining_budget_usd=state.budget_usd - budget_used,
        engineering_used_hours=engineering_used,
        remaining_engineering_hours=state.available_engineering_hours
        - engineering_used,
        traffic_used=traffic_used,
        remaining_traffic=state.eligible_traffic - traffic_used,
        delay_days=0,
        affected_commitments=affected_commitments,
        evaluated_state_version=state.state_version,
    )
