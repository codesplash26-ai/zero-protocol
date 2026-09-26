"""Scope candidate strategy identity to its decision.

Strategy IDs are opaque and deterministic (e.g. STRATEGY-A), so two decisions
can legitimately contain the same one. The global primary key on
candidate_strategies.id made a second decision fail with STRATEGY_ID_CONFLICT.
The key becomes (decision_id, id) and every reference carries decision_id.

Revision ID: 20260926_0007
Revises: 20260924_0006
Create Date: 2026-09-26
"""
from collections.abc import Sequence

from alembic import op

revision: str = "20260926_0007"
down_revision: str | None = "20260924_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, strategy column, new composite FK name)
REFERENCES = (
    ("recommendations", "recommended_strategy_id", "fk_recommendations_strategy"),
    ("approvals", "strategy_id", "fk_approvals_strategy"),
    ("action_receipts", "strategy_id", "fk_action_receipts_strategy"),
)

# SQLite reflects these constraints without names; batch mode names them with
# this convention so they can be dropped while the table is recreated.
SQLITE_CONVENTION = {
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def _old_fk_name(table: str, column: str) -> str:
    if op.get_bind().dialect.name == "sqlite":
        return f"fk_{table}_{column}_candidate_strategies"
    return f"{table}_{column}_fkey"  # PostgreSQL default for unnamed FKs


def _old_pk_name() -> str:
    if op.get_bind().dialect.name == "sqlite":
        return "pk_candidate_strategies"
    return "candidate_strategies_pkey"


def upgrade() -> None:
    for table, column, _ in REFERENCES:
        with op.batch_alter_table(table, naming_convention=SQLITE_CONVENTION) as batch_op:
            batch_op.drop_constraint(_old_fk_name(table, column), type_="foreignkey")

    with op.batch_alter_table(
        "candidate_strategies", naming_convention=SQLITE_CONVENTION
    ) as batch_op:
        batch_op.drop_constraint(_old_pk_name(), type_="primary")
        batch_op.create_primary_key("pk_candidate_strategies", ["decision_id", "id"])

    for table, column, fk_name in REFERENCES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.create_foreign_key(
                fk_name,
                "candidate_strategies",
                ["decision_id", column],
                ["decision_id", "id"],
                ondelete="RESTRICT",
            )


def downgrade() -> None:
    # Fails if two decisions share a strategy ID, which the old schema cannot hold.
    for table, _, fk_name in REFERENCES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_constraint(fk_name, type_="foreignkey")

    with op.batch_alter_table("candidate_strategies") as batch_op:
        batch_op.drop_constraint("pk_candidate_strategies", type_="primary")
        batch_op.create_primary_key(_old_pk_name(), ["id"])

    for table, column, _ in REFERENCES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.create_foreign_key(
                _old_fk_name(table, column),
                "candidate_strategies",
                [column],
                ["id"],
                ondelete="RESTRICT",
            )
