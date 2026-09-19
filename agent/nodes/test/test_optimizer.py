from tools.mock_backend import (
    get_current_state,
    get_experiments,
)

from schemas.models import (
    ExperimentOutcome,
    ExperimentStatus,
)

from optimizer.cp_sat_optimizer import (
    find_feasible_combinations,
)


def test_initial_cp_sat():

    state = get_current_state()
    experiments = get_experiments()

    result = find_feasible_combinations(
        state,
        experiments,
    )

    assert ["A"] in (
        result.feasible_combinations
    )

    assert ["C"] in (
        result.feasible_combinations
    )

    assert ["A", "B"] not in (
        result.feasible_combinations
    )


def test_cp_sat_does_not_select_completed_a():

    state = get_current_state()
    state.available_engineering_hours = 42

    experiments = get_experiments()

    for experiment in experiments:

        if experiment.id == "A":
            experiment.status = (
                ExperimentStatus.COMPLETED
            )
            experiment.outcome = (
                ExperimentOutcome.SUCCESS
            )

    result = find_feasible_combinations(
        state,
        experiments,
    )

    assert ["B"] in (
        result.feasible_combinations
    )

    assert all(
        "A" not in combination
        for combination in
        result.feasible_combinations
    )


def test_cp_sat_failed_completed_a_does_not_unlock_b():

    state = get_current_state()
    state.available_engineering_hours = 42

    experiments = get_experiments()

    for experiment in experiments:

        if experiment.id == "A":
            experiment.status = (
                ExperimentStatus.COMPLETED
            )
            experiment.outcome = (
                ExperimentOutcome.FAILURE
            )

    result = find_feasible_combinations(
        state,
        experiments,
    )

    assert all(
        "B" not in combination
        for combination in
        result.feasible_combinations
    )
