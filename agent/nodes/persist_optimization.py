from schemas.models import OptimizationResult
from state import AgentState
from tools.backend_client import get_backend_client


def persist_optimization_node(
    state: AgentState,
) -> dict:
    result = OptimizationResult(
        **state["optimization_result"]
    )
    decision_id = state["decision_id"]
    idempotency_key = state.get(
        "optimization_idempotency_key"
    ) or (
        "optimization-"
        f"{decision_id}-"
        f"{result.solver_run_id}"
    )
    persisted = get_backend_client().persist_optimization_result(
        decision_id,
        result,
        idempotency_key=idempotency_key,
    )

    return {
        "optimization_result": persisted.model_dump(
            mode="json"
        )
    }
