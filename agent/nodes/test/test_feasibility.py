from schemas.models import (
    CandidateStrategy,
    ExperimentOutcome,
    ExperimentStatus,
)

from tools.mock_backend import (
    check_feasibility,
    get_current_state,
    get_experiments,
)


def test_strategy_a_is_feasible():

    strategy = CandidateStrategy(
        id="TEST-A",
        experiment_ids=["A"],
        sequence=["A"],
        conditional=False,
        condition=None,
    )

    result = check_feasibility(
        strategy
    )

    assert result.feasible is True


def test_a_b_is_not_initially_feasible():

    strategy = CandidateStrategy(
        id="TEST-AB",
        experiment_ids=["A", "B"],
        sequence=["A", "B"],
        conditional=False,
        condition=None,
    )

    result = check_feasibility(
        strategy
    )

    assert result.feasible is False


def test_successful_completed_a_unlocks_b():

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

    strategy = CandidateStrategy(
        id="TEST-B",
        experiment_ids=["B"],
        sequence=["B"],
        conditional=False,
        condition=None,
    )

    result = check_feasibility(
        strategy,
        state,
        experiments,
    )

    assert result.feasible is True


def test_failed_completed_a_does_not_unlock_b():

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

    strategy = CandidateStrategy(
        id="TEST-B",
        experiment_ids=["B"],
        sequence=["B"],
        conditional=False,
        condition=None,
    )

    result = check_feasibility(
        strategy,
        state,
        experiments,
    )

    assert result.feasible is False
    assert "B requires A" in result.violations
