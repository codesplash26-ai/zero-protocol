from schemas.models import Recommendation
from state import AgentState
from tools.backend_client import get_backend_client


def persist_recommendation_node(
    state: AgentState,
) -> dict:
    recommendation = Recommendation(
        **state["recommendation"]
    )
    idempotency_key = state.get(
        "recommendation_idempotency_key"
    ) or (
        "recommendation-"
        f"{recommendation.decision_id}-"
        f"v{recommendation.state_version}"
    )
    persisted = get_backend_client().persist_recommendation(
        recommendation,
        idempotency_key=idempotency_key,
    )

    return {
        "recommendation": persisted.model_dump(
            mode="json"
        )
    }
