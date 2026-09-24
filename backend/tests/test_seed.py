from sqlalchemy import func, select

from app.models import Experiment, Organization, OrganizationState
from app.seed import seed_pulseboard


def test_pulseboard_seed_is_idempotent(session_factory):
    with session_factory() as session:
        seed_pulseboard(session)
        seed_pulseboard(session)

        assert session.scalar(select(func.count()).select_from(Organization)) == 1
        assert session.scalar(select(func.count()).select_from(OrganizationState)) == 1
        assert session.scalar(select(func.count()).select_from(Experiment)) == 3

