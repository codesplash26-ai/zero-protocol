from __future__ import annotations

import os
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, TypeAdapter, ValidationError

from schemas.models import (
    ActionReceipt,
    AuditRecord,
    CandidateStrategy,
    ConsequenceResult,
    Event,
    EventCreateRequest,
    Experiment,
    FeasibilityResult,
    Goal,
    MaterialityResult,
    OptimizationResult,
    OrganizationState,
    Recommendation,
)

API_PREFIX = "/api/v1"
DEFAULT_TIMEOUT_SECONDS = 5.0


class _AuditTracePage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AuditRecord]
    next_cursor: str | None


class BackendAPIError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        error_code: str | None = None,
        request_id: str | None = None,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.request_id = request_id
        self.details = details


class BackendConfigurationError(BackendAPIError):
    pass


class BackendClient:
    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        internal_service_key: str | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        normalized_base_url = base_url.rstrip("/")

        if not normalized_base_url:
            raise BackendConfigurationError(
                "BACKEND_BASE_URL must be set before "
                "using the backend client.",
                error_code="BACKEND_BASE_URL_MISSING",
            )

        self.base_url = normalized_base_url
        self.internal_service_key = internal_service_key
        self._owns_client = client is None
        self._client = client or httpx.Client(
            base_url=self.base_url,
            timeout=timeout_seconds,
        )

    @classmethod
    def from_env(cls) -> BackendClient:
        return cls(
            os.environ.get(
                "BACKEND_BASE_URL",
                "",
            ),
            internal_service_key=os.environ.get(
                "INTERNAL_SERVICE_KEY"
            ),
        )

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def get_current_state(
        self,
    ) -> OrganizationState:
        payload, status_code, request_id = (
            self._request_json(
                "GET",
                f"{API_PREFIX}/state",
            )
        )

        return self._validate_response(
            OrganizationState,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def get_experiments(
        self,
    ) -> list[Experiment]:
        payload, status_code, request_id = (
            self._request_json(
                "GET",
                f"{API_PREFIX}/experiments",
            )
        )

        return self._validate_experiment_list(
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def get_goal(
        self,
        goal_id: str,
    ) -> Goal:
        payload, status_code, request_id = (
            self._request_json(
                "GET",
                f"{API_PREFIX}/goals/{goal_id}",
            )
        )

        return self._validate_response(
            Goal,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def check_feasibility(
        self,
        strategy: CandidateStrategy,
    ) -> FeasibilityResult:
        payload, status_code, request_id = (
            self._request_json(
                "POST",
                f"{API_PREFIX}/feasibility/check",
                json={
                    "strategy": (
                        strategy.model_dump(
                            mode="json"
                        )
                    )
                },
            )
        )

        return self._validate_response(
            FeasibilityResult,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def calculate_consequences(
        self,
        strategy: CandidateStrategy,
    ) -> ConsequenceResult:
        payload, status_code, request_id = (
            self._request_json(
                "POST",
                (
                    f"{API_PREFIX}/"
                    "consequences/calculate"
                ),
                json={
                    "strategy_id": strategy.id,
                    "experiment_ids": (
                        strategy.experiment_ids
                    ),
                },
            )
        )

        return self._validate_response(
            ConsequenceResult,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def execute_action(
        self,
        *,
        decision_id: str,
        strategy_id: str,
        experiment_id: str,
        approval_id: str,
        expected_state_version: int,
        idempotency_key: str,
    ) -> ActionReceipt:
        payload, status_code, request_id = (
            self._request_json(
                "POST",
                f"{API_PREFIX}/actions/execute",
                json={
                    "decision_id": decision_id,
                    "strategy_id": strategy_id,
                    "experiment_id": experiment_id,
                    "approval_id": approval_id,
                    "expected_state_version": (
                        expected_state_version
                    ),
                },
                headers={
                    "Idempotency-Key": idempotency_key,
                },
            )
        )

        return self._validate_response(
            ActionReceipt,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def create_event(
        self,
        request: EventCreateRequest,
        *,
        idempotency_key: str,
    ) -> Event:
        payload, status_code, request_id = (
            self._request_json(
                "POST",
                f"{API_PREFIX}/events",
                json=request.model_dump(
                    mode="json"
                ),
                headers={
                    "Idempotency-Key": idempotency_key,
                },
            )
        )

        return self._validate_response(
            Event,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def check_materiality(
        self,
        event_id: str,
        *,
        idempotency_key: str,
    ) -> MaterialityResult:
        payload, status_code, request_id = (
            self._request_json(
                "POST",
                (
                    f"{API_PREFIX}/events/"
                    f"{event_id}/materiality"
                ),
                headers={
                    "Idempotency-Key": idempotency_key,
                },
            )
        )

        return self._validate_response(
            MaterialityResult,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def persist_recommendation(
        self,
        recommendation: Recommendation,
        *,
        idempotency_key: str,
    ) -> Recommendation:
        headers = {
            "Idempotency-Key": idempotency_key,
        }
        if self.internal_service_key:
            headers["X-Internal-Service-Key"] = (
                self.internal_service_key
            )
        payload, status_code, request_id = (
            self._request_json(
                "POST",
                f"{API_PREFIX}/recommendations",
                json=recommendation.model_dump(
                    mode="json"
                ),
                headers=headers,
            )
        )

        return self._validate_response(
            Recommendation,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def persist_optimization_result(
        self,
        decision_id: str,
        result: OptimizationResult,
        *,
        idempotency_key: str,
    ) -> OptimizationResult:
        headers = {
            "Idempotency-Key": idempotency_key,
        }
        if self.internal_service_key:
            headers["X-Internal-Service-Key"] = (
                self.internal_service_key
            )
        payload, status_code, request_id = (
            self._request_json(
                "POST",
                f"{API_PREFIX}/optimization-results",
                json={
                    "decision_id": decision_id,
                    "result": result.model_dump(
                        mode="json"
                    ),
                },
                headers=headers,
            )
        )

        return self._validate_response(
            OptimizationResult,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def get_recommendation(
        self,
        decision_id: str,
    ) -> Recommendation:
        payload, status_code, request_id = (
            self._request_json(
                "GET",
                (
                    f"{API_PREFIX}/recommendations/"
                    f"{decision_id}"
                ),
            )
        )

        return self._validate_response(
            Recommendation,
            payload,
            status_code=status_code,
            request_id=request_id,
        )

    def get_audit(
        self,
        decision_id: str,
    ) -> list[AuditRecord]:
        records: list[AuditRecord] = []
        cursor: str | None = None

        while True:
            params: dict[str, str | int] = {
                "limit": 500,
            }
            if cursor is not None:
                params["cursor"] = cursor

            payload, status_code, request_id = (
                self._request_json(
                    "GET",
                    f"{API_PREFIX}/audit/{decision_id}",
                    params=params,
                )
            )
            page = self._validate_response(
                _AuditTracePage,
                payload,
                status_code=status_code,
                request_id=request_id,
            )
            records.extend(page.items)

            if page.next_cursor is None:
                return records
            if page.next_cursor == cursor:
                raise BackendAPIError(
                    "Backend returned a repeated audit cursor.",
                    status_code=status_code,
                    error_code="INVALID_RESPONSE",
                    request_id=request_id,
                )
            cursor = page.next_cursor

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
    ) -> tuple[Any, int, str | None]:
        try:
            response = self._client.request(
                method,
                path,
                json=json,
                headers=headers,
                params=params,
            )

        except httpx.TimeoutException as error:
            raise BackendAPIError(
                "Backend request timed out.",
                error_code="TIMEOUT",
            ) from error

        except httpx.ConnectError as error:
            raise BackendAPIError(
                "Could not connect to backend.",
                error_code="CONNECTION_FAILED",
            ) from error

        except httpx.RequestError as error:
            raise BackendAPIError(
                "Backend request failed.",
                error_code="REQUEST_FAILED",
            ) from error

        if response.status_code < 200 or response.status_code >= 300:
            raise self._error_from_response(
                response
            )

        try:
            return (
                response.json(),
                response.status_code,
                response.headers.get(
                    "X-Request-ID"
                ),
            )

        except ValueError as error:
            raise BackendAPIError(
                "Backend returned malformed JSON.",
                status_code=response.status_code,
                error_code="INVALID_JSON",
                request_id=response.headers.get(
                    "X-Request-ID"
                ),
            ) from error

    def _error_from_response(
        self,
        response: httpx.Response,
    ) -> BackendAPIError:
        request_id = response.headers.get(
            "X-Request-ID"
        )
        code = f"HTTP_{response.status_code}"
        message = (
            "Backend returned HTTP "
            f"{response.status_code}."
        )
        details: Any | None = None

        try:
            payload = response.json()

        except ValueError:
            payload = None

        if isinstance(payload, dict):
            error = payload.get("error")

            if isinstance(error, dict):
                code = str(
                    error.get(
                        "code",
                        code,
                    )
                )
                message = str(
                    error.get(
                        "message",
                        message,
                    )
                )
                details = error.get(
                    "details"
                )
                request_id = (
                    error.get("request_id")
                    or request_id
                )

        return BackendAPIError(
            message,
            status_code=response.status_code,
            error_code=code,
            request_id=request_id,
            details=details,
        )

    def _validate_response(
        self,
        schema: type[BaseModel],
        payload: Any,
        *,
        status_code: int | None = None,
        request_id: str | None = None,
    ) -> Any:
        try:
            return schema.model_validate(
                payload
            )

        except ValidationError as error:
            raise BackendAPIError(
                "Backend response did not match "
                "the API contract.",
                status_code=status_code,
                error_code="INVALID_RESPONSE",
                request_id=request_id,
                details=_validation_error_details(
                    error
                ),
            ) from error

    def _validate_experiment_list(
        self,
        payload: Any,
        *,
        status_code: int | None = None,
        request_id: str | None = None,
    ) -> list[Experiment]:
        try:
            return TypeAdapter(
                list[Experiment]
            ).validate_python(payload)

        except ValidationError as error:
            raise BackendAPIError(
                "Backend response did not match "
                "the API contract.",
                status_code=status_code,
                error_code="INVALID_RESPONSE",
                request_id=request_id,
                details=_validation_error_details(
                    error
                ),
            ) from error


def _validation_error_details(
    error: ValidationError,
) -> list[dict[str, Any]]:
    return [
        {
            key: value
            for key, value in item.items()
            if key != "input"
        }
        for item in error.errors()
    ]


_backend_client: BackendClient | None = None


def get_backend_client() -> BackendClient:
    global _backend_client

    if _backend_client is None:
        _backend_client = (
            BackendClient.from_env()
        )

    return _backend_client


def reset_backend_client() -> None:
    global _backend_client

    if _backend_client is not None:
        _backend_client.close()

    _backend_client = None
