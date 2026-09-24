from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


goal_protected_commitments = Table(
    "goal_protected_commitments",
    Base.metadata,
    Column("goal_id", ForeignKey("goals.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "commitment_id",
        ForeignKey("commitments.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    states: Mapped[list[OrganizationState]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )


class OrganizationState(Base):
    __tablename__ = "organization_states"
    __table_args__ = (
        CheckConstraint("budget_usd >= 0", name="ck_state_budget_nonnegative"),
        CheckConstraint(
            "engineering_capacity_hours >= 0",
            name="ck_state_engineering_capacity_nonnegative",
        ),
        CheckConstraint(
            "reserved_engineering_hours >= 0",
            name="ck_state_reserved_engineering_nonnegative",
        ),
        CheckConstraint(
            "available_engineering_hours >= 0",
            name="ck_state_available_engineering_nonnegative",
        ),
        CheckConstraint(
            "engineering_capacity_hours = reserved_engineering_hours + available_engineering_hours",
            name="ck_state_engineering_balance",
        ),
        CheckConstraint("eligible_traffic >= 0", name="ck_state_traffic_nonnegative"),
        CheckConstraint(
            "approval_threshold_usd >= 0", name="ck_state_threshold_nonnegative"
        ),
        CheckConstraint("state_version >= 1", name="ck_state_version_positive"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True
    )
    state_version: Mapped[int] = mapped_column(Integer, primary_key=True)
    budget_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    engineering_capacity_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_engineering_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    available_engineering_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    eligible_traffic: Mapped[int] = mapped_column(Integer, nullable=False)
    approval_threshold_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    organization: Mapped[Organization] = relationship(back_populates="states")


class Commitment(Base):
    __tablename__ = "commitments"
    __table_args__ = (
        CheckConstraint(
            "reserved_engineering_hours >= 0",
            name="ck_commitment_reserved_hours_nonnegative",
        ),
        CheckConstraint(
            "priority IN ('CRITICAL', 'HIGH', 'MEDIUM')",
            name="ck_commitment_priority_allowed",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    reserved_engineering_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    priority: Mapped[str] = mapped_column(String(16), nullable=False)
    protected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("horizon_weeks > 0", name="ck_goal_horizon_positive"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    horizon_weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    protected_commitments: Mapped[list[Commitment]] = relationship(
        secondary=goal_protected_commitments, lazy="selectin"
    )


class Experiment(Base):
    __tablename__ = "experiments"
    __table_args__ = (
        CheckConstraint("cost_usd >= 0", name="ck_experiment_cost_nonnegative"),
        CheckConstraint(
            "engineering_hours >= 0", name="ck_experiment_engineering_nonnegative"
        ),
        CheckConstraint(
            "traffic_required >= 0", name="ck_experiment_traffic_nonnegative"
        ),
        CheckConstraint(
            "status IN ('PROPOSED', 'APPROVED', 'RUNNING', 'COMPLETED', 'REJECTED')",
            name="ck_experiment_status_allowed",
        ),
        CheckConstraint(
            "outcome IN ('PENDING', 'SUCCESS', 'FAILURE')",
            name="ck_experiment_outcome_allowed",
        ),
        CheckConstraint(
            "status <> 'COMPLETED' OR outcome IN ('SUCCESS', 'FAILURE')",
            name="ck_experiment_completed_has_outcome",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    cost_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    engineering_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    traffic_required: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    decision_role: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    dependency_links: Mapped[list[ExperimentDependency]] = relationship(
        foreign_keys="ExperimentDependency.experiment_id",
        back_populates="experiment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ExperimentDependency(Base):
    __tablename__ = "experiment_dependencies"
    __table_args__ = (
        ForeignKeyConstraint(
            ["experiment_id"], ["experiments.id"], ondelete="CASCADE"
        ),
        ForeignKeyConstraint(
            ["dependency_id"], ["experiments.id"], ondelete="RESTRICT"
        ),
        CheckConstraint(
            "experiment_id <> dependency_id", name="ck_experiment_not_self_dependent"
        ),
        UniqueConstraint(
            "experiment_id", "dependency_id", name="uq_experiment_dependency"
        ),
    )

    experiment_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    dependency_id: Mapped[str] = mapped_column(String(64), primary_key=True)

    experiment: Mapped[Experiment] = relationship(
        foreign_keys=[experiment_id], back_populates="dependency_links"
    )
    dependency: Mapped[Experiment] = relationship(foreign_keys=[dependency_id])


class EvidenceItem(Base):
    __tablename__ = "evidence_items"
    __table_args__ = (
        CheckConstraint(
            "quality IN ('HIGH', 'MEDIUM', 'LOW')",
            name="ck_evidence_quality_allowed",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    goal_id: Mapped[str | None] = mapped_column(
        ForeignKey("goals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    experiment_id: Mapped[str | None] = mapped_column(
        ForeignKey("experiments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    quality: Mapped[str] = mapped_column(String(16), nullable=False)
    relevance: Mapped[str | None] = mapped_column(Text, nullable=True)
    retrieved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    freshness: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trust_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    conflicts: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
