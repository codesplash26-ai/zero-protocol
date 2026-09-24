from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError


class APIError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", f"REQ-{uuid4().hex[:8]}")


def _error_body(
    request: Request,
    code: str,
    message: str,
    details: dict[str, Any] | list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": _request_id(request),
        }
    }


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, error: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=_error_body(request, error.code, error.message, error.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        issues = []
        for item in error.errors():
            issues.append(
                {
                    "location": [str(part) for part in item.get("loc", ())],
                    "message": item.get("msg", "Invalid value"),
                    "type": item.get("type", "validation_error"),
                }
            )
        return JSONResponse(
            status_code=422,
            content=_error_body(
                request,
                "VALIDATION_ERROR",
                "The request did not match the API contract.",
                issues,
            ),
        )

    @app.exception_handler(OperationalError)
    async def database_error_handler(
        request: Request, error: OperationalError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content=_error_body(
                request,
                "DATABASE_UNAVAILABLE",
                "The database is temporarily unavailable.",
            ),
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_error_body(
                request,
                "INTERNAL_SERVER_ERROR",
                "The server could not complete the request.",
            ),
        )
