from schemas.models import Event

from tools.mock_backend import (
    get_current_state,
)

from tools.event_tool import (
    apply_event,
    check_materiality,
)


def test_capacity_event():

    state = get_current_state()

    event = Event(
        id="EVENT-TEST",
        event_type="CAPACITY_CHANGE",
        description="Test capacity event",
        engineering_delta_hours=18,
    )

    updated = apply_event(
        event,
        state,
    )

    assert (
        updated.available_engineering_hours
        == 42
    )


def test_capacity_event_is_material():

    event = Event(
        id="EVENT-TEST",
        event_type="CAPACITY_CHANGE",
        description="Test capacity event",
        engineering_delta_hours=18,
    )

    materiality = (
        check_materiality(event)
    )

    assert (
        materiality.potentially_material
        is True
    )