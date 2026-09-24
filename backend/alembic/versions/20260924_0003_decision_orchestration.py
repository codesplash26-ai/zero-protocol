"""Add decision orchestration persistence.

Revision ID: 20260924_0003
Revises: 20260924_0002
Create Date: 2026-09-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260924_0003"
down_revision: str | None = "20260924_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "decisions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("goal_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_decisions_goal_id"), "decisions", ["goal_id"], unique=False)
    op.create_index(
        op.f("ix_decisions_organization_id"),
        "decisions",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "decision_runs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("run_type", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("result", sa.String(length=32), nullable=True),
        sa.Column("trigger_event_id", sa.String(length=64), nullable=True),
        sa.Column("trigger_approval_id", sa.String(length=64), nullable=True),
        sa.Column("input_state_version", sa.Integer(), nullable=False),
        sa.Column("recommendation_state_version", sa.Integer(), nullable=True),
        sa.Column("error", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "run_type IN ('INITIAL', 'MATERIAL_EVENT', 'APPROVAL_REPLAN_REQUEST')",
            name="ck_decision_run_type_allowed",
        ),
        sa.CheckConstraint(
            "status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')",
            name="ck_decision_run_status_allowed",
        ),
        sa.CheckConstraint(
            "result IS NULL OR result IN "
            "('NEW_RECOMMENDATION', 'PRESERVED', 'REPLANNED', 'NO_ACTION')",
            name="ck_decision_run_result_allowed",
        ),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_decision_runs_decision_id"),
        "decision_runs",
        ["decision_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_decision_runs_status"), "decision_runs", ["status"], unique=False
    )
    op.create_table(
        "candidate_strategies",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("experiment_ids", sa.JSON(), nullable=False),
        sa.Column("sequence", sa.JSON(), nullable=False),
        sa.Column("conditional", sa.Boolean(), nullable=False),
        sa.Column("condition", sa.Text(), nullable=True),
        sa.Column("feasibility", sa.JSON(), nullable=False),
        sa.Column("consequences", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_candidate_strategies_decision_id"),
        "candidate_strategies",
        ["decision_id"],
        unique=False,
    )
    op.create_table(
        "solver_runs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("selected_experiment_ids", sa.JSON(), nullable=False),
        sa.Column("feasible_combinations", sa.JSON(), nullable=False),
        sa.Column("objective_value", sa.Float(), nullable=True),
        sa.Column("evaluated_state_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'UNKNOWN')",
            name="ck_solver_status_allowed",
        ),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_solver_runs_decision_id"),
        "solver_runs",
        ["decision_id"],
        unique=False,
    )
    op.create_table(
        "recommendations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("recommended_strategy_id", sa.String(length=64), nullable=False),
        sa.Column("current_executable_experiment_id", sa.String(length=64), nullable=True),
        sa.Column("now", sa.JSON(), nullable=False),
        sa.Column("next", sa.JSON(), nullable=False),
        sa.Column("later", sa.JSON(), nullable=False),
        sa.Column("defer", sa.JSON(), nullable=False),
        sa.Column("reasoning_summary", sa.Text(), nullable=False),
        sa.Column("requires_approval", sa.Boolean(), nullable=False),
        sa.Column("state_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["current_executable_experiment_id"], ["experiments.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["recommended_strategy_id"], ["candidate_strategies.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "decision_id", "state_version", name="uq_recommendation_decision_state"
        ),
    )
    op.create_index(
        op.f("ix_recommendations_decision_id"),
        "recommendations",
        ["decision_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_recommendations_decision_id"), table_name="recommendations")
    op.drop_table("recommendations")
    op.drop_index(op.f("ix_solver_runs_decision_id"), table_name="solver_runs")
    op.drop_table("solver_runs")
    op.drop_index(
        op.f("ix_candidate_strategies_decision_id"), table_name="candidate_strategies"
    )
    op.drop_table("candidate_strategies")
    op.drop_index(op.f("ix_decision_runs_status"), table_name="decision_runs")
    op.drop_index(op.f("ix_decision_runs_decision_id"), table_name="decision_runs")
    op.drop_table("decision_runs")
    op.drop_index(op.f("ix_decisions_organization_id"), table_name="decisions")
    op.drop_index(op.f("ix_decisions_goal_id"), table_name="decisions")
    op.drop_table("decisions")
