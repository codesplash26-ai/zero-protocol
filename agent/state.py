from typing import TypedDict


class AgentState(TypedDict, total=False):

    # Input
    goal: dict

    # Startup data
    organization_state: dict
    experiments: list[dict]

    # AI outputs
    decision_objective: dict
    evidence_plan: dict
    candidate_strategies: list[dict]

    # Deterministic tool outputs
    feasibility_results: list[dict]
    consequence_results: list[dict]

    # CP-SAT
    optimization_result: dict

    strategic_evaluation: list[dict]

    # Later stages
    recommendation: dict
    approval: dict
    event: dict
    materiality_result: dict
    newly_unlocked_experiment_ids: list[str]

    # Debug / failure
    errors: list[str]
