from typing import TypedDict


class AgentState(TypedDict, total=False):

    # Input
    goal: dict
    decision_id: str

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
    optimization_idempotency_key: str

    strategic_evaluation: list[dict]

    # Later stages
    recommendation: dict
    recommendation_idempotency_key: str
    approval: dict
    audit_trace: list[dict]
    event_request: dict
    event: dict
    event_idempotency_key: str
    materiality_idempotency_key: str
    materiality_result: dict
    newly_unlocked_experiment_ids: list[str]

    # Debug / failure
    errors: list[str]
