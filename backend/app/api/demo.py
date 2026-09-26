from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.errors import APIError
from app.repositories import get_current_state
from app.schemas import DemoResetResult
from app.services.demo import reset_demo_data

router = APIRouter()


@router.post("/demo/reset", response_model=DemoResetResult)
def reset_demo(
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DemoResetResult:
    """Restore the seeded PulseBoard scenario. Only available when DEMO_MODE is on."""
    if not settings.demo_mode:
        raise APIError(
            403,
            "DEMO_MODE_DISABLED",
            "Demo reset is only available when DEMO_MODE is enabled.",
        )
    reset_demo_data(session)
    state = get_current_state(session, settings.default_organization_id)
    return DemoResetResult(status="reset", state_version=state.state_version)
