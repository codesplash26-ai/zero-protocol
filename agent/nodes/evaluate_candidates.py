from schemas.models import (
    CandidateStrategy,
    Experiment,
    OrganizationState,
)

from tools.mock_backend import (
    check_feasibility,
    calculate_consequences,
)

from state import AgentState


def evaluate_candidates_node(
    state: AgentState,
) -> dict:

    feasibility_results = []
    consequence_results = []

    # Convert current LangGraph state
    # into Pydantic models
    organization_state = OrganizationState(
        **state["organization_state"]
    )

    experiments = [
        Experiment(**experiment)
        for experiment in state["experiments"]
    ]

    # Evaluate every candidate strategy
    for strategy_data in (
        state["candidate_strategies"]
    ):

        strategy = CandidateStrategy(
            **strategy_data
        )

        # Check feasibility using
        # CURRENT LangGraph state
        feasibility = check_feasibility(
            strategy,
            organization_state,
            experiments,
        )

        feasibility_results.append(
            feasibility.model_dump()
        )

        # Only calculate consequences
        # for feasible strategies
        if feasibility.feasible:

            consequences = calculate_consequences(
                strategy,
                organization_state,
                experiments,
            )

            consequence_results.append(
                consequences.model_dump()
            )

    return {
        "feasibility_results":
            feasibility_results,

        "consequence_results":
            consequence_results,
    }