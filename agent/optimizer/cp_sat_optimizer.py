from typing import Optional

from ortools.sat.python import cp_model

from schemas.models import (
    Experiment,
    ExperimentStatus,
    OrganizationState,
    OptimizationResult,
    SolverStatus,
    dependency_satisfied_by_completed_success,
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

    # -------------------------------------------------
    # Only experiments that are not already completed
    # can be selected again.
    # -------------------------------------------------

    selectable_experiments = [
        experiment
        for experiment in experiments
        if experiment.status.value != "COMPLETED"
    ]

    # -------------------------------------------------
    # CP-SAT decision variables
    # 1 = selected
    # 0 = not selected
    # -------------------------------------------------

    selection = {
        experiment.id: model.NewBoolVar(
            f"select_{experiment.id}"
        )
        for experiment in selectable_experiments
    }

    # -------------------------------------------------
    # Budget constraint
    # -------------------------------------------------

    model.Add(
        sum(
            experiment.cost_usd
            * selection[experiment.id]
            for experiment in selectable_experiments
        )
        <= state.budget_usd
    )

    # -------------------------------------------------
    # Engineering constraint
    # -------------------------------------------------

    model.Add(
        sum(
            experiment.engineering_hours
            * selection[experiment.id]
            for experiment in selectable_experiments
        )
        <= state.available_engineering_hours
    )

    # -------------------------------------------------
    # Traffic constraint
    # -------------------------------------------------

    model.Add(
        sum(
            experiment.traffic_required
            * selection[experiment.id]
            for experiment in selectable_experiments
        )
        <= state.eligible_traffic
    )

    # -------------------------------------------------
    # Dependency lookup
    #
    # We use ALL experiments here because a dependency
    # may already be completed.
    # -------------------------------------------------

    experiment_map = {
        experiment.id: experiment
        for experiment in experiments
    }

    # -------------------------------------------------
    # Dependency constraints
    # -------------------------------------------------

    for experiment in selectable_experiments:

        for dependency_id in experiment.dependencies:

            dependency = experiment_map.get(
                dependency_id
            )

            if dependency is None:
                raise ValueError(
                    f"Unknown dependency: {dependency_id}"
                )

            # Dependency already completed successfully.
            # Example:
            #
            # A = COMPLETED and SUCCESS
            # B depends on A
            #
            # B can now be selected without selecting A again.
            if dependency_satisfied_by_completed_success(
                dependency
            ):
                continue

            # A completed dependency that did not succeed
            # does not unlock its dependent experiment.
            if (
                dependency.status
                == ExperimentStatus.COMPLETED
            ):
                model.Add(
                    selection[experiment.id] == 0
                )

                continue

            # If dependency has not completed,
            # it must exist as a selectable experiment.
            if dependency_id not in selection:
                raise ValueError(
                    f"Dependency {dependency_id} "
                    f"is not selectable."
                )

            # If B is selected and B depends on A:
            #
            # B <= A
            #
            # therefore selecting B forces A to
            # also be selected.
            model.Add(
                selection[experiment.id]
                <= selection[dependency_id]
            )

    # -------------------------------------------------
    # Optional forced experiments
    # Used mainly for testing
    # -------------------------------------------------

    if required_experiment_ids:

        for experiment_id in required_experiment_ids:

            if experiment_id not in selection:
                raise ValueError(
                    f"Experiment {experiment_id} "
                    f"is not selectable."
                )

            model.Add(
                selection[experiment_id] == 1
            )

    # -------------------------------------------------
    # Solve
    # -------------------------------------------------

    solver = cp_model.CpSolver()

    solver.parameters.enumerate_all_solutions = True
    solver.parameters.max_time_in_seconds = 5.0

    collector = CombinationCollector(
        selection
    )

    status = solver.Solve(
        model,
        collector,
    )

    status_name = solver.StatusName(
        status
    )

    solver_status = SolverStatus(
        status_name
    )

    # -------------------------------------------------
    # Sort combinations for cleaner output
    # -------------------------------------------------

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
