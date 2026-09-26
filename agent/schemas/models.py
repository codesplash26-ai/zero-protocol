from datetime import UTC, datetime, timedelta
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ExperimentStatus(str, Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class ExperimentOutcome(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class EventType(str, Enum):
    EXPERIMENT_RESULT = "EXPERIMENT_RESULT"
    CAPACITY_CHANGE = "CAPACITY_CHANGE"
    BUDGET_CHANGE = "BUDGET_CHANGE"
    DEPENDENCY_CHANGE = "DEPENDENCY_CHANGE"
    COMMITMENT_CHANGE = "COMMITMENT_CHANGE"


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
    outcome: ExperimentOutcome = ExperimentOutcome.PENDING

    decision_role: str | None = None


def dependency_satisfied_by_completed_success(
    experiment: Experiment | None,
) -> bool:
    return (
        experiment is not None
        and experiment.status
        == ExperimentStatus.COMPLETED
        and experiment.outcome
        == ExperimentOutcome.SUCCESS
    )


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    content: str
    quality: str | None = None


class CandidateStrategy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    experiment_ids: list[str]

    sequence: list[str] = Field(default_factory=list)

    conditional: bool = False
    condition: str | None = None

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

    evaluated_state_version: int


class ConsequenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy_id: str

    budget_used_usd: int
    remaining_budget_usd: int

    engineering_used_hours: int
    remaining_engineering_hours: int

    traffic_used: int
    remaining_traffic: int

    delay_days: int
    affected_commitments: list[str]
    evaluated_state_version: int


class OptimizationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SolverStatus
    selected_experiment_ids: list[str]
    feasible_combinations: list[list[str]]
    objective_value: float | int | None
    solver_run_id: str
    evaluated_state_version: int = Field(ge=1)

    @field_validator("solver_run_id")
    @classmethod
    def validate_solver_run_id(cls, value: str) -> str:
        if not value.startswith("SOLVER-") or value == "SOLVER-":
            raise ValueError(
                "solver_run_id must be an opaque SOLVER-* identifier"
            )
        return value

    @model_validator(mode="after")
    def validate_non_authorizing_statuses(self) -> "OptimizationResult":
        if (
            self.status in {SolverStatus.INFEASIBLE, SolverStatus.UNKNOWN}
            and self.selected_experiment_ids
        ):
            raise ValueError(
                f"{self.status.value} cannot select experiments"
            )
        if self.status is SolverStatus.INFEASIBLE and self.feasible_combinations:
            raise ValueError(
                "INFEASIBLE cannot contain feasible combinations"
            )
        return self


class AuditRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    decision_id: str
    goal_id: str
    state_version: int = Field(ge=1)
    tool_calls: list[str]
    candidate_strategy_ids: list[str]
    optimization_status: SolverStatus | None
    recommended_strategy_id: str | None
    approval_id: str | None
    action_receipt_id: str | None
    event_ids: list[str]
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def validate_created_at_is_utc(
        cls,
        value: datetime,
    ) -> datetime:
        if value.tzinfo is None or value.utcoffset() != timedelta(0):
            raise ValueError(
                "created_at must be a UTC timestamp"
            )
        return value.astimezone(UTC)


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
    state_version: int = Field(ge=1)

    @field_validator("recommended_strategy_id")
    @classmethod
    def validate_strategy_id(cls, value: str) -> str:
        if not value.startswith("STRATEGY-"):
            raise ValueError(
                "recommended_strategy_id must start with STRATEGY-"
            )
        return value

class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    event_type: EventType
    description: str
    engineering_delta_hours: int = 0
    budget_delta_usd: int = 0
    experiment_id: str | None = None
    experiment_outcome: ExperimentOutcome | None = None
    commitment_id: str | None = None
    source: str
    occurred_at: datetime
    state_version: int = Field(ge=1)

    @field_validator("occurred_at")
    @classmethod
    def validate_occurred_at_is_utc(
        cls,
        value: datetime,
    ) -> datetime:
        if value.tzinfo is None or value.utcoffset() != timedelta(0):
            raise ValueError(
                "occurred_at must be a UTC timestamp"
            )
        return value.astimezone(UTC)


class EventCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: EventType
    description: str = Field(min_length=1)
    engineering_delta_hours: int = 0
    budget_delta_usd: int = 0
    experiment_id: str | None = None
    experiment_outcome: ExperimentOutcome | None = None
    commitment_id: str | None = None
    source: str = Field(min_length=1)
    occurred_at: datetime
    expected_state_version: int = Field(ge=1)

    @field_validator("occurred_at")
    @classmethod
    def validate_occurred_at_is_utc(
        cls,
        value: datetime,
    ) -> datetime:
        if value.tzinfo is None or value.utcoffset() != timedelta(0):
            raise ValueError(
                "occurred_at must be a UTC timestamp"
            )
        return value.astimezone(UTC)

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


class ActionReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    decision_id: str
    strategy_id: str
    experiment_id: str

    previous_status: ExperimentStatus
    new_status: ExperimentStatus

    budget_reserved_usd: int
    engineering_reserved_hours: int

    status: str
    state_version: int
    executed_at: datetime
    idempotency_key: str

    @field_validator("executed_at")
    @classmethod
    def validate_executed_at_is_utc(
        cls,
        value: datetime,
    ) -> datetime:
        if value.tzinfo is None or value.utcoffset() != timedelta(0):
            raise ValueError(
                "executed_at must be a UTC timestamp"
            )
        return value.astimezone(UTC)


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

    state_version: int = Field(ge=1)


class DecisionRunType(str, Enum):
    INITIAL = "INITIAL"
    MATERIAL_EVENT = "MATERIAL_EVENT"
    APPROVAL_REPLAN_REQUEST = "APPROVAL_REPLAN_REQUEST"


class DecisionRun(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    decision_id: str
    run_type: DecisionRunType
    status: str
    result: str | None
    trigger_event_id: str | None
    trigger_approval_id: str | None
    input_state_version: int = Field(ge=1)
    recommendation_state_version: int | None
    error: dict | None
    created_at: datetime
    completed_at: datetime | None


class DecisionRunClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run: DecisionRun | None
    goal_id: str | None
