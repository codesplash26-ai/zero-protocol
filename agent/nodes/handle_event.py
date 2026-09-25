from schemas.models import (
    EventCreateRequest,
)

from tools.backend_client import (
    get_backend_client,
)

from state import AgentState


def handle_event_node(
    state: AgentState,
) -> dict:
    request = EventCreateRequest(
        **state["event_request"]
    )

    event_idempotency_key = state.get(
        "event_idempotency_key"
    )
    materiality_idempotency_key = state.get(
        "materiality_idempotency_key"
    )

    if not event_idempotency_key:
        raise ValueError(
            "event_idempotency_key is required"
        )
    if not materiality_idempotency_key:
        raise ValueError(
            "materiality_idempotency_key is required"
        )

    client = get_backend_client()
    event = client.create_event(
        request,
        idempotency_key=event_idempotency_key,
    )
    materiality = client.check_materiality(
        event.id,
        idempotency_key=(
            materiality_idempotency_key
        ),
    )
    organization = client.get_current_state()
    experiments = client.get_experiments()

    return {
        "event": event.model_dump(mode="json"),
        "organization_state": organization.model_dump(
            mode="json"
        ),
        "experiments": [
            experiment.model_dump(mode="json")
            for experiment in experiments
        ],
        "materiality_result": materiality.model_dump(
            mode="json"
        ),
    }
