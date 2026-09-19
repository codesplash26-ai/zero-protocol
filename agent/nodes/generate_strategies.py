import json

from schemas.models import (
    CandidateStrategySet,
)

from providers.fallback_provider import (
    FallbackProvider,
)

from state import AgentState


def generate_strategies_node(
    state: AgentState,
) -> dict:

    provider = FallbackProvider()

    objective = (
        state["decision_objective"]
    )

    experiments = (
        state["experiments"]
    )

    evidence_plan = (
        state["evidence_plan"]
    )

    system_prompt = """
You generate candidate experiment
strategies for Experiment Governor.

Rules:

Use only experiment IDs supplied to you.

Generate multiple reasonable options.

Include conditional sequences when an
experiment depends on evidence from an
earlier experiment.

Include a do-nothing strategy when
appropriate.

Do not declare a strategy feasible.

Do not perform budget, engineering or
traffic calculations.

Those checks are handled by deterministic
services and CP-SAT.
"""

    user_prompt = f"""
Decision objective:

{json.dumps(objective, indent=2)}

Experiments:

{json.dumps(experiments, indent=2)}

Evidence plan:

{json.dumps(evidence_plan, indent=2)}

Generate candidate strategies.
"""

    result = (
        provider.generate_structured(
            system_prompt,
            user_prompt,
            CandidateStrategySet,
        )
    )

    # Deterministic safety check:
    # LLM cannot invent experiments.

    known_ids = {
        experiment["id"]
        for experiment
        in experiments
    }

    valid_strategies = []

    for strategy in result.strategies:

        strategy_ids = set(
            strategy.experiment_ids
        )

        if not strategy_ids.issubset(
            known_ids
        ):
            continue

        valid_strategies.append(
            strategy.model_dump()
        )

    return {
        "candidate_strategies":
            valid_strategies
    }