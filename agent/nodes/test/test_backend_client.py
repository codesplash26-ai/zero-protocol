import json

import httpx
import pytest

from schemas.models import (
    CandidateStrategy,
)

from tools.backend_client import (
    BackendAPIError,
    BackendClient,
)


STATE_PAYLOAD = {
    "organization_id": "pulseboard",
    "organization_name": "PulseBoard",
    "budget_usd": 4000,
    "engineering_capacity_hours": 60,
    "reserved_engineering_hours": 36,
    "available_engineering_hours": 24,
    "eligible_traffic": 10000,
    "approval_threshold_usd": 2000,
    "state_version": 1,
}

EXPERIMENT_PAYLOAD = {
    "id": "A",
    "name": "Pricing Willingness Test",
    "cost_usd": 600,
    "engineering_hours": 6,
    "traffic_required": 4000,
    "dependencies": [],
    "status": "PROPOSED",
    "outcome": "PENDING",
    "decision_role": (
        "Tests pricing willingness before "
        "a larger checkout investment."
    ),
}

EXPERIMENT_B_PAYLOAD = {
    "id": "B",
    "name": "Onboarding Activation Test",
    "cost_usd": 900,
    "engineering_hours": 10,
    "traffic_required": 3000,
    "dependencies": ["A"],
    "status": "PROPOSED",
    "outcome": "PENDING",
    "decision_role": "Measures activation lift after pricing validation.",
}

EXPERIMENT_C_PAYLOAD = {
    "id": "C",
    "name": "Referral Incentive Test",
    "cost_usd": 1300,
    "engineering_hours": 8,
    "traffic_required": 3000,
    "dependencies": [],
    "status": "PROPOSED",
    "outcome": "PENDING",
    "decision_role": "Tests acquisition leverage from referral incentives.",
}

FEASIBILITY_PAYLOAD = {
    "strategy_id": "STRATEGY-A",
    "feasible": True,
    "violations": [],
    "evaluated_state_version": 1,
}

CONSEQUENCE_PAYLOAD = {
    "strategy_id": "STRATEGY-A",
    "budget_used_usd": 600,
    "remaining_budget_usd": 3400,
    "engineering_used_hours": 6,
    "remaining_engineering_hours": 18,
    "traffic_used": 4000,
    "remaining_traffic": 6000,
    "delay_days": 0,
    "affected_commitments": [],
    "evaluated_state_version": 1,
}


def _client(
    handler,
) -> BackendClient:
    transport = httpx.MockTransport(
        handler
    )
    http_client = httpx.Client(
        transport=transport,
        base_url="https://backend.test",
    )

    return BackendClient(
        "https://backend.test",
        client=http_client,
    )


def _strategy() -> CandidateStrategy:
    return CandidateStrategy(
        id="STRATEGY-A",
        experiment_ids=["A"],
        sequence=["A"],
        conditional=False,
        condition=None,
    )


def test_get_state_parses_into_organization_state():
    client = _client(
        lambda request: httpx.Response(
            200,
            json=STATE_PAYLOAD,
        )
    )

    result = client.get_current_state()

    assert result.organization_id == "pulseboard"
    assert result.state_version == 1


def test_get_experiments_parses_into_experiment_list():
    client = _client(
        lambda request: httpx.Response(
            200,
            json=[
                EXPERIMENT_PAYLOAD,
                EXPERIMENT_B_PAYLOAD,
                EXPERIMENT_C_PAYLOAD,
            ],
        )
    )

    result = client.get_experiments()

    assert [item.id for item in result] == ["A", "B", "C"]
    assert result[0].outcome.value == "PENDING"


def test_get_experiments_rejects_legacy_page_shape():
    client = _client(
        lambda request: httpx.Response(
            200,
            json={
                "items": [
                    EXPERIMENT_PAYLOAD
                ],
                "next_cursor": None,
            },
        )
    )

    with pytest.raises(
        BackendAPIError
    ) as exc_info:
        client.get_experiments()

    assert exc_info.value.error_code == (
        "INVALID_RESPONSE"
    )


