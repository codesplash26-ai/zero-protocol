import os

from schemas.models import (
    Goal,
)

from state import AgentState

from tools.backend_client import (
    BackendConfigurationError,
    get_backend_client,
)


def load_context_node(state: AgentState) -> dict:

    client = get_backend_client()

    decision_id = state.get(
        "decision_id"
    ) or os.environ.get(
        "AGENT_DECISION_ID",
        "",
    )
    if not decision_id:
        raise BackendConfigurationError(
            "AGENT_DECISION_ID must be set "
            "or a decision_id must be supplied "
            "in the initial graph state.",
            error_code="AGENT_DECISION_ID_MISSING",
        )

    if "goal" in state:
        goal = Goal(
            **state["goal"]
        )

    else:
        goal_id = os.environ.get(
            "AGENT_GOAL_ID",
            "",
        )

        if not goal_id:
            raise BackendConfigurationError(
                "AGENT_GOAL_ID must be set "
                "or a goal must be supplied "
                "in the initial graph state.",
                error_code="AGENT_GOAL_ID_MISSING",
            )

        goal = client.get_goal(goal_id)

    organization_state = (
        client.get_current_state()
    )

    experiments = client.get_experiments()

    return {
        "decision_id": decision_id,
        "goal": goal.model_dump(),
        "organization_state": organization_state.model_dump(),
        "experiments": [
            experiment.model_dump()
            for experiment in experiments
        ],
    }
