from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database import Base
from app.seed import seed_pulseboard


def reset_demo_data(session: Session) -> None:
    """Restore the PulseBoard starting point (state v1) in one transaction.

    Deletes every row, children before parents, then re-applies the seed, which
    commits. Idempotency records go too, so replayed keys cannot resurrect old
    responses. A run the agent is still working on disappears with its
    decision; the worker's next call gets a 404 and it moves on.
    """
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(delete(table))
    session.flush()
    seed_pulseboard(session)
