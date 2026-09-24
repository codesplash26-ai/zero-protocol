"""Add experiment import jobs and draft intake persistence.

Revision ID: 20260924_0006
Revises: 20260924_0005
Create Date: 2026-09-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260924_0006"
down_revision: str | None = "20260924_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "experiment_imports",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("source_name", sa.String(length=255), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("source_blob", sa.LargeBinary(), nullable=True),
        sa.Column("source_sha256", sa.String(length=64), nullable=False),
        sa.Column("draft", sa.JSON(), nullable=True),
        sa.Column("error", sa.JSON(), nullable=True),
        sa.Column("confirmed_experiment_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CONFIRMED')",
            name="ck_experiment_import_status_allowed",
        ),
        sa.CheckConstraint(
            "source_type IN ('TEXT', 'PDF', 'DOCX', 'TXT')",
            name="ck_experiment_import_source_type_allowed",
        ),
        sa.ForeignKeyConstraint(
            ["confirmed_experiment_id"], ["experiments.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_experiment_imports_organization_id"),
        "experiment_imports",
        ["organization_id"],
    )
    op.create_index(
        op.f("ix_experiment_imports_status"),
        "experiment_imports",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_experiment_imports_status"), table_name="experiment_imports"
    )
    op.drop_index(
        op.f("ix_experiment_imports_organization_id"),
        table_name="experiment_imports",
    )
    op.drop_table("experiment_imports")