def test_feasibility_request_serializes_strategy():
    captured = {}

    def handler(
        request,
    ):
        captured["path"] = (
            request.url.path
        )
        captured["body"] = json.loads(
            request.content.decode()
        )
        return httpx.Response(
            200,
            json=FEASIBILITY_PAYLOAD,
        )

    client = _client(handler)

    result = client.check_feasibility(
        _strategy()
    )

    assert captured["path"] == (
        "/api/v1/feasibility/check"
    )
    assert captured["body"] == {
        "strategy": {
            "id": "STRATEGY-A",
            "experiment_ids": ["A"],
            "sequence": ["A"],
            "conditional": False,
            "condition": None,
        }
    }
    assert result.feasible is True
    assert result.evaluated_state_version == 1


def test_consequence_request_serializes_strategy():
    captured = {}

    def handler(
        request,
    ):
        captured["path"] = (
            request.url.path
        )
        captured["body"] = json.loads(
            request.content.decode()
        )
        return httpx.Response(
            200,
            json=CONSEQUENCE_PAYLOAD,
        )

    client = _client(handler)

    result = client.calculate_consequences(
        _strategy()
    )

    assert captured["path"] == (
        "/api/v1/consequences/calculate"
    )
    assert captured["body"] == {
        "strategy_id": "STRATEGY-A",
        "experiment_ids": ["A"],
    }
    assert result.remaining_budget_usd == 3400
    assert result.evaluated_state_version == 1


@pytest.mark.parametrize(
    ("status_code", "error_code"),
    [
        (400, "INVALID_STRATEGY"),
        (404, "EXPERIMENT_NOT_FOUND"),
        (409, "STATE_CONFLICT"),
        (422, "VALIDATION_ERROR"),
        (503, "DATABASE_UNAVAILABLE"),
    ],
)
def test_backend_error_statuses_generate_controlled_error(
    status_code,
    error_code,
):
    client = _client(
        lambda request: httpx.Response(
            status_code,
            json={
                "error": {
                    "code": error_code,
                    "message": "Backend rejected request.",
                    "details": {
                        "field": "strategy"
                    },
                    "request_id": "REQ-test",
                }
            },
        )
    )

    with pytest.raises(
        BackendAPIError
    ) as exc_info:
        client.check_feasibility(
            _strategy()
        )

    assert exc_info.value.status_code == (
        status_code
    )
    assert exc_info.value.error_code == (
        error_code
    )
    assert exc_info.value.request_id == (
        "REQ-test"
    )


def test_timeout_fails_safely():
    def handler(
        request,
    ):
        raise httpx.ReadTimeout(
            "timed out",
            request=request,
        )

    client = _client(handler)

    with pytest.raises(
        BackendAPIError
    ) as exc_info:
        client.get_current_state()

    assert exc_info.value.error_code == "TIMEOUT"


def test_invalid_backend_json_fails_safely():
    client = _client(
        lambda request: httpx.Response(
            200,
            content=b"{",
        )
    )

    with pytest.raises(
        BackendAPIError
    ) as exc_info:
        client.get_current_state()

    assert exc_info.value.error_code == (
        "INVALID_JSON"
    )


def test_invalid_contract_response_fails_safely():
    invalid_payload = dict(
        STATE_PAYLOAD
    )
    invalid_payload[
        "unexpected_field"
    ] = True

    client = _client(
        lambda request: httpx.Response(
            200,
            json=invalid_payload,
        )
    )

    with pytest.raises(
        BackendAPIError
    ) as exc_info:
        client.get_current_state()

    assert exc_info.value.error_code == (
        "INVALID_RESPONSE"
    )


def test_no_silent_mock_fallback_on_backend_failure(
    monkeypatch,
):
    def fail_if_fixture_is_used():
        raise AssertionError(
            "mock fixture was used"
        )

    monkeypatch.setattr(
        "tools.mock_backend._load_fixture",
        fail_if_fixture_is_used,
    )

    client = _client(
        lambda request: httpx.Response(
            503,
            json={
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Database unavailable.",
                    "details": {},
                    "request_id": "REQ-down",
                }
            },
        )
    )

    with pytest.raises(
        BackendAPIError
    ) as exc_info:
        client.get_current_state()

    assert exc_info.value.error_code == (
        "DATABASE_UNAVAILABLE"
    )
