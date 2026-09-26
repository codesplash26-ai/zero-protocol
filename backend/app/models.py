from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    LargeBinary,
    PrimaryKeyConstraint,
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


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        UniqueConstraint("scope", "idempotency_key", name="uq_idempotency_scope_key"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    scope: Mapped[str] = mapped_column(String(200), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_body: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class AuditRecord(Base):
    __tablename__ = "audit_records"
    __table_args__ = (
        CheckConstraint("state_version >= 1", name="ck_audit_state_version_positive"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    decision_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    goal_id: Mapped[str | None] = mapped_column(
        ForeignKey("goals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    state_version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tool_calls: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    candidate_strategy_ids: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    optimization_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    recommended_strategy_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    approval_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    action_receipt_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    goal_id: Mapped[str] = mapped_column(
        ForeignKey("goals.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class DecisionRun(Base):
    __tablename__ = "decision_runs"
    __table_args__ = (
        CheckConstraint(
            "run_type IN ('INITIAL', 'MATERIAL_EVENT', 'APPROVAL_REPLAN_REQUEST')",
            name="ck_decision_run_type_allowed",
        ),
        CheckConstraint(
            "status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')",
            name="ck_decision_run_status_allowed",
        ),
        CheckConstraint(
            "result IS NULL OR result IN "
            "('NEW_RECOMMENDATION', 'PRESERVED', 'REPLANNED', 'NO_ACTION')",
            name="ck_decision_run_result_allowed",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    decision_id: Mapped[str] = mapped_column(
        ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    result: Mapped[str | None] = mapped_column(String(32), nullable=True)
    trigger_event_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trigger_approval_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    input_state_version: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation_state_version: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    error: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class CandidateStrategyRecord(Base):
    __tablename__ = "candidate_strategies"
    # Strategy IDs are opaque and only unique within one decision: separate
    # decisions may each contain an equivalent strategy such as STRATEGY-A.
    __table_args__ = (
        PrimaryKeyConstraint("decision_id", "id", name="pk_candidate_strategies"),
    )

    id: Mapped[str] = mapped_column(String(64))
    decision_id: Mapped[str] = mapped_column(
        ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    experiment_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    sequence: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    conditional: Mapped[bool] = mapped_column(Boolean, nullable=False)
    condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    feasibility: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    consequences: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class SolverRun(Base):
    __tablename__ = "solver_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'UNKNOWN')",
            name="ck_solver_status_allowed",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    decision_id: Mapped[str] = mapped_column(
        ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    selected_experiment_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    feasible_combinations: Mapped[list[list[str]]] = mapped_column(JSON, nullable=False)
    objective_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    evaluated_state_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class RecommendationRecord(Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["decision_id", "recommended_strategy_id"],
            ["candidate_strategies.decision_id", "candidate_strategies.id"],
            ondelete="RESTRICT",
            name="fk_recommendations_strategy",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    decision_id: Mapped[str] = mapped_column(
        ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recommended_strategy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    current_executable_experiment_id: Mapped[str | None] = mapped_column(
        ForeignKey("experiments.id", ondelete="RESTRICT"), nullable=True
    )
    now: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    next: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    later: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    defer: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    reasoning_summary: Mapped[str] = mapped_column(Text, nullable=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False)
    state_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class ApprovalRecord(Base):
    __tablename__ = "approvals"
    __table_args__ = (
        CheckConstraint(
            "action_type IN ('START_EXPERIMENT')",
            name="ck_approval_action_type_allowed",
        ),
        CheckConstraint(
            "decision IN ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'INVALIDATED')",
            name="ck_approval_decision_allowed",
        ),
        CheckConstraint("threshold_usd >= 0", name="ck_approval_threshold_nonnegative"),
        CheckConstraint("authorized_cost_usd >= 0", name="ck_approval_cost_nonnegative"),
        CheckConstraint(
            "authorized_engineering_hours >= 0",
            name="ck_approval_engineering_nonnegative",
        ),
        CheckConstraint("authorized_traffic >= 0", name="ck_approval_traffic_nonnegative"),
        UniqueConstraint(
            "decision_id",
            "strategy_id",
            "experiment_id",
            "action_type",
            "state_version",
            name="uq_approval_scope_state",
        ),
        ForeignKeyConstraint(
            ["decision_id", "strategy_id"],
            ["candidate_strategies.decision_id", "candidate_strategies.id"],
            ondelete="RESTRICT",
            name="fk_approvals_strategy",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    decision_id: Mapped[str] = mapped_column(
        ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    strategy_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    experiment_id: Mapped[str] = mapped_column(
        ForeignKey("experiments.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    action_type: Mapped[str] = mapped_column(String(32), nullable=False)
    decision: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    threshold_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    authorized_cost_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    authorized_engineering_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    authorized_traffic: Mapped[int] = mapped_column(Integer, nullable=False)
    state_version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    requested_by: Mapped[str] = mapped_column(String(200), nullable=False)
    decided_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ActionReceiptRecord(Base):
    __tablename__ = "action_receipts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('SUCCESS', 'FAILED', 'PENDING')",
            name="ck_action_receipt_status_allowed",
        ),
        CheckConstraint("budget_reserved_usd >= 0", name="ck_receipt_budget_nonnegative"),
        CheckConstraint(
            "engineering_reserved_hours >= 0",
            name="ck_receipt_engineering_nonnegative",
        ),
        UniqueConstraint("approval_id", name="uq_action_receipt_approval"),
        ForeignKeyConstraint(
            ["decision_id", "strategy_id"],
            ["candidate_strategies.decision_id", "candidate_strategies.id"],
            ondelete="RESTRICT",
            name="fk_action_receipts_strategy",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    approval_id: Mapped[str] = mapped_column(
        ForeignKey("approvals.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    decision_id: Mapped[str] = mapped_column(
        ForeignKey("decisions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    strategy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    experiment_id: Mapped[str] = mapped_column(
        ForeignKey("experiments.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    previous_status: Mapped[str] = mapped_column(String(16), nullable=False)
    new_status: Mapped[str] = mapped_column(String(16), nullable=False)
    budget_reserved_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    engineering_reserved_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    state_version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)


class EventRecord(Base):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint(
            "event_type IN ('EXPERIMENT_RESULT', 'CAPACITY_CHANGE', "
            "'BUDGET_CHANGE', 'DEPENDENCY_CHANGE', 'COMMITMENT_CHANGE')",
            name="ck_event_type_allowed",
        ),
        CheckConstraint("state_version >= 1", name="ck_event_state_version_positive"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    engineering_delta_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    budget_delta_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    experiment_id: Mapped[str | None] = mapped_column(
        ForeignKey("experiments.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    experiment_outcome: Mapped[str | None] = mapped_column(String(16), nullable=True)
    commitment_id: Mapped[str | None] = mapped_column(
        ForeignKey("commitments.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    source: Mapped[str] = mapped_column(String(200), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    state_version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    changes: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class MaterialityRecord(Base):
    __tablename__ = "materiality_results"

    event_id: Mapped[str] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    potentially_material: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)
    affected_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    reasons: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    state_version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class ExperimentImportRecord(Base):
    __tablename__ = "experiment_imports"
    __table_args__ = (
        CheckConstraint(
            "status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CONFIRMED')",
            name="ck_experiment_import_status_allowed",
        ),
        CheckConstraint(
            "source_type IN ('TEXT', 'PDF', 'DOCX', 'TXT')",
            name="ck_experiment_import_source_type_allowed",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_blob: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    source_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    draft: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    confirmed_experiment_id: Mapped[str | None] = mapped_column(
        ForeignKey("experiments.id", ondelete="RESTRICT"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
