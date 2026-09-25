from __future__ import annotations

import os
from typing import Any

import httpx
from pydantic import BaseModel, TypeAdapter, ValidationError

from schemas.models import (
    CandidateStrategy,
    ConsequenceResult,
    Experiment,
    FeasibilityResult,
    Goal,
    OrganizationState,
)


API_PREFIX = "/api/v1"
DEFAULT_TIMEOUT_SECONDS = 5.0


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
            )
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

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> tuple[Any, int, str | None]:
        try:
            response = self._client.request(
                method,
                path,
                json=json,
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
