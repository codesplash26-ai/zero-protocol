"""Add event adaptation and materiality persistence.

Revision ID: 20260924_0005
Revises: 20260924_0004
Create Date: 2026-09-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260924_0005"
down_revision: str | None = "20260924_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("recommendations") as batch_op:
        batch_op.drop_constraint(
            "uq_recommendation_decision_state", type_="unique"
        )

    op.create_table(
        "events",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("engineering_delta_hours", sa.Integer(), nullable=False),
        sa.Column("budget_delta_usd", sa.Integer(), nullable=False),
        sa.Column("experiment_id", sa.String(length=64), nullable=True),
        sa.Column("experiment_outcome", sa.String(length=16), nullable=True),
        sa.Column("commitment_id", sa.String(length=64), nullable=True),
        sa.Column("source", sa.String(length=200), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("state_version", sa.Integer(), nullable=False),
        sa.Column("changes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "event_type IN ('EXPERIMENT_RESULT', 'CAPACITY_CHANGE', "
            "'BUDGET_CHANGE', 'DEPENDENCY_CHANGE', 'COMMITMENT_CHANGE')",
            name="ck_event_type_allowed",
        ),
        sa.CheckConstraint(
            "state_version >= 1", name="ck_event_state_version_positive"
        ),
        sa.ForeignKeyConstraint(
            ["commitment_id"], ["commitments.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["experiment_id"], ["experiments.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "organization_id",
        "event_type",
        "experiment_id",
        "commitment_id",
        "occurred_at",
        "state_version",
    ):
        op.create_index(op.f(f"ix_events_{column}"), "events", [column])

    op.create_table(
        "materiality_results",
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("potentially_material", sa.Boolean(), nullable=False),
        sa.Column("affected_fields", sa.JSON(), nullable=False),
        sa.Column("reasons", sa.JSON(), nullable=False),
        sa.Column("state_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_index(
        op.f("ix_materiality_results_potentially_material"),
        "materiality_results",
        ["potentially_material"],
    )
    op.create_index(
        op.f("ix_materiality_results_state_version"),
        "materiality_results",
        ["state_version"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_materiality_results_state_version"),
        table_name="materiality_results",
    )
    op.drop_index(
        op.f("ix_materiality_results_potentially_material"),
        table_name="materiality_results",
    )
    op.drop_table("materiality_results")
    for column in (
        "state_version",
        "occurred_at",
        "commitment_id",
        "experiment_id",
        "event_type",
        "organization_id",
    ):
        op.drop_index(op.f(f"ix_events_{column}"), table_name="events")
    op.drop_table("events")
    with op.batch_alter_table("recommendations") as batch_op:
        batch_op.create_unique_constraint(
            "uq_recommendation_decision_state", ["decision_id", "state_version"]
        )
