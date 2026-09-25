from schemas.models import (
    Experiment,
)

from tools.experiment_rules import (
    detect_newly_unlocked_experiment_ids,
)

from state import AgentState


def detect_newly_unlocked_node(
    state: AgentState,
) -> dict:

    experiments = [
        Experiment(**experiment)
        for experiment
        in state["experiments"]
    ]

    return {
        "newly_unlocked_experiment_ids":
            detect_newly_unlocked_experiment_ids(
                experiments
            )
    }
