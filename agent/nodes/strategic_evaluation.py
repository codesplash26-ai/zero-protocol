import json

from schemas.models import StrategicEvaluationSet

from providers.fallback_provider import (
    FallbackProvider,
)

from state import AgentState


def strategic_evaluation_node(
    state: AgentState,
) -> dict:

    provider = FallbackProvider()

    feasibility_map = {
        item["strategy_id"]: item
        for item in state["feasibility_results"]
    }

    # Only feasible strategies go to the LLM.
    feasible_strategies = [
        strategy
        for strategy in state["candidate_strategies"]
        if feasibility_map.get(
            strategy["id"], {}
        ).get("feasible", False)
    ]

    feasible_ids = {
        strategy["id"]
        for strategy in feasible_strategies
    }

    relevant_consequences = [
        result
        for result in state["consequence_results"]
        if result["strategy_id"] in feasible_ids
    ]

    system_prompt = """
You are the strategic evaluation component
of Experiment Governor.

Evaluate ONLY the feasible strategies
provided to you.

Use ONLY information explicitly present
in the supplied data.

Consider:

- information value
- whether an experiment unlocks another decision
- strategic alignment
- opportunity cost
- resource consumption
- reversibility
- risk
- protected commitments

IMPORTANT RULES:

1. Never invent revenue percentages.
2. Never invent conversion rates.
3. Never invent CTR values.
4. Never invent expected growth percentages.
5. Never invent customer behaviour.
6. Never invent evidence that was not supplied.
7. Never modify numerical values.
8. Never declare an infeasible strategy feasible.
9. Never invent experiments.
10. Do not make the final recommendation.
11. Never invent experiment outcomes.
12. Treat completed prerequisite experiments as
    dependency-satisfying only when outcome is SUCCESS.
13. Treat completed prerequisite experiments with
    outcome FAILURE as not unlocking dependents.
14. Give explicit strategic importance to a
    newly unlocked experiment when deterministic
    feasibility says its strategy is feasible.
15. Never invent risk levels or turnaround speed.

When a low-cost experiment provides information
needed before making a larger dependent investment,
recognize that information value explicitly.

For example, a prerequisite experiment that reduces
uncertainty before a larger dependent experiment
has strategic information value.

Base every statement only on the supplied
objective, experiment data, consequences,
and feasibility results.
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
    state.get(
        "newly_unlocked_experiment_ids",
        [],
    ),
    indent=2
)}

Feasible strategies:

{json.dumps(
    feasible_strategies,
    indent=2
)}

Consequences:

{json.dumps(
    relevant_consequences,
    indent=2
)}

CP-SAT result:

{json.dumps(
    state["optimization_result"],
    indent=2
)}

Evaluate every feasible strategy.
"""

    result = provider.generate_structured(
        system_prompt,
        user_prompt,
        StrategicEvaluationSet,
    )

    # Semantic safety check
    valid_assessments = [
        assessment.model_dump()
        for assessment in result.assessments
        if assessment.strategy_id
        in feasible_ids
    ]

    return {
        "strategic_evaluation":
            valid_assessments
    }
