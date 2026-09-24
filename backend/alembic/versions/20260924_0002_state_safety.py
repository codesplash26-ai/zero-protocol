"""Add idempotency and audit infrastructure.

Revision ID: 20260924_0002
Revises: 20260924_0001
Create Date: 2026-09-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260924_0002"
down_revision: str | None = "20260924_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("scope", sa.String(length=200), nullable=False),
        sa.Column("idempotency_key", sa.String(length=200), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response_body", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope", "idempotency_key", name="uq_idempotency_scope_key"),
    )
    op.create_table(
        "audit_records",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=True),
        sa.Column("goal_id", sa.String(length=64), nullable=True),
        sa.Column("state_version", sa.Integer(), nullable=False),
        sa.Column("tool_calls", sa.JSON(), nullable=False),
        sa.Column("candidate_strategy_ids", sa.JSON(), nullable=False),
        sa.Column("optimization_status", sa.String(length=16), nullable=True),
        sa.Column("recommended_strategy_id", sa.String(length=64), nullable=True),
        sa.Column("approval_id", sa.String(length=64), nullable=True),
        sa.Column("action_receipt_id", sa.String(length=64), nullable=True),
        sa.Column("event_ids", sa.JSON(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("state_version >= 1", name="ck_audit_state_version_positive"),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_audit_records_decision_id"),
        "audit_records",
        ["decision_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_audit_records_goal_id"), "audit_records", ["goal_id"], unique=False
    )
    op.create_index(
        op.f("ix_audit_records_organization_id"),
        "audit_records",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_audit_records_state_version"),
        "audit_records",
        ["state_version"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_records_state_version"), table_name="audit_records")
    op.drop_index(op.f("ix_audit_records_organization_id"), table_name="audit_records")
    op.drop_index(op.f("ix_audit_records_goal_id"), table_name="audit_records")
    op.drop_index(op.f("ix_audit_records_decision_id"), table_name="audit_records")
    op.drop_table("audit_records")
    op.drop_table("idempotency_records")

