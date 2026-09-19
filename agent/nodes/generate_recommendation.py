import json

from schemas.models import Recommendation

from providers.fallback_provider import (
    FallbackProvider,
)

from state import AgentState


def generate_recommendation_node(
    state: AgentState,
) -> dict:

    provider = FallbackProvider()

    # ---------------------------------
    # Find feasible strategies
    # ---------------------------------

    feasibility_map = {
        item["strategy_id"]: item
        for item in state[
            "feasibility_results"
        ]
    }

    feasible_strategies = [
        strategy
        for strategy in state[
            "candidate_strategies"
        ]
        if feasibility_map.get(
            strategy["id"], {}
        ).get(
            "feasible",
            False,
        )
    ]

    feasible_ids = {
        strategy["id"]
        for strategy in feasible_strategies
    }

    strategy_map = {
        strategy["id"]: strategy
        for strategy in feasible_strategies
    }

    # ---------------------------------
    # LLM prompt
    # ---------------------------------

    system_prompt = """
You are the recommendation component
of Experiment Governor.

Choose exactly ONE strategy from the
feasible strategies supplied.

IMPORTANT RULES:

1. recommended_strategy_id MUST exactly match
   one supplied feasible strategy ID.

2. Never invent an experiment.

3. Never invent:
   - revenue percentages
   - growth percentages
   - CTR
   - conversion rates
   - customer behaviour
   - financial returns
   - success probabilities

4. Use ONLY facts supplied in the input.

5. Never recommend an infeasible strategy.

6. Prefer information-producing actions when
   they safely reduce uncertainty before a
   larger dependent commitment.

7. If a small experiment is a prerequisite
   for a larger investment, consider the
   information gained from that experiment.

8. Do NOT claim a strategy is mathematically
   optimal unless the supplied deterministic
   data explicitly proves that.

The now / next / later / defer fields will
be constructed deterministically after your
strategy selection.

Therefore leave:

now = []
next = []
later = []
defer = []

Your job is only to select the strategy and
give a factual reasoning_summary.
"""

    user_prompt = f"""
Decision objective:

{json.dumps(
    state["decision_objective"],
    indent=2
)}

Feasible strategies:

{json.dumps(
    feasible_strategies,
    indent=2
)}

Strategic evaluations:

{json.dumps(
    state["strategic_evaluation"],
    indent=2
)}

Deterministic consequences:

{json.dumps(
    state["consequence_results"],
    indent=2
)}

CP-SAT result:

{json.dumps(
    state["optimization_result"],
    indent=2
)}

Select one feasible strategy.

Use:
decision_id = DEC-001
"""

    result = provider.generate_structured(
        system_prompt,
        user_prompt,
        Recommendation,
    )

    # ---------------------------------
    # Safety validation
    # ---------------------------------

    if (
        result.recommended_strategy_id
        not in feasible_ids
    ):
        raise ValueError(
            "LLM recommended an invalid "
            "or infeasible strategy."
        )

    chosen_strategy = strategy_map[
        result.recommended_strategy_id
    ]

    experiment_ids = (
        chosen_strategy[
            "experiment_ids"
        ]
    )

    sequence = (
        chosen_strategy.get(
            "sequence",
            [],
        )
    )

    conditional = (
        chosen_strategy.get(
            "conditional",
            False,
        )
    )

    # ---------------------------------
    # Build action plan deterministically
    # ---------------------------------

    if conditional and sequence:

        now = [sequence[0]]

        next_actions = sequence[1:]

    else:

        now = experiment_ids.copy()

        next_actions = []

    # ---------------------------------
    # Find experiments not selected
    # ---------------------------------

    all_available_experiments = [
        experiment["id"]
        for experiment
        in state["experiments"]
        if experiment["status"]
        != "COMPLETED"
    ]

    defer = [
        experiment_id
        for experiment_id
        in all_available_experiments
        if experiment_id
        not in experiment_ids
    ]

    # ---------------------------------
    # Final recommendation
    # ---------------------------------

    recommendation = (
        result.model_dump()
    )

    recommendation["now"] = now

    recommendation["next"] = (
        next_actions
    )

    recommendation["later"] = []

    recommendation["defer"] = defer

    # Approval is determined later
    # by deterministic approval logic.
    recommendation[
        "requires_approval"
    ] = False

    return {
        "recommendation":
            recommendation
    }