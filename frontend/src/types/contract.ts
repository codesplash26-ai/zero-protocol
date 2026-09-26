/**
 * Experiment Governor API types.
 *
 * Mirrors backend/app/schemas.py (API Contract v1.1 as implemented). Field
 * names are the exact JSON keys. Timestamps are UTC ISO 8601 strings; format
 * them in the UI with lib/format.ts. Money and resources are integers.
 */

export type IsoTimestamp = string;

// ---------------------------------------------------------------------------
// Enums (string unions; the project disallows TS enums)
// ---------------------------------------------------------------------------

export type ExperimentStatus = 'PROPOSED' | 'APPROVED' | 'RUNNING' | 'COMPLETED' | 'REJECTED';
export type ExperimentOutcome = 'PENDING' | 'SUCCESS' | 'FAILURE';
export type EvidenceQuality = 'HIGH' | 'MEDIUM' | 'LOW';
export type CommitmentPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type SolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';
export type DecisionRunType = 'INITIAL' | 'MATERIAL_EVENT' | 'APPROVAL_REPLAN_REQUEST';
export type DecisionRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type DecisionRunResult = 'NEW_RECOMMENDATION' | 'PRESERVED' | 'REPLANNED' | 'NO_ACTION';
export type ActionType = 'START_EXPERIMENT';
export type ApprovalDecision = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'INVALIDATED';
/** The only values a client may submit to POST /approvals/{id}/decision. */
export type HumanApprovalDecision = Extract<ApprovalDecision, 'APPROVED' | 'REJECTED'>;
export type ActionReceiptStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
export type EventType =
  | 'EXPERIMENT_RESULT'
  | 'CAPACITY_CHANGE'
  | 'BUDGET_CHANGE'
  | 'DEPENDENCY_CHANGE'
  | 'COMMITMENT_CHANGE';
export type ExperimentImportStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CONFIRMED';
export type ExperimentImportSourceType = 'TEXT' | 'PDF' | 'DOCX' | 'TXT';

/** Values produced by GET /overview (typed as str in the backend schema). */
export type GovernorState = 'MONITORING' | 'RUNNING' | 'REPLANNING' | 'FAILED';
/** Values produced by the workspace projection (typed as str in the backend schema). */
export type StrategyEvaluationStatus = 'RECOMMENDED' | 'ALTERNATIVE' | 'INFEASIBLE';

// ---------------------------------------------------------------------------
// Shared envelopes
// ---------------------------------------------------------------------------

export interface CollectionPage<T> {
  items: T[];
  next_cursor: string | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Object for domain errors; list of field errors for VALIDATION_ERROR. */
    details: unknown;
    request_id: string;
  };
}

export interface ValidationErrorDetail {
  location: (string | number)[];
  message: string;
  type: string;
}

