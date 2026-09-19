from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class ExperimentStatus(str, Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class SolverStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    UNKNOWN = "UNKNOWN"


class Goal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    text: str
    horizon_weeks: int
    protected_commitments: list[str] = Field(default_factory=list)


class OrganizationState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organization_id: str
    organization_name: str

    budget_usd: int

    engineering_capacity_hours: int
    reserved_engineering_hours: int
    available_engineering_hours: int

    eligible_traffic: int

    approval_threshold_usd: int
    state_version: int = 1

class Experiment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str

    cost_usd: int
    engineering_hours: int
    traffic_required: int

    dependencies: list[str] = Field(default_factory=list)

    status: ExperimentStatus = ExperimentStatus.PROPOSED

    decision_role: Optional[str] = None


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    content: str
    quality: Optional[str] = None


class CandidateStrategy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    experiment_ids: list[str]

    sequence: list[str] = Field(default_factory=list)

    conditional: bool = False
    condition: Optional[str] = None

class CandidateStrategySet(BaseModel):
    model_config = ConfigDict(
        extra="forbid"
    )

    strategies: list[
        CandidateStrategy
    ]


class FeasibilityResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy_id: str

    feasible: bool

    violations: list[str] = Field(default_factory=list)


class ConsequenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy_id: str

    budget_used_usd: int
    remaining_budget_usd: int

    engineering_used_hours: int
    remaining_engineering_hours: int

    traffic_used: int
    remaining_traffic: int


class OptimizationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SolverStatus

    feasible_combinations: list[list[str]] = Field(
        default_factory=list
    )


class Recommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision_id: str

    recommended_strategy_id: str

    now: list[str] = Field(
        default_factory=list
    )

    next: list[str] = Field(
        default_factory=list
    )

    later: list[str] = Field(
        default_factory=list
    )

    defer: list[str] = Field(
        default_factory=list
    )

    reasoning_summary: str

    requires_approval: bool = False

class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    event_type: str
    description: str

    engineering_delta_hours: int = 0

class DecisionObjective(BaseModel):
    model_config = ConfigDict(
        extra="forbid"
    )

    objective: str

    horizon_weeks: int

    protected_commitments: list[str]

    decision_type: str

class EvidencePlan(BaseModel):
    model_config = ConfigDict(
        extra="forbid"
    )

    required_evidence: list[str]

    sufficient_from_current_state: bool

    clarification_questions: list[str]

class StrategyAssessment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy_id: str

    business_value: str
    information_value: str
    strategic_alignment: str
    opportunity_cost: str
    risk: str

    rationale: str


class StrategicEvaluationSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assessments: list[StrategyAssessment]

class ApprovalDecision(str, Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Approval(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    decision_id: str
    strategy_id: str

    decision: ApprovalDecision

    reason: str

    threshold_usd: int

    state_version: int = 1

class MaterialityResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str

    potentially_material: bool

    affected_fields: list[str] = Field(
        default_factory=list
    )

    reasons: list[str] = Field(
        default_factory=list
    )