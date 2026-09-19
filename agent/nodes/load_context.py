from state import AgentState

from tools.mock_backend import (
    get_goal,
    get_current_state,
    get_experiments,
)


def load_context_node(state: AgentState) -> dict:

    goal = get_goal()
    organization_state = get_current_state()
    experiments = get_experiments()

    return {
        "goal": goal.model_dump(),
        "organization_state": organization_state.model_dump(),
        "experiments": [
            experiment.model_dump()
            for experiment in experiments
        ],
    }