from tools.backend_client import (
    get_backend_client,
)

from tools.strategy_ids import (
    normalize_candidate_strategies,
)

from state import AgentState


def evaluate_candidates_node(
    state: AgentState,
) -> dict:

    feasibility_results = []
    consequence_results = []

    client = get_backend_client()

    candidate_strategies = (
        normalize_candidate_strategies(
            state["candidate_strategies"]
        )
    )

    # Evaluate every candidate strategy
    for strategy in candidate_strategies:

        feasibility = (
            client.check_feasibility(
                strategy
            )
        )

        feasibility_results.append(
            feasibility.model_dump(
                mode="json"
            )
        )

        # Only calculate consequences
        # for feasible strategies
        if feasibility.feasible:

            consequences = (
                client.calculate_consequences(
                    strategy
                )
            )

            consequence_results.append(
                consequences.model_dump(
                    mode="json"
                )
            )

    return {
        "candidate_strategies": [
            strategy.model_dump(
                mode="json"
            )
            for strategy
            in candidate_strategies
        ],

        "feasibility_results":
            feasibility_results,

        "consequence_results":
            consequence_results,
    }
