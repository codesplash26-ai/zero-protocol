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

    newly_unlocked_ids = (
        state.get(
            "newly_unlocked_experiment_ids",
            [],
        )
    )

    newly_unlocked_id_set = set(
        newly_unlocked_ids
    )

    continuation_strategies = [
        strategy
        for strategy in feasible_strategies
        if newly_unlocked_id_set.intersection(
            strategy["experiment_ids"]
        )
    ]

    if continuation_strategies:
        feasible_strategies = (
            continuation_strategies
        )

    else:

        dependency_prerequisite_ids = {
            dependency_id
            for experiment
            in state["experiments"]
            if experiment["status"]
            != "COMPLETED"
            for dependency_id
            in experiment.get(
                "dependencies",
                [],
            )
        }

        focused_prerequisite_strategies = [
            strategy
            for strategy in feasible_strategies
            if set(
                strategy["experiment_ids"]
            )
            and set(
                strategy["experiment_ids"]
            ).issubset(
                dependency_prerequisite_ids
            )
        ]

        if focused_prerequisite_strategies:
            feasible_strategies = (
                focused_prerequisite_strategies
            )

    feasible_ids = {
        strategy["id"]
        for strategy in feasible_strategies
    }

    strategy_map = {
        strategy["id"]: strategy
        for strategy in feasible_strategies
    }

    relevant_evaluations = [
        assessment
        for assessment in state[
            "strategic_evaluation"
        ]
        if assessment["strategy_id"]
        in feasible_ids
    ]

    relevant_consequences = [
        result
        for result in state[
            "consequence_results"
        ]
        if result["strategy_id"]
        in feasible_ids
    ]

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
   - experiment outcomes
   - unsupported risk levels
   - turnaround speed

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

9. Treat completed prerequisite experiments as
   dependency-satisfying only when outcome is
   SUCCESS.

10. Treat completed prerequisite experiments with
    outcome FAILURE as not unlocking dependents.

11. If newly_unlocked_experiment_ids are present
    in the allowed feasible strategies, choose
    among those continuation strategies.

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

Experiments:

{json.dumps(
    state["experiments"],
    indent=2
)}

Newly unlocked experiment IDs:

{json.dumps(
    newly_unlocked_ids,
    indent=2
)}

Feasible strategies:

{json.dumps(
    feasible_strategies,
    indent=2
)}

Strategic evaluations:

{json.dumps(
    relevant_evaluations,
    indent=2
)}

Deterministic consequences:

{json.dumps(
    relevant_consequences,
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
        if len(feasible_strategies) == 1:

            result = Recommendation(
                decision_id="DEC-001",
                recommended_strategy_id=
                    feasible_strategies[0][
                        "id"
                    ],
                now=[],
                next=[],
                later=[],
                defer=[],
                reasoning_summary=(
                    "Selected the only allowed "
                    "feasible strategy using "
                    "deterministic dependency "
                    "and feasibility constraints."
                ),
            )

        else:

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

    if not set(sequence).issubset(
        set(experiment_ids)
    ):
        raise ValueError(
            "Recommended strategy sequence "
            "does not match selected experiments."
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

    chosen_consequences = next(
        (
            consequence
            for consequence
            in state["consequence_results"]
            if consequence["strategy_id"]
            == result.recommended_strategy_id
        ),
        None,
    )

    selected_newly_unlocked = [
        experiment_id
        for experiment_id
        in experiment_ids
        if experiment_id
        in newly_unlocked_id_set
    ]

    if selected_newly_unlocked:

        reasoning_summary = (
            "Selected strategy "
            f"{result.recommended_strategy_id} "
            "because it contains newly "
            "unlocked experiment(s): "
            f"{selected_newly_unlocked}. "
            "Their completed prerequisite "
            "dependencies have SUCCESS "
            "outcomes."
        )

    else:

        reasoning_summary = (
            "Selected strategy "
            f"{result.recommended_strategy_id} "
            "from the allowed feasible "
            "strategy set."
        )

    if chosen_consequences is not None:

        reasoning_summary = (
            f"{reasoning_summary} "
            "The selected strategy uses "
            f"{chosen_consequences['budget_used_usd']} "
            "USD, "
            f"{chosen_consequences['engineering_used_hours']} "
            "engineering hours, and "
            f"{chosen_consequences['traffic_used']} "
            "traffic. Remaining resources "
            "after selection are "
            f"{chosen_consequences['remaining_budget_usd']} "
            "USD, "
            f"{chosen_consequences['remaining_engineering_hours']} "
            "engineering hours, and "
            f"{chosen_consequences['remaining_traffic']} "
            "traffic."
        )

    recommendation = (
        result.model_dump()
    )

    recommendation[
        "reasoning_summary"
    ] = reasoning_summary

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
