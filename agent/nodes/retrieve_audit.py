from state import AgentState
from tools.backend_client import get_backend_client


def retrieve_audit_node(
    state: AgentState,
) -> dict:
    records = get_backend_client().get_audit(
        state["decision_id"]
    )

    return {
        "audit_trace": [
            record.model_dump(mode="json")
            for record in records
        ]
    }
