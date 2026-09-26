import json

import httpx
import pytest

from schemas.models import (
    AuditRecord,
    CandidateStrategy,
    EventCreateRequest,
    OptimizationResult,
    Recommendation,
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

ACTION_RECEIPT_PAYLOAD = {
    "id": "ACT-001",
    "decision_id": "DEC-001",
    "strategy_id": "STRATEGY-A",
    "experiment_id": "A",
    "previous_status": "PROPOSED",
    "new_status": "RUNNING",
    "budget_reserved_usd": 600,
    "engineering_reserved_hours": 6,
    "status": "SUCCESS",
    "state_version": 2,
    "executed_at": "2026-09-25T05:00:00Z",
    "idempotency_key": "execute-a",
}

EVENT_PAYLOAD = {
    "id": "EVENT-001",
    "event_type": "CAPACITY_CHANGE",
    "description": "The SSO vendor reports a two-week integration block.",
    "engineering_delta_hours": 18,
    "budget_delta_usd": 0,
    "experiment_id": None,
    "experiment_outcome": None,
    "commitment_id": "enterprise_sso",
    "source": "demo_simulation",
    "occurred_at": "2026-09-25T05:43:47Z",
    "state_version": 4,
}

MATERIALITY_PAYLOAD = {
    "event_id": "EVENT-001",
    "potentially_material": True,
    "affected_fields": [
        "available_engineering_hours",
        "reserved_engineering_hours",
    ],
    "reasons": [
        "available_engineering_hours changed from 24 to 42",
        "reserved_engineering_hours changed from 36 to 18",
    ],
    "state_version": 4,
}

OPTIMIZATION_PAYLOAD = {
    "status": "FEASIBLE",
    "selected_experiment_ids": [],
    "feasible_combinations": [[], ["A"], ["C"]],
    "objective_value": None,
    "solver_run_id": "SOLVER-001",
    "evaluated_state_version": 1,
}

AUDIT_RECORD_PAYLOAD = {
    "id": "AUD-001",
    "decision_id": "DEC-001",
    "goal_id": "GOAL-001",
    "state_version": 1,
    "tool_calls": ["check_feasibility"],
    "candidate_strategy_ids": ["STRATEGY-A"],
    "optimization_status": "FEASIBLE",
    "recommended_strategy_id": "STRATEGY-A",
    "approval_id": "APR-001",
    "action_receipt_id": None,
    "event_ids": [],
    "created_at": "2026-09-25T08:00:00Z",
}

RECOMMENDATION_PAYLOAD = {
    "decision_id": "DEC-001",
    "recommended_strategy_id": "STRATEGY-B",
    "now": ["B"],
    "next": [],
    "later": [],
    "defer": ["C"],
    "reasoning_summary": "B is executable from authoritative state version 4.",
    "requires_approval": True,
    "state_version": 4,
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
        internal_service_key="test-internal-key",
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


def _event_request() -> EventCreateRequest:
    return EventCreateRequest(
        event_type="CAPACITY_CHANGE",
        description=(
            "The SSO vendor reports a two-week "
            "integration block."
        ),
        engineering_delta_hours=18,
        budget_delta_usd=0,
        experiment_id=None,
        experiment_outcome=None,
        commitment_id="enterprise_sso",
        source="demo_simulation",
        occurred_at="2026-09-25T05:43:47Z",
        expected_state_version=3,
    )


def _recommendation() -> Recommendation:
    return Recommendation.model_validate(
        RECOMMENDATION_PAYLOAD
    )


def _optimization_result() -> OptimizationResult:
    return OptimizationResult.model_validate(
        OPTIMIZATION_PAYLOAD
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


def test_execute_action_serializes_contract_v1_request():
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
        captured["idempotency_key"] = (
            request.headers.get(
                "Idempotency-Key"
            )
        )
        return httpx.Response(
            201,
            json=ACTION_RECEIPT_PAYLOAD,
        )

    client = _client(handler)

    result = client.execute_action(
        decision_id="DEC-001",
        strategy_id="STRATEGY-A",
        experiment_id="A",
        approval_id="APR-001",
        expected_state_version=1,
        idempotency_key="execute-a",
    )

    assert captured["path"] == (
        "/api/v1/actions/execute"
    )
    assert captured["body"] == {
        "decision_id": "DEC-001",
        "strategy_id": "STRATEGY-A",
        "experiment_id": "A",
        "approval_id": "APR-001",
        "expected_state_version": 1,
    }
    assert "action_type" not in captured["body"]
    assert captured["idempotency_key"] == "execute-a"
    assert result.id == "ACT-001"
    assert result.previous_status.value == "PROPOSED"
    assert result.new_status.value == "RUNNING"
    assert result.state_version == 2
    assert result.executed_at.utcoffset() is not None


def test_execute_action_rejects_extra_response_fields():
    payload = {
        **ACTION_RECEIPT_PAYLOAD,
        "approval_id": "APR-001",
    }
    client = _client(
        lambda request: httpx.Response(
            201,
            json=payload,
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.execute_action(
            decision_id="DEC-001",
            strategy_id="STRATEGY-A",
            experiment_id="A",
            approval_id="APR-001",
            expected_state_version=1,
            idempotency_key="execute-a",
        )

    assert exc_info.value.error_code == "INVALID_RESPONSE"


def test_execute_action_rejects_non_utc_timestamp():
    payload = {
        **ACTION_RECEIPT_PAYLOAD,
        "executed_at": "2026-09-25T10:30:00+05:30",
    }
    client = _client(
        lambda request: httpx.Response(
            201,
            json=payload,
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.execute_action(
            decision_id="DEC-001",
            strategy_id="STRATEGY-A",
            experiment_id="A",
            approval_id="APR-001",
            expected_state_version=1,
            idempotency_key="execute-a",
        )

    assert exc_info.value.error_code == "INVALID_RESPONSE"


def test_create_event_serializes_contract_v1_request():
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        captured["body"] = json.loads(request.content.decode())
        captured["idempotency_key"] = request.headers.get(
            "Idempotency-Key"
        )
        return httpx.Response(201, json=EVENT_PAYLOAD)

    client = _client(handler)
    result = client.create_event(
        _event_request(),
        idempotency_key="capacity-event",
    )

    assert captured["path"] == "/api/v1/events"
    assert captured["body"] == {
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
    }
    assert captured["idempotency_key"] == "capacity-event"
    assert "id" not in captured["body"]
    assert "state_version" not in captured["body"]
    assert result.event_type.value == "CAPACITY_CHANGE"
    assert result.state_version == 4
    assert result.occurred_at.utcoffset().total_seconds() == 0


def test_event_request_rejects_non_utc_timestamp():
    payload = _event_request().model_dump()
    payload["occurred_at"] = "2026-09-25T11:13:47+05:30"

    with pytest.raises(ValueError):
        EventCreateRequest.model_validate(payload)


def test_check_materiality_parses_contract_v1_response():
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        captured["idempotency_key"] = request.headers.get(
            "Idempotency-Key"
        )
        return httpx.Response(200, json=MATERIALITY_PAYLOAD)

    client = _client(handler)
    result = client.check_materiality(
        "EVENT-001",
        idempotency_key="capacity-materiality",
    )

    assert captured["path"] == "/api/v1/events/EVENT-001/materiality"
    assert captured["idempotency_key"] == "capacity-materiality"
    assert result.potentially_material is True
    assert result.state_version == 4


def test_create_event_rejects_invalid_response():
    payload = {**EVENT_PAYLOAD, "unexpected": True}
    client = _client(
        lambda request: httpx.Response(201, json=payload)
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.create_event(
            _event_request(),
            idempotency_key="invalid-event-response",
        )

    assert exc_info.value.error_code == "INVALID_RESPONSE"


@pytest.mark.parametrize(
    ("status_code", "error_code"),
    [
        (409, "STATE_VERSION_CONFLICT"),
        (422, "VALIDATION_ERROR"),
    ],
)
def test_create_event_preserves_backend_errors(status_code, error_code):
    client = _client(
        lambda request: httpx.Response(
            status_code,
            json={
                "error": {
                    "code": error_code,
                    "message": "Event rejected.",
                    "details": {},
                    "request_id": "REQ-event",
                }
            },
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.create_event(
            _event_request(),
            idempotency_key="rejected-event",
        )

    assert exc_info.value.status_code == status_code
    assert exc_info.value.error_code == error_code


def test_create_event_timeout_fails_safely():
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    client = _client(handler)

    with pytest.raises(BackendAPIError) as exc_info:
        client.create_event(
            _event_request(),
            idempotency_key="timed-out-event",
        )

    assert exc_info.value.error_code == "TIMEOUT"


def test_create_event_malformed_json_fails_safely():
    client = _client(
        lambda request: httpx.Response(201, content=b"{")
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.create_event(
            _event_request(),
            idempotency_key="malformed-event",
        )

    assert exc_info.value.error_code == "INVALID_JSON"


def test_persist_optimization_serializes_contract_v1_wrapper():
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        captured["body"] = json.loads(request.content.decode())
        captured["idempotency_key"] = request.headers.get(
            "Idempotency-Key"
        )
        captured["service_key"] = request.headers.get(
            "X-Internal-Service-Key"
        )
        return httpx.Response(201, json=OPTIMIZATION_PAYLOAD)

    client = _client(handler)
    result = client.persist_optimization_result(
        "DEC-001",
        _optimization_result(),
        idempotency_key="optimization-001",
    )

    assert captured["path"] == "/api/v1/optimization-results"
    assert captured["body"] == {
        "decision_id": "DEC-001",
        "result": OPTIMIZATION_PAYLOAD,
    }
    assert captured["idempotency_key"] == "optimization-001"
    assert captured["service_key"] == "test-internal-key"
    assert result.status.value == "FEASIBLE"
    assert result.selected_experiment_ids == []


def test_persist_optimization_rejects_malformed_contract_response():
    client = _client(
        lambda request: httpx.Response(
            201,
            json={**OPTIMIZATION_PAYLOAD, "unexpected": True},
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.persist_optimization_result(
            "DEC-001",
            _optimization_result(),
            idempotency_key="invalid-optimization",
        )

    assert exc_info.value.error_code == "INVALID_RESPONSE"


def test_persist_optimization_preserves_backend_error():
    client = _client(
        lambda request: httpx.Response(
            409,
            json={
                "error": {
                    "code": "IDEMPOTENCY_KEY_REUSED",
                    "message": "Key was reused.",
                    "details": {},
                    "request_id": "REQ-optimization",
                }
            },
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.persist_optimization_result(
            "DEC-001",
            _optimization_result(),
            idempotency_key="reused-optimization",
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.error_code == "IDEMPOTENCY_KEY_REUSED"


def test_persist_recommendation_serializes_contract_v1_model():
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        captured["body"] = json.loads(request.content.decode())
        captured["idempotency_key"] = request.headers.get(
            "Idempotency-Key"
        )
        captured["service_key"] = request.headers.get(
            "X-Internal-Service-Key"
        )
        return httpx.Response(201, json=RECOMMENDATION_PAYLOAD)

    client = _client(handler)
    result = client.persist_recommendation(
        _recommendation(),
        idempotency_key="recommendation-v4",
    )

    assert captured["path"] == "/api/v1/recommendations"
    assert captured["body"] == RECOMMENDATION_PAYLOAD
    assert "run_id" not in captured["body"]
    assert "candidate_strategies" not in captured["body"]
    assert "tool_calls" not in captured["body"]
    assert captured["idempotency_key"] == "recommendation-v4"
    assert captured["service_key"] == "test-internal-key"
    assert result.recommended_strategy_id == "STRATEGY-B"
    assert result.state_version == 4


def test_get_recommendation_parses_contract_v1_model():
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        return httpx.Response(200, json=RECOMMENDATION_PAYLOAD)

    client = _client(handler)
    result = client.get_recommendation("DEC-001")

    assert captured["path"] == "/api/v1/recommendations/DEC-001"
    assert result.now == ["B"]
    assert result.requires_approval is True


def test_get_audit_validates_and_paginates_ordered_trace():
    requests = []
    second_record = {
        **AUDIT_RECORD_PAYLOAD,
        "id": "AUD-002",
        "state_version": 2,
        "action_receipt_id": "ACT-001",
        "created_at": "2026-09-25T08:05:00Z",
    }

    def handler(request):
        requests.append(request)
        if request.url.params.get("cursor") is None:
            return httpx.Response(
                200,
                json={
                    "items": [AUDIT_RECORD_PAYLOAD],
                    "next_cursor": "AUD-001",
                },
            )
        return httpx.Response(
            200,
            json={
                "items": [second_record],
                "next_cursor": None,
            },
        )

    client = _client(handler)
    result = client.get_audit("DEC-001")

    assert [request.url.path for request in requests] == [
        "/api/v1/audit/DEC-001",
        "/api/v1/audit/DEC-001",
    ]
    assert requests[0].url.params["limit"] == "500"
    assert requests[1].url.params["cursor"] == "AUD-001"
    assert all(isinstance(record, AuditRecord) for record in result)
    assert [record.id for record in result] == ["AUD-001", "AUD-002"]


@pytest.mark.parametrize(
    ("status_code", "error_code"),
    [
        (404, "DECISION_NOT_FOUND"),
        (503, "DATABASE_UNAVAILABLE"),
    ],
)
def test_get_audit_preserves_backend_errors(status_code, error_code):
    client = _client(
        lambda request: httpx.Response(
            status_code,
            json={
                "error": {
                    "code": error_code,
                    "message": "Audit retrieval failed.",
                    "details": {},
                    "request_id": "REQ-audit",
                }
            },
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.get_audit("DEC-001")

    assert exc_info.value.status_code == status_code
    assert exc_info.value.error_code == error_code


def test_get_audit_timeout_fails_safely():
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    client = _client(handler)

    with pytest.raises(BackendAPIError) as exc_info:
        client.get_audit("DEC-001")

    assert exc_info.value.error_code == "TIMEOUT"


def test_get_audit_malformed_json_fails_safely():
    client = _client(
        lambda request: httpx.Response(200, content=b"{")
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.get_audit("DEC-001")

    assert exc_info.value.error_code == "INVALID_JSON"


def test_get_audit_rejects_contract_mismatch():
    invalid_record = {
        **AUDIT_RECORD_PAYLOAD,
        "title": "Not part of Contract v1",
    }
    client = _client(
        lambda request: httpx.Response(
            200,
            json={"items": [invalid_record], "next_cursor": None},
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.get_audit("DEC-001")

    assert exc_info.value.error_code == "INVALID_RESPONSE"


@pytest.mark.parametrize(
    "extra_payload",
    [
        {"current_executable_experiment_id": "B"},
        {
            "run_id": "RUN-001",
            "candidate_strategies": [],
            "recommendation": RECOMMENDATION_PAYLOAD,
            "tool_calls": [],
        },
    ],
)
def test_recommendation_response_rejects_legacy_shapes(extra_payload):
    payload = (
        {**RECOMMENDATION_PAYLOAD, **extra_payload}
        if "recommendation" not in extra_payload
        else extra_payload
    )
    client = _client(
        lambda request: httpx.Response(200, json=payload)
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.get_recommendation("DEC-001")

    assert exc_info.value.error_code == "INVALID_RESPONSE"


@pytest.mark.parametrize(
    ("status_code", "error_code"),
    [
        (404, "DECISION_NOT_FOUND"),
        (409, "STATE_VERSION_CONFLICT"),
        (422, "VALIDATION_ERROR"),
    ],
)
def test_persist_recommendation_preserves_backend_errors(
    status_code,
    error_code,
):
    client = _client(
        lambda request: httpx.Response(
            status_code,
            json={
                "error": {
                    "code": error_code,
                    "message": "Recommendation rejected.",
                    "details": {},
                    "request_id": "REQ-recommendation",
                }
            },
        )
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.persist_recommendation(
            _recommendation(),
            idempotency_key="rejected-recommendation",
        )

    assert exc_info.value.status_code == status_code
    assert exc_info.value.error_code == error_code


def test_persist_recommendation_timeout_fails_safely():
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    client = _client(handler)
    with pytest.raises(BackendAPIError) as exc_info:
        client.persist_recommendation(
            _recommendation(),
            idempotency_key="recommendation-timeout",
        )

    assert exc_info.value.error_code == "TIMEOUT"


def test_get_recommendation_malformed_json_fails_safely():
    client = _client(
        lambda request: httpx.Response(200, content=b"{")
    )

    with pytest.raises(BackendAPIError) as exc_info:
        client.get_recommendation("DEC-001")

    assert exc_info.value.error_code == "INVALID_JSON"


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


RUN_PAYLOAD = {
    "id": "RUN-001",
    "decision_id": "DEC-001",
    "run_type": "INITIAL",
    "status": "RUNNING",
    "result": None,
    "trigger_event_id": None,
    "trigger_approval_id": None,
    "input_state_version": 1,
    "recommendation_state_version": None,
    "error": None,
    "created_at": "2026-09-26T08:00:00Z",
    "completed_at": None,
}


def test_claim_decision_run_sends_internal_key_and_parses_claim():
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        captured["key"] = request.headers.get("X-Internal-Service-Key")
        return httpx.Response(
            200,
            json={"run": RUN_PAYLOAD, "goal_id": "GOAL-001"},
        )

    client = BackendClient(
        "http://backend.test",
        internal_service_key="secret",
        client=httpx.Client(
            base_url="http://backend.test",
            transport=httpx.MockTransport(handler),
        ),
    )

    claim = client.claim_decision_run()

    assert captured == {
        "path": "/api/v1/internal/decision-runs/claim",
        "key": "secret",
    }
    assert claim.goal_id == "GOAL-001"
    assert claim.run.id == "RUN-001"


def test_fail_decision_run_truncates_code_and_message():
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        captured["body"] = json.loads(request.content.decode())
        return httpx.Response(
            200,
            json={**RUN_PAYLOAD, "status": "FAILED"},
        )

    client = _client(handler)

    result = client.fail_decision_run(
        "RUN-001",
        code="X" * 100,
        message="m" * 900,
    )

    assert captured["path"] == "/api/v1/internal/decision-runs/RUN-001/fail"
    assert len(captured["body"]["code"]) == 64
    assert len(captured["body"]["message"]) == 500
    assert result.status == "FAILED"
