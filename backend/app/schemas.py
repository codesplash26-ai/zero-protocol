from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class ExperimentStatus(StrEnum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class ExperimentOutcome(StrEnum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class EvidenceQuality(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class CommitmentPriority(StrEnum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"


class OrganizationState(StrictModel):
    organization_id: str
    organization_name: str
    budget_usd: int = Field(ge=0)
    engineering_capacity_hours: int = Field(ge=0)
    reserved_engineering_hours: int = Field(ge=0)
    available_engineering_hours: int = Field(ge=0)
    eligible_traffic: int = Field(ge=0)
    approval_threshold_usd: int = Field(ge=0)
    state_version: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_engineering_balance(self) -> OrganizationState:
        expected = self.engineering_capacity_hours - self.reserved_engineering_hours
        if expected != self.available_engineering_hours:
            raise ValueError(
                "available_engineering_hours must equal engineering_capacity_hours "
                "minus reserved_engineering_hours"
            )
        return self


class Goal(StrictModel):
    id: str
    text: str
    horizon_weeks: int = Field(gt=0)
    protected_commitments: list[str]


class Commitment(StrictModel):
    id: str
    name: str
    reserved_engineering_hours: int = Field(ge=0)
    priority: CommitmentPriority
    protected: bool
    notes: str | None
    updated_at: datetime


class Experiment(StrictModel):
    id: str
    name: str
    cost_usd: int = Field(ge=0)
    engineering_hours: int = Field(ge=0)
    traffic_required: int = Field(ge=0)
    dependencies: list[str]
    status: ExperimentStatus
    outcome: ExperimentOutcome
    decision_role: str | None

    @model_validator(mode="after")
    def validate_completed_outcome(self) -> Experiment:
        if self.status is ExperimentStatus.COMPLETED and self.outcome is ExperimentOutcome.PENDING:
            raise ValueError("COMPLETED experiments require SUCCESS or FAILURE")
        return self


class EvidenceItem(StrictModel):
    id: str
    source: str
    content: str
    quality: EvidenceQuality
    relevance: str | None = None
    retrieved_at: datetime | None = None
    freshness: str | None = None
    trust_level: str | None = None
    conflicts: list[str] = Field(default_factory=list)


class CandidateStrategy(StrictModel):
    id: str
    experiment_ids: list[str]
    sequence: list[str]
    conditional: bool
    condition: str | None


class FeasibilityCheckRequest(StrictModel):
    strategy: CandidateStrategy


class ConsequenceCalculateRequest(StrictModel):
    strategy_id: str
    experiment_ids: list[str] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_experiments(self) -> ConsequenceCalculateRequest:
        if len(set(self.experiment_ids)) != len(self.experiment_ids):
            raise ValueError("experiment_ids must be unique")
        return self


class FeasibilityResult(StrictModel):
    strategy_id: str
    feasible: bool
    violations: list[str]
    evaluated_state_version: int = Field(ge=1)


class ConsequenceResult(StrictModel):
    strategy_id: str
    budget_used_usd: int = Field(ge=0)
    remaining_budget_usd: int
    engineering_used_hours: int = Field(ge=0)
    remaining_engineering_hours: int
    traffic_used: int = Field(ge=0)
    remaining_traffic: int
    delay_days: int = Field(ge=0)
    affected_commitments: list[str]
    evaluated_state_version: int = Field(ge=1)


class GovernorStatus(StrictModel):
    state: str
    decision_cycle: str
    active_run_id: str | None
    last_activity_at: datetime | None


class OverviewSnapshot(StrictModel):
    organization_state: OrganizationState
    active_goal: Goal | None
    governor_status: GovernorStatus
    experiments: list[Experiment]
    commitments: list[Commitment]
    latest_recommendation: dict | None
    pending_approval_count: int = Field(ge=0)
    recent_activity: list[dict]


T = TypeVar("T")


class CollectionPage(StrictModel, Generic[T]):
    items: list[T]
    next_cursor: str | None
