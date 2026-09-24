"""Add approval governance and controlled action receipts.

Revision ID: 20260924_0004
Revises: 20260924_0003
Create Date: 2026-09-24
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260924_0004"
down_revision: str | None = "20260924_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "approvals",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("strategy_id", sa.String(length=64), nullable=False),
        sa.Column("experiment_id", sa.String(length=64), nullable=False),
        sa.Column("action_type", sa.String(length=32), nullable=False),
        sa.Column("decision", sa.String(length=16), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("threshold_usd", sa.Integer(), nullable=False),
        sa.Column("authorized_cost_usd", sa.Integer(), nullable=False),
        sa.Column("authorized_engineering_hours", sa.Integer(), nullable=False),
        sa.Column("authorized_traffic", sa.Integer(), nullable=False),
        sa.Column("state_version", sa.Integer(), nullable=False),
        sa.Column("requested_by", sa.String(length=200), nullable=False),
        sa.Column("decided_by", sa.String(length=200), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "action_type IN ('START_EXPERIMENT')",
            name="ck_approval_action_type_allowed",
        ),
        sa.CheckConstraint(
            "decision IN ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'INVALIDATED')",
            name="ck_approval_decision_allowed",
        ),
        sa.CheckConstraint("threshold_usd >= 0", name="ck_approval_threshold_nonnegative"),
        sa.CheckConstraint("authorized_cost_usd >= 0", name="ck_approval_cost_nonnegative"),
        sa.CheckConstraint(
            "authorized_engineering_hours >= 0",
            name="ck_approval_engineering_nonnegative",
        ),
        sa.CheckConstraint("authorized_traffic >= 0", name="ck_approval_traffic_nonnegative"),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["experiment_id"], ["experiments.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["strategy_id"], ["candidate_strategies.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "decision_id",
            "strategy_id",
            "experiment_id",
            "action_type",
            "state_version",
            name="uq_approval_scope_state",
        ),
    )
    for column in (
        "decision_id",
        "strategy_id",
        "experiment_id",
        "decision",
        "state_version",
    ):
        op.create_index(op.f(f"ix_approvals_{column}"), "approvals", [column])

    op.create_table(
        "action_receipts",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("approval_id", sa.String(length=64), nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("strategy_id", sa.String(length=64), nullable=False),
        sa.Column("experiment_id", sa.String(length=64), nullable=False),
        sa.Column("previous_status", sa.String(length=16), nullable=False),
        sa.Column("new_status", sa.String(length=16), nullable=False),
        sa.Column("budget_reserved_usd", sa.Integer(), nullable=False),
        sa.Column("engineering_reserved_hours", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("state_version", sa.Integer(), nullable=False),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=200), nullable=False),
        sa.CheckConstraint(
            "status IN ('SUCCESS', 'FAILED', 'PENDING')",
            name="ck_action_receipt_status_allowed",
        ),
        sa.CheckConstraint("budget_reserved_usd >= 0", name="ck_receipt_budget_nonnegative"),
        sa.CheckConstraint(
            "engineering_reserved_hours >= 0",
            name="ck_receipt_engineering_nonnegative",
        ),
        sa.ForeignKeyConstraint(["approval_id"], ["approvals.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["experiment_id"], ["experiments.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["strategy_id"], ["candidate_strategies.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("approval_id", name="uq_action_receipt_approval"),
    )
    for column in ("approval_id", "decision_id", "experiment_id", "state_version"):
        op.create_index(op.f(f"ix_action_receipts_{column}"), "action_receipts", [column])


def downgrade() -> None:
    for column in ("state_version", "experiment_id", "decision_id", "approval_id"):
        op.drop_index(op.f(f"ix_action_receipts_{column}"), table_name="action_receipts")
    op.drop_table("action_receipts")
    for column in (
        "state_version",
        "decision",
        "experiment_id",
        "strategy_id",
        "decision_id",
    ):
        op.drop_index(op.f(f"ix_approvals_{column}"), table_name="approvals")
    op.drop_table("approvals")
