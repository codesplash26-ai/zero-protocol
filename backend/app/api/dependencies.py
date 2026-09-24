from fastapi import Depends, Header

from app.config import Settings, get_settings
from app.errors import APIError


def require_internal_service(
    internal_key: str = Header(alias="X-Internal-Service-Key"),
    settings: Settings = Depends(get_settings),
) -> None:
    if internal_key != settings.internal_service_key:
        raise APIError(
            401,
            "INTERNAL_AUTH_FAILED",
            "The internal service credential is invalid.",
        )

