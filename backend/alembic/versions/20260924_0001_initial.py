"""Create Phase 0 and Phase 1 persistence tables.

Revision ID: 20260924_0001
Revises:
Create Date: 2026-09-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260924_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "organization_states",
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("state_version", sa.Integer(), nullable=False),
        sa.Column("budget_usd", sa.Integer(), nullable=False),
        sa.Column("engineering_capacity_hours", sa.Integer(), nullable=False),
        sa.Column("reserved_engineering_hours", sa.Integer(), nullable=False),
        sa.Column("available_engineering_hours", sa.Integer(), nullable=False),
        sa.Column("eligible_traffic", sa.Integer(), nullable=False),
        sa.Column("approval_threshold_usd", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("budget_usd >= 0", name="ck_state_budget_nonnegative"),
        sa.CheckConstraint(
            "engineering_capacity_hours >= 0",
            name="ck_state_engineering_capacity_nonnegative",
        ),
        sa.CheckConstraint(
            "reserved_engineering_hours >= 0",
            name="ck_state_reserved_engineering_nonnegative",
        ),
        sa.CheckConstraint(
            "available_engineering_hours >= 0",
            name="ck_state_available_engineering_nonnegative",
        ),
        sa.CheckConstraint(
            "engineering_capacity_hours = reserved_engineering_hours + available_engineering_hours",
            name="ck_state_engineering_balance",
        ),
        sa.CheckConstraint("eligible_traffic >= 0", name="ck_state_traffic_nonnegative"),
        sa.CheckConstraint(
            "approval_threshold_usd >= 0", name="ck_state_threshold_nonnegative"
        ),
        sa.CheckConstraint("state_version >= 1", name="ck_state_version_positive"),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("organization_id", "state_version"),
    )
    op.create_table(
        "commitments",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("reserved_engineering_hours", sa.Integer(), nullable=False),
        sa.Column("priority", sa.String(length=16), nullable=False),
        sa.Column("protected", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "reserved_engineering_hours >= 0",
            name="ck_commitment_reserved_hours_nonnegative",
        ),
        sa.CheckConstraint(
            "priority IN ('CRITICAL', 'HIGH', 'MEDIUM')",
            name="ck_commitment_priority_allowed",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_commitments_organization_id"),
        "commitments",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "goals",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("horizon_weeks", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("horizon_weeks > 0", name="ck_goal_horizon_positive"),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_goals_organization_id"), "goals", ["organization_id"], unique=False
    )
    op.create_table(
        "experiments",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("cost_usd", sa.Integer(), nullable=False),
        sa.Column("engineering_hours", sa.Integer(), nullable=False),
        sa.Column("traffic_required", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("outcome", sa.String(length=16), nullable=False),
        sa.Column("decision_role", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("cost_usd >= 0", name="ck_experiment_cost_nonnegative"),
        sa.CheckConstraint(
            "engineering_hours >= 0", name="ck_experiment_engineering_nonnegative"
        ),
        sa.CheckConstraint(
            "traffic_required >= 0", name="ck_experiment_traffic_nonnegative"
        ),
        sa.CheckConstraint(
            "status IN ('PROPOSED', 'APPROVED', 'RUNNING', 'COMPLETED', 'REJECTED')",
            name="ck_experiment_status_allowed",
        ),
        sa.CheckConstraint(
            "outcome IN ('PENDING', 'SUCCESS', 'FAILURE')",
            name="ck_experiment_outcome_allowed",
        ),
        sa.CheckConstraint(
            "status <> 'COMPLETED' OR outcome IN ('SUCCESS', 'FAILURE')",
            name="ck_experiment_completed_has_outcome",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_experiments_organization_id"),
        "experiments",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "goal_protected_commitments",
        sa.Column("goal_id", sa.String(length=64), nullable=False),
        sa.Column("commitment_id", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["commitment_id"], ["commitments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("goal_id", "commitment_id"),
    )
    op.create_table(
        "experiment_dependencies",
        sa.Column("experiment_id", sa.String(length=64), nullable=False),
        sa.Column("dependency_id", sa.String(length=64), nullable=False),
        sa.CheckConstraint(
            "experiment_id <> dependency_id", name="ck_experiment_not_self_dependent"
        ),
        sa.ForeignKeyConstraint(["dependency_id"], ["experiments.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["experiment_id"], ["experiments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("experiment_id", "dependency_id"),
        sa.UniqueConstraint(
            "experiment_id", "dependency_id", name="uq_experiment_dependency"
        ),
    )
    op.create_table(
        "evidence_items",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("goal_id", sa.String(length=64), nullable=True),
        sa.Column("experiment_id", sa.String(length=64), nullable=True),
        sa.Column("source", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("quality", sa.String(length=16), nullable=False),
        sa.Column("relevance", sa.Text(), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("freshness", sa.String(length=64), nullable=True),
        sa.Column("trust_level", sa.String(length=64), nullable=True),
        sa.Column("conflicts", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "quality IN ('HIGH', 'MEDIUM', 'LOW')",
            name="ck_evidence_quality_allowed",
        ),
        sa.ForeignKeyConstraint(["experiment_id"], ["experiments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_evidence_items_experiment_id"),
        "evidence_items",
        ["experiment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_evidence_items_goal_id"),
        "evidence_items",
        ["goal_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_evidence_items_organization_id"),
        "evidence_items",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_evidence_items_organization_id"), table_name="evidence_items")
    op.drop_index(op.f("ix_evidence_items_goal_id"), table_name="evidence_items")
    op.drop_index(op.f("ix_evidence_items_experiment_id"), table_name="evidence_items")
    op.drop_table("evidence_items")
    op.drop_table("experiment_dependencies")
    op.drop_table("goal_protected_commitments")
    op.drop_index(op.f("ix_experiments_organization_id"), table_name="experiments")
    op.drop_table("experiments")
    op.drop_index(op.f("ix_goals_organization_id"), table_name="goals")
    op.drop_table("goals")
    op.drop_index(op.f("ix_commitments_organization_id"), table_name="commitments")
    op.drop_table("commitments")
    op.drop_table("organization_states")
    op.drop_table("organizations")