/** Stable error summary stored on failed runs and import jobs. */
export interface ErrorSummary {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Organization, goals, commitments
// ---------------------------------------------------------------------------

export interface OrganizationState {
  organization_id: string;
  organization_name: string;
  budget_usd: number;
  engineering_capacity_hours: number;
  reserved_engineering_hours: number;
  available_engineering_hours: number;
  eligible_traffic: number;
  approval_threshold_usd: number;
  state_version: number;
}

export interface Goal {
  id: string;
  text: string;
  horizon_weeks: number;
  protected_commitments: string[];
}

export interface GoalCreateRequest {
  text: string;
  horizon_weeks: number;
  protected_commitments: string[];
  expected_state_version: number;
}

export interface Commitment {
  id: string;
  name: string;
  reserved_engineering_hours: number;
  priority: CommitmentPriority;
  protected: boolean;
  notes: string | null;
  updated_at: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Experiments and evidence
// ---------------------------------------------------------------------------

export interface Experiment {
  id: string;
  name: string;
  cost_usd: number;
  engineering_hours: number;
  traffic_required: number;
  dependencies: string[];
  status: ExperimentStatus;
  /** PENDING until COMPLETED; a dependency is satisfied only by COMPLETED + SUCCESS. */
  outcome: ExperimentOutcome;
  decision_role: string | null;
}

export interface EvidenceItem {
  id: string;
  source: string;
  content: string;
  quality: EvidenceQuality;
  relevance: string | null;
  retrieved_at: IsoTimestamp | null;
  freshness: string | null;
  trust_level: string | null;
  conflicts: string[];
}

export interface ExperimentEvidenceInput {
  source: string;
  content: string;
  quality: EvidenceQuality;
  relevance?: string | null;
  retrieved_at?: IsoTimestamp | null;
  freshness?: string | null;
  trust_level?: string | null;
  conflicts?: string[];
}

export interface ExperimentCreateRequest {
  name: string;
  cost_usd: number;
  engineering_hours: number;
  traffic_required: number;
  dependencies?: string[];
  decision_role?: string | null;
  evidence_items?: ExperimentEvidenceInput[];
  expected_state_version: number;
}

// ---------------------------------------------------------------------------
// Strategies and deterministic results
// ---------------------------------------------------------------------------

export interface CandidateStrategy {
  id: string;
  experiment_ids: string[];
  /** Ordered experiment IDs only, never display labels. */
  sequence: string[];
  conditional: boolean;
  condition: string | null;
}

export interface FeasibilityResult {
  strategy_id: string;
  feasible: boolean;
  violations: string[];
  evaluated_state_version: number;
}

export interface ConsequenceResult {
  strategy_id: string;
  budget_used_usd: number;
  remaining_budget_usd: number;
  engineering_used_hours: number;
  remaining_engineering_hours: number;
  traffic_used: number;
  remaining_traffic: number;
  delay_days: number;
  affected_commitments: string[];
  evaluated_state_version: number;
}

export interface OptimizationResult {
  status: SolverStatus;
  selected_experiment_ids: string[];
  feasible_combinations: string[][];
  objective_value: number | null;
  solver_run_id: string;
  evaluated_state_version: number;
}

/** Decision-page projection of a candidate strategy. */
export interface StrategyView extends CandidateStrategy {
  title: string;
  subtitle: string;
  evaluation_status: StrategyEvaluationStatus;
  expected_impact: string | null;
  confidence_label: string | null;
  cost_usd: number;
  engineering_hours: number;
  traffic_required: number;
  risk: string;
  key_advantage: string;
  tradeoff_note: string | null;
  feasibility: FeasibilityResult;
  consequences: ConsequenceResult;
}

// ---------------------------------------------------------------------------
// Decisions, runs, recommendations
// ---------------------------------------------------------------------------

export interface Recommendation {
  decision_id: string;
  recommended_strategy_id: string;
  /** The first entry is the experiment eligible for the current action. */
  now: string[];
  next: string[];
  later: string[];
  defer: string[];
  reasoning_summary: string;
  requires_approval: boolean;
  state_version: number;
}

export interface DecisionCreateRequest {
  goal_id: string;
  expected_state_version: number;
}

export interface DecisionRun {
  id: string;
  decision_id: string;
  run_type: DecisionRunType;
  status: DecisionRunStatus;
  result: DecisionRunResult | null;
  trigger_event_id: string | null;
  trigger_approval_id: string | null;
  input_state_version: number;
  recommendation_state_version: number | null;
  error: ErrorSummary | null;
  created_at: IsoTimestamp;
  completed_at: IsoTimestamp | null;
}

/** Exactly one trigger must be set. */
export type ReplanRequest =
  | { trigger_event_id: string; trigger_approval_id?: null; expected_state_version: number }
  | { trigger_approval_id: string; trigger_event_id?: null; expected_state_version: number };

export interface DecisionWorkspace {
  decision_id: string;
  goal: Goal;
  primary_constraint: string;
  strategies: StrategyView[];
  evidence: EvidenceItem[];
  recommendation: Recommendation | null;
  optimization_result: OptimizationResult | null;
  latest_run: DecisionRun;
  state_version: number;
}

// ---------------------------------------------------------------------------
// Approvals and controlled actions
// ---------------------------------------------------------------------------

export interface Approval {
  id: string;
  decision_id: string;
  /** Strategy context only; authorization applies to experiment_id. */
  strategy_id: string;
  experiment_id: string;
  action_type: ActionType;
  decision: ApprovalDecision;
  reason: string;
  threshold_usd: number;
  authorized_cost_usd: number;
  authorized_engineering_hours: number;
  authorized_traffic: number;
  state_version: number;
  requested_by: string;
  decided_by: string | null;
  requested_at: IsoTimestamp;
  decided_at: IsoTimestamp | null;
  expires_at: IsoTimestamp | null;
}

export interface ApprovalCheckRequest {
  decision_id: string;
  strategy_id: string;
  experiment_ids: string[];
  expected_state_version: number;
}

export interface ApprovalPolicyResult {
  approval_required: boolean;
  reason: string;
  threshold_usd: number;
  evaluated_cost_usd: number;
  state_version: number;
}

export interface ApprovalDecisionRequest {
  decision: HumanApprovalDecision;
  reason: string;
  actor_id: string;
  expected_state_version: number;
}

export interface ActionExecuteRequest {
  decision_id: string;
  strategy_id: string;
  experiment_id: string;
  approval_id: string;
  expected_state_version: number;
}

/** Not returned: approval_id. Use GET /action-receipts?approval_id= to join. */
export interface ActionReceipt {
  id: string;
  decision_id: string;
  strategy_id: string;
  experiment_id: string;
  previous_status: ExperimentStatus;
  new_status: ExperimentStatus;
  budget_reserved_usd: number;
  engineering_reserved_hours: number;
  status: ActionReceiptStatus;
  state_version: number;
  executed_at: IsoTimestamp;
  idempotency_key: string;
}

// ---------------------------------------------------------------------------
// Events and materiality
// ---------------------------------------------------------------------------

export interface Event {
  id: string;
  event_type: EventType;
  description: string;
  /** Positive = capacity gained, negative = capacity lost. */
  engineering_delta_hours: number;
  budget_delta_usd: number;
  experiment_id: string | null;
  experiment_outcome: ExperimentOutcome | null;
  commitment_id: string | null;
  source: string;
  occurred_at: IsoTimestamp;
  state_version: number;
}

export interface EventCreateRequest {
  event_type: EventType;
  description: string;
  engineering_delta_hours?: number;
  budget_delta_usd?: number;
  experiment_id?: string | null;
  experiment_outcome?: ExperimentOutcome | null;
  commitment_id?: string | null;
  source: string;
  /** Must be UTC, e.g. new Date().toISOString(). */
  occurred_at: IsoTimestamp;
  expected_state_version: number;
}

export interface MaterialityResult {
  event_id: string;
  potentially_material: boolean;
  affected_fields: string[];
  reasons: string[];
  state_version: number;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/** Item of GET /audit/{decision_id}: the decision trace (no title/summary). */
export interface AuditRecord {
  id: string;
  decision_id: string;
  goal_id: string;
  state_version: number;
  tool_calls: string[];
  candidate_strategy_ids: string[];
  optimization_status: SolverStatus | null;
  recommended_strategy_id: string | null;
  approval_id: string | null;
  action_receipt_id: string | null;
  event_ids: string[];
  created_at: IsoTimestamp;
}

/** Item of GET /audit and Overview recent_activity: includes title and summary. */
export interface AuditActivity {
  id: string;
  decision_id: string | null;
  goal_id: string | null;
  state_version: number;
  tool_calls: string[];
  candidate_strategy_ids: string[];
  optimization_status: string | null;
  recommended_strategy_id: string | null;
  approval_id: string | null;
  action_receipt_id: string | null;
  event_ids: string[];
  title: string;
  summary: string;
  created_at: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface GovernorStatus {
  state: GovernorState;
  /** Active run type, else latest run result or status, else "READY". */
  decision_cycle: string;
  active_run_id: string | null;
  last_activity_at: IsoTimestamp | null;
}

export interface OverviewSnapshot {
  organization_state: OrganizationState;
  active_goal: Goal | null;
  governor_status: GovernorStatus;
  experiments: Experiment[];
  commitments: Commitment[];
  latest_recommendation: Recommendation | null;
  pending_approval_count: number;
  /** Ten most recent audit entries, newest first. */
  recent_activity: AuditActivity[];
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

/** POST /demo/reset (only when the backend runs with DEMO_MODE=true). */
export interface DemoResetResult {
  status: string;
  state_version: number;
}

// ---------------------------------------------------------------------------
// Experiment import (AI interpretation draft, then human confirmation)
// ---------------------------------------------------------------------------

export interface FieldProvenance {
  field: string;
  source: string;
  quality: EvidenceQuality;
  excerpt: string | null;
}

/** Draft values may be missing; canonical Experiment values may not. */
export interface ExperimentImportDraft {
  name: string | null;
  short_description: string | null;
  objective: string | null;
  hypothesis: string | null;
  cost_usd: number | null;
  engineering_hours: number | null;
  traffic_required: number | null;
  duration: string | null;
  success_threshold: string | null;
  dependencies: string[];
  decision_role: string | null;
  field_provenance: FieldProvenance[];
  missing_fields: string[];
  confidence: number;
}

export interface ExperimentImportJob {
  id: string;
  status: ExperimentImportStatus;
  source_name: string;
  draft: ExperimentImportDraft | null;
  error: Record<string, unknown> | null;
  created_at: IsoTimestamp;
  completed_at: IsoTimestamp | null;
}

/** JSON import accepts only TEXT; files go through multipart/form-data. */
export interface ExperimentImportCreateRequest {
  source_type: 'TEXT';
  text: string;
  source_name: string;
}

export interface ExperimentConfirmationInput {
  name?: string | null;
  cost_usd?: number | null;
  engineering_hours?: number | null;
  traffic_required?: number | null;
  dependencies?: string[];
  decision_role?: string | null;
}

export interface ExperimentImportConfirmRequest {
  experiment: ExperimentConfirmationInput;
  evidence_items?: ExperimentEvidenceInput[];
  expected_state_version: number;
}
