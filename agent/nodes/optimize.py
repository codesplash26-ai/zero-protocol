from schemas.models import (
    Experiment,
    OrganizationState,
)

from optimizer.cp_sat_optimizer import (
    find_feasible_combinations,
)

from state import AgentState


def optimize_node(
    state: AgentState,
) -> dict:

    organization_state = (
        OrganizationState(
            **state[
                "organization_state"
            ]
        )
    )

    experiments = [
        Experiment(**experiment)
        for experiment
        in state["experiments"]
    ]

    result = (
        find_feasible_combinations(
            state=
                organization_state,

            experiments=
                experiments,
        )
    )

    return {
        "optimization_result":
            result.model_dump(
                mode="json"
            )
    }