from schemas.models import (
    DecisionObjective,
)

from providers.fallback_provider import (
    FallbackProvider,
)

from state import AgentState


def interpret_goal_node(
    state: AgentState,
) -> dict:

    goal_text = (
        state["goal"]["text"]
    )

    provider = FallbackProvider()

    system_prompt = """
You are the goal interpreter for
Experiment Governor.

Convert the founder's goal into a
structured decision objective.

Do not calculate resource feasibility.
Do not make a final recommendation.
"""

    user_prompt = f"""
Founder goal:

{goal_text}

Extract:

1. Main objective
2. Decision horizon in weeks
3. Protected commitments
4. Decision type
"""

    result = (
        provider.generate_structured(
            system_prompt=
                system_prompt,

            user_prompt=
                user_prompt,

            schema=
                DecisionObjective,
        )
    )

    return {
        "decision_objective":
            result.model_dump()
    }