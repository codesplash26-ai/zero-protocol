import json

from schemas.models import (
    EvidencePlan,
)

from providers.fallback_provider import (
    FallbackProvider,
)

from state import AgentState


def plan_evidence_node(
    state: AgentState,
) -> dict:

    provider = FallbackProvider()

    objective = (
        state["decision_objective"]
    )

    organization = (
        state["organization_state"]
    )

    experiments = (
        state["experiments"]
    )

    system_prompt = """
You are the evidence planner for
Experiment Governor.

Identify only information needed to
make the current experiment-strategy
decision.

Do not make the final recommendation.
Do not perform mathematical feasibility
calculations.
"""

    user_prompt = f"""
Decision objective:

{json.dumps(objective, indent=2)}

Current organization state:

{json.dumps(organization, indent=2)}

Available experiments:

{json.dumps(experiments, indent=2)}

Determine:

- required evidence
- whether current data is sufficient
- clarification questions, if any
"""

    result = (
        provider.generate_structured(
            system_prompt,
            user_prompt,
            EvidencePlan,
        )
    )

    return {
        "evidence_plan":
            result.model_dump()
    }