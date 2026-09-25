from types import SimpleNamespace

import optimizer.cp_sat_optimizer as optimizer_module
import pytest
from optimizer.cp_sat_optimizer import (
    find_feasible_combinations,
)
from pydantic import ValidationError
from schemas.models import (
    ExperimentOutcome,
    ExperimentStatus,
    OptimizationResult,
    SolverStatus,
)
from tools.mock_backend import (
    get_current_state,
    get_experiments,
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
    assert result.status is SolverStatus.FEASIBLE
    assert result.selected_experiment_ids == []
    assert result.objective_value is None
    assert result.solver_run_id.startswith("SOLVER-")
    assert result.evaluated_state_version == 1


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
    assert result.status is SolverStatus.FEASIBLE
    assert result.selected_experiment_ids == []
    assert result.objective_value is None
    assert result.evaluated_state_version == state.state_version


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


@pytest.mark.parametrize(
    ("raw_status", "expected_status"),
    [
        (optimizer_module.cp_model.INFEASIBLE, SolverStatus.INFEASIBLE),
        (optimizer_module.cp_model.UNKNOWN, SolverStatus.UNKNOWN),
    ],
)
def test_cp_sat_non_feasible_statuses_do_not_authorize_selection(
    monkeypatch,
    raw_status,
    expected_status,
):
    class StubSolver:
        def __init__(self):
            self.parameters = SimpleNamespace()

        def Solve(self, model, collector):
            return raw_status

    monkeypatch.setattr(
        optimizer_module.cp_model,
        "CpSolver",
        StubSolver,
    )

    result = find_feasible_combinations(
        get_current_state(),
        get_experiments(),
    )

    assert result.status is expected_status
    assert result.selected_experiment_ids == []
    assert result.feasible_combinations == []
    assert result.objective_value is None


def test_optimization_result_is_strict_and_unknown_cannot_select():
    payload = {
        "status": "UNKNOWN",
        "selected_experiment_ids": [],
        "feasible_combinations": [],
        "objective_value": None,
        "solver_run_id": "SOLVER-TEST",
        "evaluated_state_version": 1,
    }

    with pytest.raises(ValidationError):
        OptimizationResult.model_validate(
            {**payload, "unexpected": True}
        )

    with pytest.raises(ValidationError):
        OptimizationResult.model_validate(
            {**payload, "selected_experiment_ids": ["A"]}
        )
