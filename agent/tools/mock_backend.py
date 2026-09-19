import json
from pathlib import Path

from schemas.models import (
    CandidateStrategy,
    ConsequenceResult,
    Experiment,
    ExperimentStatus,
    FeasibilityResult,
    Goal,
    OrganizationState,
)


FIXTURE_PATH = (
    Path(__file__).resolve().parents[1]
    / "fixtures"
    / "pulseboard.json"
)


def _load_fixture() -> dict:

    with open(
        FIXTURE_PATH,
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(file)


def get_goal() -> Goal:

    data = _load_fixture()

    return Goal(
        **data["goal"]
    )


def get_current_state() -> OrganizationState:

    data = _load_fixture()

    return OrganizationState(
        **data["organization_state"]
    )


def get_experiments() -> list[Experiment]:

    data = _load_fixture()

    return [
        Experiment(**experiment)
        for experiment in data["experiments"]
    ]


def check_feasibility(
    strategy: CandidateStrategy,
) -> FeasibilityResult:

    state = get_current_state()

    experiments = get_experiments()

    experiment_map = {
        experiment.id: experiment
        for experiment in experiments
    }

    violations: list[str] = []

    selected_experiments = []

    for experiment_id in strategy.experiment_ids:

        if experiment_id not in experiment_map:

            violations.append(
                f"Unknown experiment: {experiment_id}"
            )

            continue

        selected_experiments.append(
            experiment_map[experiment_id]
        )

    # ---------------------------
    # Resource totals
    # ---------------------------

    total_cost = sum(
        experiment.cost_usd
        for experiment in selected_experiments
    )

    total_engineering = sum(
        experiment.engineering_hours
        for experiment in selected_experiments
    )

    total_traffic = sum(
        experiment.traffic_required
        for experiment in selected_experiments
    )

    # ---------------------------
    # Hard constraints
    # ---------------------------

    if total_cost > state.budget_usd:

        violations.append(
            "Budget constraint exceeded"
        )

    if (
        total_engineering
        > state.available_engineering_hours
    ):

        violations.append(
            "Engineering capacity exceeded"
        )

    if total_traffic > state.eligible_traffic:

        violations.append(
            "Traffic constraint exceeded"
        )

    # ---------------------------
    # Dependencies
    # ---------------------------

    selected_ids = set(
        strategy.experiment_ids
    )

    for experiment in selected_experiments:

        for dependency_id in experiment.dependencies:

            dependency = experiment_map.get(
                dependency_id
            )

            dependency_completed = (
                dependency is not None
                and dependency.status
                == ExperimentStatus.COMPLETED
            )

            dependency_selected = (
                dependency_id in selected_ids
            )

            if not (
                dependency_selected
                or dependency_completed
            ):

                violations.append(
                    f"{experiment.id} requires "
                    f"{dependency_id}"
                )

    return FeasibilityResult(
        strategy_id=strategy.id,
        feasible=len(violations) == 0,
        violations=violations,
    )


def calculate_consequences(
    strategy: CandidateStrategy,
) -> ConsequenceResult:

    state = get_current_state()

    experiments = get_experiments()

    experiment_map = {
        experiment.id: experiment
        for experiment in experiments
    }

    selected = [
        experiment_map[experiment_id]
        for experiment_id
        in strategy.experiment_ids
        if experiment_id in experiment_map
    ]

    budget_used = sum(
        experiment.cost_usd
        for experiment in selected
    )

    engineering_used = sum(
        experiment.engineering_hours
        for experiment in selected
    )

    traffic_used = sum(
        experiment.traffic_required
        for experiment in selected
    )

    return ConsequenceResult(
        strategy_id=strategy.id,

        budget_used_usd=budget_used,

        remaining_budget_usd=(
            state.budget_usd
            - budget_used
        ),

        engineering_used_hours=(
            engineering_used
        ),

        remaining_engineering_hours=(
            state.available_engineering_hours
            - engineering_used
        ),

        traffic_used=traffic_used,

        remaining_traffic=(
            state.eligible_traffic
            - traffic_used
        ),
    )