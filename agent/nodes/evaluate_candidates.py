from schemas.models import (
    CandidateStrategy,
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

    for strategy_data in (
        state["candidate_strategies"]
    ):

        strategy = (
            CandidateStrategy(
                **strategy_data
            )
        )

        feasibility = (
            check_feasibility(
                strategy
            )
        )

        feasibility_results.append(
            feasibility.model_dump()
        )

        # Only calculate consequences
        # for feasible candidates.

        if feasibility.feasible:

            consequences = (
                calculate_consequences(
                    strategy
                )
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