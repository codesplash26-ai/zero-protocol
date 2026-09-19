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

    newly_unlocked = (
        state.get(
            "newly_unlocked_experiment_ids",
            [],
        )
    )

    system_prompt = """
You generate candidate experiment
strategies for Experiment Governor.

Do not propose a COMPLETED experiment as a new action.

A completed experiment satisfies a dependency
only when its outcome is SUCCESS.

A completed experiment with outcome FAILURE
does not unlock dependent experiments.

Never invent experiment outcomes.

Give explicit attention to
newly_unlocked_experiment_ids.

Do not invent business metrics.

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

Newly unlocked experiment IDs:

{json.dumps(newly_unlocked, indent=2)}

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

    completed_ids = {
        experiment["id"]
        for experiment
        in experiments
        if experiment["status"]
        == "COMPLETED"
    }

    dependency_prerequisite_ids = {
        dependency_id
        for experiment
        in experiments
        if experiment["status"]
        != "COMPLETED"
        for dependency_id
        in experiment.get(
            "dependencies",
            [],
        )
    }

    valid_strategies = []

    for strategy in result.strategies:

        strategy_ids = set(
            strategy.experiment_ids
        )

        sequence_ids = set(
            strategy.sequence
        )

        if not strategy_ids.issubset(
            known_ids
        ):
            continue

        if not sequence_ids.issubset(
            known_ids
        ):
            continue

        if not sequence_ids.issubset(
            strategy_ids
        ):
            continue

        if strategy_ids.intersection(
            completed_ids
        ):
            continue

        if sequence_ids.intersection(
            completed_ids
        ):
            continue

        valid_strategies.append(
            strategy.model_dump()
        )

    existing_strategy_experiment_ids = [
        set(strategy["experiment_ids"])
        for strategy in valid_strategies
    ]

    for experiment_id in newly_unlocked:

        if experiment_id not in known_ids:
            continue

        if experiment_id in completed_ids:
            continue

        if {experiment_id} in (
            existing_strategy_experiment_ids
        ):
            continue

        valid_strategies.append(
            {
                "id":
                    f"newly-unlocked-{experiment_id}",
                "experiment_ids": [
                    experiment_id
                ],
                "sequence": [
                    experiment_id
                ],
                "conditional": False,
                "condition": None,
            }
        )

        existing_strategy_experiment_ids.append(
            {experiment_id}
        )

    for experiment_id in sorted(
        dependency_prerequisite_ids
    ):

        if experiment_id not in known_ids:
            continue

        if experiment_id in completed_ids:
            continue

        if {experiment_id} in (
            existing_strategy_experiment_ids
        ):
            continue

        valid_strategies.append(
            {
                "id":
                    f"dependency-prerequisite-{experiment_id}",
                "experiment_ids": [
                    experiment_id
                ],
                "sequence": [
                    experiment_id
                ],
                "conditional": False,
                "condition": None,
            }
        )

        existing_strategy_experiment_ids.append(
            {experiment_id}
        )

    return {
        "candidate_strategies":
            valid_strategies
    }
