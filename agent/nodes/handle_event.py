from schemas.models import (
    Event,
    OrganizationState,
)

from tools.event_tool import (
    apply_event,
    check_materiality,
)

from state import AgentState


def handle_event_node(
    state: AgentState,
) -> dict:

    event = Event(
        **state["event"]
    )

    organization = OrganizationState(
        **state["organization_state"]
    )

    updated_state = apply_event(
        event,
        organization,
    )

    materiality = check_materiality(
        event
    )

    return {
        "organization_state":
            updated_state.model_dump(),

        "materiality_result":
            materiality.model_dump(),
    }