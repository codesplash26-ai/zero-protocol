from schemas.models import (
    Event,
    MaterialityResult,
)
from tools.mock_backend import (
    get_current_state,
    get_experiments,
)

from nodes.handle_event import handle_event_node


class _FakeBackendClient:
    def __init__(self):
        self.created_request = None
        self.event_key = None
        self.materiality_key = None

    def create_event(self, request, *, idempotency_key):
        self.created_request = request
        self.event_key = idempotency_key
        return Event(
            id="EVENT-TEST",
            event_type="CAPACITY_CHANGE",
            description=request.description,
            engineering_delta_hours=18,
            budget_delta_usd=0,
            experiment_id=None,
            experiment_outcome=None,
            commitment_id="enterprise_sso",
            source="demo_simulation",
            occurred_at="2026-09-25T05:43:47Z",
            state_version=4,
        )

    def check_materiality(self, event_id, *, idempotency_key):
        assert event_id == "EVENT-TEST"
        self.materiality_key = idempotency_key
        return MaterialityResult(
            event_id=event_id,
            potentially_material=True,
            affected_fields=[
                "available_engineering_hours",
                "reserved_engineering_hours",
            ],
            reasons=[
                "available_engineering_hours changed from 24 to 42",
                "reserved_engineering_hours changed from 36 to 18",
            ],
            state_version=4,
        )

    def get_current_state(self):
        state = get_current_state()
        state.reserved_engineering_hours = 18
        state.available_engineering_hours = 42
        state.state_version = 4
        return state

    def get_experiments(self):
        return get_experiments()


def _event_state() -> dict:
    return {
        "event_request": {
            "event_type": "CAPACITY_CHANGE",
            "description": (
                "The SSO vendor reports a two-week "
                "integration block."
            ),
            "engineering_delta_hours": 18,
            "budget_delta_usd": 0,
            "experiment_id": None,
            "experiment_outcome": None,
            "commitment_id": "enterprise_sso",
            "source": "demo_simulation",
            "occurred_at": "2026-09-25T05:43:47Z",
            "expected_state_version": 3,
        },
        "event_idempotency_key": "capacity-event",
        "materiality_idempotency_key": "capacity-materiality",
    }


def test_handle_event_uses_authoritative_backend(monkeypatch):
    client = _FakeBackendClient()
    monkeypatch.setattr(
        "nodes.handle_event.get_backend_client",
        lambda: client,
    )

    result = handle_event_node(_event_state())

    assert client.created_request.expected_state_version == 3
    assert client.event_key == "capacity-event"
    assert client.materiality_key == "capacity-materiality"
    assert result["event"]["state_version"] == 4
    assert result["organization_state"]["reserved_engineering_hours"] == 18
    assert result["organization_state"]["available_engineering_hours"] == 42
    assert result["organization_state"]["state_version"] == 4
    assert result["materiality_result"]["potentially_material"] is True
    assert result["materiality_result"]["state_version"] == 4


def test_handle_event_requires_idempotency_keys():
    state = _event_state()
    del state["event_idempotency_key"]

    try:
        handle_event_node(state)
    except ValueError as error:
        assert str(error) == "event_idempotency_key is required"
    else:
        raise AssertionError("Missing event idempotency key was accepted")
