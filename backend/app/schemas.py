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


class SolverStatus(StrEnum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    UNKNOWN = "UNKNOWN"


class DecisionRunType(StrEnum):
    INITIAL = "INITIAL"
    MATERIAL_EVENT = "MATERIAL_EVENT"
    APPROVAL_REPLAN_REQUEST = "APPROVAL_REPLAN_REQUEST"


class DecisionRunStatus(StrEnum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class DecisionRunResult(StrEnum):
    NEW_RECOMMENDATION = "NEW_RECOMMENDATION"
    PRESERVED = "PRESERVED"
    REPLANNED = "REPLANNED"
    NO_ACTION = "NO_ACTION"


class ActionType(StrEnum):
    START_EXPERIMENT = "START_EXPERIMENT"


class ApprovalDecision(StrEnum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    INVALIDATED = "INVALIDATED"


class ActionReceiptStatus(StrEnum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"


class EventType(StrEnum):
    EXPERIMENT_RESULT = "EXPERIMENT_RESULT"
    CAPACITY_CHANGE = "CAPACITY_CHANGE"
    BUDGET_CHANGE = "BUDGET_CHANGE"
    DEPENDENCY_CHANGE = "DEPENDENCY_CHANGE"
    COMMITMENT_CHANGE = "COMMITMENT_CHANGE"


class ExperimentImportStatus(StrEnum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CONFIRMED = "CONFIRMED"


class ExperimentImportSourceType(StrEnum):
    TEXT = "TEXT"
    PDF = "PDF"
    DOCX = "DOCX"
    TXT = "TXT"


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


class GoalCreateRequest(StrictModel):
    text: str = Field(min_length=1)
    horizon_weeks: int = Field(gt=0)
    protected_commitments: list[str]
    expected_state_version: int = Field(ge=1)


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


class EvidenceCreateRequest(StrictModel):
    goal_id: str | None = None
    experiment_id: str | None = None
    source: str = Field(min_length=1)
    content: str = Field(min_length=1)
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


class OptimizationResult(StrictModel):
    status: SolverStatus
    selected_experiment_ids: list[str]
    feasible_combinations: list[list[str]]
    objective_value: float | None
    solver_run_id: str
    evaluated_state_version: int = Field(ge=1)


class OptimizationPersistRequest(OptimizationResult):
    decision_id: str


class Recommendation(StrictModel):
    decision_id: str
    recommended_strategy_id: str
    current_executable_experiment_id: str | None
    now: list[str]
    next: list[str]
    later: list[str]
    defer: list[str]
    reasoning_summary: str
    requires_approval: bool
    state_version: int = Field(ge=1)


class RecommendationPersistRequest(StrictModel):
    run_id: str
    candidate_strategies: list[CandidateStrategy] = Field(min_length=1)
    recommendation: Recommendation
    tool_calls: list[str] = Field(default_factory=list)


class Approval(StrictModel):
    id: str
    decision_id: str
    strategy_id: str
    experiment_id: str
    action_type: ActionType
    decision: ApprovalDecision
    reason: str
    threshold_usd: int = Field(ge=0)
    authorized_cost_usd: int = Field(ge=0)
    authorized_engineering_hours: int = Field(ge=0)
    authorized_traffic: int = Field(ge=0)
    state_version: int = Field(ge=1)
    requested_by: str
    decided_by: str | None
    requested_at: datetime
    decided_at: datetime | None
    expires_at: datetime | None


class ApprovalCheckRequest(StrictModel):
    decision_id: str
    strategy_id: str
    experiment_id: str
    action_type: ActionType
    expected_state_version: int = Field(ge=1)


class ApprovalPolicyResult(StrictModel):
    approval_required: bool
    decision: ApprovalDecision
    reason: str
    threshold_usd: int = Field(ge=0)
    authorized_cost_usd: int = Field(ge=0)
    authorized_engineering_hours: int = Field(ge=0)
    authorized_traffic: int = Field(ge=0)
    state_version: int = Field(ge=1)


class ApprovalCreateRequest(ApprovalCheckRequest):
    requested_by: str = Field(min_length=1)


class ApprovalDecisionRequest(StrictModel):
    decision: ApprovalDecision
    reason: str = Field(min_length=1)
    actor_id: str = Field(min_length=1)
    expected_state_version: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_human_decision(self) -> ApprovalDecisionRequest:
        if self.decision not in {ApprovalDecision.APPROVED, ApprovalDecision.REJECTED}:
            raise ValueError("Clients may only submit APPROVED or REJECTED")
        return self


class ActionExecuteRequest(StrictModel):
    decision_id: str
    strategy_id: str
    experiment_id: str
    action_type: ActionType
    approval_id: str
    expected_state_version: int = Field(ge=1)


class ActionReceipt(StrictModel):
    id: str
    approval_id: str
    decision_id: str
    strategy_id: str
    experiment_id: str
    previous_status: ExperimentStatus
    new_status: ExperimentStatus
    budget_reserved_usd: int = Field(ge=0)
    engineering_reserved_hours: int = Field(ge=0)
    status: ActionReceiptStatus
    state_version: int = Field(ge=1)
    executed_at: datetime
    idempotency_key: str


class AuditRecord(StrictModel):
    id: str
    decision_id: str | None
    goal_id: str | None
    state_version: int = Field(ge=1)
    tool_calls: list[str]
    candidate_strategy_ids: list[str]
    optimization_status: str | None
    recommended_strategy_id: str | None
    approval_id: str | None
    action_receipt_id: str | None
    event_ids: list[str]
    title: str
    summary: str
    created_at: datetime


class Event(StrictModel):
    id: str
    event_type: EventType
    description: str
    engineering_delta_hours: int
    budget_delta_usd: int
    experiment_id: str | None
    experiment_outcome: ExperimentOutcome | None
    commitment_id: str | None
    source: str
    occurred_at: datetime
    state_version: int = Field(ge=1)


class EventCreateRequest(StrictModel):
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


class MaterialityResult(StrictModel):
    event_id: str
    potentially_material: bool
    affected_fields: list[str]
    reasons: list[str]
    state_version: int = Field(ge=1)


class ReplanRequest(StrictModel):
    trigger_event_id: str | None = None
    trigger_approval_id: str | None = None
    expected_state_version: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_single_trigger(self) -> ReplanRequest:
        triggers = [self.trigger_event_id, self.trigger_approval_id]
        if sum(item is not None for item in triggers) != 1:
            raise ValueError("Exactly one replan trigger must be supplied")
        return self


class FieldProvenance(StrictModel):
    field: str
    source: str
    quality: EvidenceQuality
    excerpt: str | None = None


class ExperimentImportDraft(StrictModel):
    name: str | None = None
    short_description: str | None = None
    objective: str | None = None
    hypothesis: str | None = None
    cost_usd: int | None = Field(default=None, ge=0)
    engineering_hours: int | None = Field(default=None, ge=0)
    traffic_required: int | None = Field(default=None, ge=0)
    duration: str | None = None
    success_threshold: str | None = None
    dependencies: list[str] = Field(default_factory=list)
    decision_role: str | None = None
    field_provenance: list[FieldProvenance] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


class ExperimentImportJob(StrictModel):
    id: str
    status: ExperimentImportStatus
    source_name: str
    draft: ExperimentImportDraft | None
    error: dict | None
    created_at: datetime
    completed_at: datetime | None


class ExperimentImportSource(StrictModel):
    id: str
    source_type: ExperimentImportSourceType
    source_name: str
    text: str | None
    content_base64: str | None
    sha256: str


class ExperimentImportCreateRequest(StrictModel):
    source_type: ExperimentImportSourceType
    text: str = Field(min_length=1)
    source_name: str = Field(min_length=1, max_length=255)

    @model_validator(mode="after")
    def validate_text_source(self) -> ExperimentImportCreateRequest:
        if self.source_type is not ExperimentImportSourceType.TEXT:
            raise ValueError("JSON imports must use source_type TEXT")
        return self


class ImportInterpretationRequest(StrictModel):
    draft: ExperimentImportDraft | None = None
    error: dict | None = None

    @model_validator(mode="after")
    def validate_result(self) -> ImportInterpretationRequest:
        if (self.draft is None) == (self.error is None):
            raise ValueError("Exactly one of draft or error must be supplied")
        return self


class ExperimentEvidenceInput(StrictModel):
    source: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    quality: EvidenceQuality
    relevance: str | None = None
    retrieved_at: datetime | None = None
    freshness: str | None = None
    trust_level: str | None = None
    conflicts: list[str] = Field(default_factory=list)


class CanonicalExperimentInput(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    cost_usd: int = Field(ge=0)
    engineering_hours: int = Field(ge=0)
    traffic_required: int = Field(ge=0)
    dependencies: list[str] = Field(default_factory=list)
    decision_role: str | None = None

    @model_validator(mode="after")
    def validate_unique_dependencies(self) -> CanonicalExperimentInput:
        if len(set(self.dependencies)) != len(self.dependencies):
            raise ValueError("dependencies must be unique")
        return self


class ExperimentCreateRequest(CanonicalExperimentInput):
    evidence_items: list[ExperimentEvidenceInput] = Field(default_factory=list)
    expected_state_version: int = Field(ge=1)


class ExperimentConfirmationInput(StrictModel):
    name: str | None = Field(default=None, max_length=200)
    cost_usd: int | None = Field(default=None, ge=0)
    engineering_hours: int | None = Field(default=None, ge=0)
    traffic_required: int | None = Field(default=None, ge=0)
    dependencies: list[str] = Field(default_factory=list)
    decision_role: str | None = None


class ExperimentImportConfirmRequest(StrictModel):
    experiment: ExperimentConfirmationInput
    evidence_items: list[ExperimentEvidenceInput] = Field(default_factory=list)
    expected_state_version: int = Field(ge=1)


class DecisionCreateRequest(StrictModel):
    goal_id: str
    expected_state_version: int = Field(ge=1)


class DecisionRun(StrictModel):
    id: str
    decision_id: str
    run_type: DecisionRunType
    status: DecisionRunStatus
    result: DecisionRunResult | None
    trigger_event_id: str | None
    trigger_approval_id: str | None
    input_state_version: int = Field(ge=1)
    recommendation_state_version: int | None
    error: dict | None
    created_at: datetime
    completed_at: datetime | None


class StrategyView(CandidateStrategy):
    title: str
    subtitle: str
    evaluation_status: str
    expected_impact: str | None
    confidence_label: str | None
    cost_usd: int
    engineering_hours: int
    traffic_required: int
    risk: str
    key_advantage: str
    tradeoff_note: str | None
    feasibility: FeasibilityResult
    consequences: ConsequenceResult


class DecisionWorkspace(StrictModel):
    decision_id: str
    goal: Goal
    primary_constraint: str
    strategies: list[StrategyView]
    evidence: list[EvidenceItem]
    recommendation: Recommendation | None
    optimization_result: OptimizationResult | None
    latest_run: DecisionRun
    state_version: int = Field(ge=1)


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
