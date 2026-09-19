from typing import Optional

from ortools.sat.python import cp_model

from schemas.models import (
    Experiment,
    OrganizationState,
    OptimizationResult,
    SolverStatus,
)


class CombinationCollector(cp_model.CpSolverSolutionCallback):

    def __init__(
        self,
        variables: dict[str, cp_model.IntVar],
    ):
        super().__init__()

        self.variables = variables
        self.combinations: list[list[str]] = []

    def on_solution_callback(self):

        selected = []

        for experiment_id, variable in self.variables.items():

            if self.Value(variable) == 1:
                selected.append(experiment_id)

        self.combinations.append(selected)


def find_feasible_combinations(
    state: OrganizationState,
    experiments: list[Experiment],
    required_experiment_ids: Optional[list[str]] = None,
) -> OptimizationResult:

    model = cp_model.CpModel()

    selection = {
        experiment.id: model.NewBoolVar(
            f"select_{experiment.id}"
        )
        for experiment in experiments
    }

    # -----------------------------
    # Budget constraint
    # -----------------------------

    model.Add(
        sum(
            experiment.cost_usd
            * selection[experiment.id]
            for experiment in experiments
        )
        <= state.budget_usd
    )

    # -----------------------------
    # Engineering constraint
    # -----------------------------

    model.Add(
        sum(
            experiment.engineering_hours
            * selection[experiment.id]
            for experiment in experiments
        )
        <= state.available_engineering_hours
    )

    # -----------------------------
    # Traffic constraint
    # -----------------------------

    model.Add(
        sum(
            experiment.traffic_required
            * selection[experiment.id]
            for experiment in experiments
        )
        <= state.eligible_traffic
    )

    # -----------------------------
    # Dependency constraints
    # -----------------------------

    experiment_map = {
        experiment.id: experiment
        for experiment in experiments
    }

    for experiment in experiments:

        for dependency_id in experiment.dependencies:

            dependency = experiment_map.get(dependency_id)

            if dependency is None:
                raise ValueError(
                    f"Unknown dependency: {dependency_id}"
                )

            # If dependency already completed,
            # we do not need to select it again.
            if dependency.status.value == "COMPLETED":
                continue

            model.Add(
                selection[experiment.id]
                <= selection[dependency_id]
            )

    # -----------------------------
    # Optional forced experiments
    # Useful for testing
    # -----------------------------

    if required_experiment_ids:

        for experiment_id in required_experiment_ids:

            if experiment_id not in selection:
                raise ValueError(
                    f"Unknown experiment: {experiment_id}"
                )

            model.Add(
                selection[experiment_id] == 1
            )

    # -----------------------------
    # Solve
    # -----------------------------

    solver = cp_model.CpSolver()

    solver.parameters.enumerate_all_solutions = True
    solver.parameters.max_time_in_seconds = 5.0

    collector = CombinationCollector(selection)

    status = solver.Solve(
        model,
        collector,
    )

    status_name = solver.StatusName(status)

    solver_status = SolverStatus(
        status_name
    )

    combinations = sorted(
        collector.combinations,
        key=lambda combination: (
            len(combination),
            combination,
        ),
    )

    return OptimizationResult(
        status=solver_status,
        feasible_combinations=combinations,
    )