from schemas.models import (
    Experiment,
    ExperimentStatus,
    dependency_satisfied_by_completed_success,
)


def detect_newly_unlocked_experiment_ids(
    experiments: list[Experiment],
) -> list[str]:
    experiment_map = {
        experiment.id: experiment
        for experiment in experiments
    }

    newly_unlocked = []

    for experiment in experiments:
        if (
            experiment.status
            == ExperimentStatus.COMPLETED
        ):
            continue

        if not experiment.dependencies:
            continue

        dependencies_satisfied = all(
            dependency_satisfied_by_completed_success(
                experiment_map.get(
                    dependency_id
                )
            )
            for dependency_id
            in experiment.dependencies
        )

        if dependencies_satisfied:
            newly_unlocked.append(
                experiment.id
            )

    return newly_unlocked
