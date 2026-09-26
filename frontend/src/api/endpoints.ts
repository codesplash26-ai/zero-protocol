/**
 * Typed wrappers for the browser-facing endpoints (API Contract v1.1).
 * Internal agent endpoints (recommendations, optimization results, run
 * claim/fail, import interpretation) are intentionally absent.
 */
import { get, post, type RequestOptions } from './client';
import type {
  ActionExecuteRequest,
  ActionReceipt,
  ActionReceiptStatus,
  Approval,
  ApprovalCheckRequest,
  ApprovalDecision,
  ApprovalDecisionRequest,
  ApprovalPolicyResult,
  AuditActivity,
  AuditRecord,
  CandidateStrategy,
  CollectionPage,
  Commitment,
  ConsequenceResult,
  DecisionCreateRequest,
  DecisionRun,
  DecisionWorkspace,
  DemoResetResult,
  EvidenceItem,
  EvidenceQuality,
  Event,
  EventCreateRequest,
  EventType,
  Experiment,
  ExperimentCreateRequest,
  ExperimentImportConfirmRequest,
  ExperimentImportCreateRequest,
  ExperimentImportJob,
  ExperimentOutcome,
  ExperimentStatus,
  FeasibilityResult,
  Goal,
  GoalCreateRequest,
  MaterialityResult,
  OrganizationState,
  OverviewSnapshot,
  Recommendation,
  ReplanRequest,
} from '../types/contract';

type WriteOptions = Pick<RequestOptions, 'idempotencyKey' | 'signal'>;

interface PageQuery {
  cursor?: string;
  limit?: number;
}

const enc = encodeURIComponent;

export const api = {
  // Reads and bootstrap
  getOverview: () => get<OverviewSnapshot>('/overview'),
  getState: () => get<OrganizationState>('/state'),
  listExperiments: (query: { status?: ExperimentStatus; outcome?: ExperimentOutcome } = {}) =>
    get<Experiment[]>('/experiments', query),
  getExperiment: (id: string) => get<Experiment>(`/experiments/${enc(id)}`),
  listCommitments: (query: PageQuery = {}) => get<CollectionPage<Commitment>>('/commitments', { ...query }),
  getGoal: (id: string) => get<Goal>(`/goals/${enc(id)}`),
  createGoal: (body: GoalCreateRequest, options?: WriteOptions) => post<Goal>('/goals', body, options),
  listEvidence: (query: PageQuery & { goal_id?: string; experiment_id?: string; quality?: EvidenceQuality } = {}) =>
    get<CollectionPage<EvidenceItem>>('/evidence', { ...query }),

  // Deterministic evaluation (read-only)
  checkFeasibility: (strategy: CandidateStrategy) => post<FeasibilityResult>('/feasibility/check', { strategy }),
  calculateConsequences: (body: { strategy_id: string; experiment_ids: string[] }) =>
    post<ConsequenceResult>('/consequences/calculate', body),

  // Governor decisions (asynchronous runs; poll getDecisionRun)
  createDecision: (body: DecisionCreateRequest, options?: WriteOptions) =>
    post<DecisionRun>('/decisions', body, options),
  getDecisionRun: (runId: string, signal?: AbortSignal) =>
    get<DecisionRun>(`/decision-runs/${enc(runId)}`, undefined, signal),
  getDecisionWorkspace: (decisionId: string) => get<DecisionWorkspace>(`/decisions/${enc(decisionId)}/workspace`),
  requestReplan: (decisionId: string, body: ReplanRequest, options?: WriteOptions) =>
    post<DecisionRun>(`/decisions/${enc(decisionId)}/replans`, body, options),
  getRecommendation: (decisionId: string) => get<Recommendation>(`/recommendations/${enc(decisionId)}`),

  // Experiments intake
  createExperiment: (body: ExperimentCreateRequest, options?: WriteOptions) =>
    post<Experiment>('/experiments', body, options),
  importExperimentText: (body: ExperimentImportCreateRequest, options?: WriteOptions) =>
    post<ExperimentImportJob>('/experiment-imports', body, options),
  importExperimentFile: (file: File, sourceName?: string, options?: WriteOptions) => {
    const form = new FormData();
    form.append('file', file);
    if (sourceName) form.append('source_name', sourceName);
    // Uploads of up to 5 MiB can outlast the default request timeout.
    return post<ExperimentImportJob>('/experiment-imports', form, { timeoutMs: 60_000, ...options });
  },
  getExperimentImport: (importId: string) => get<ExperimentImportJob>(`/experiment-imports/${enc(importId)}`),
  confirmExperimentImport: (importId: string, body: ExperimentImportConfirmRequest, options?: WriteOptions) =>
    post<Experiment>(`/experiment-imports/${enc(importId)}/confirm`, body, options),

  // Approvals and controlled actions
  listApprovals: (
    query: PageQuery & {
      decision?: ApprovalDecision;
      decision_id?: string;
      strategy_id?: string;
      experiment_id?: string;
      state_version?: number;
    } = {},
  ) => get<CollectionPage<Approval>>('/approvals', { ...query }),
  getApproval: (id: string) => get<Approval>(`/approvals/${enc(id)}`),
  checkApprovalPolicy: (body: ApprovalCheckRequest) => post<ApprovalPolicyResult>('/approvals/check', body),
  decideApproval: (approvalId: string, body: ApprovalDecisionRequest, options?: WriteOptions) =>
    post<Approval>(`/approvals/${enc(approvalId)}/decision`, body, options),
  executeAction: (body: ActionExecuteRequest, options?: WriteOptions) =>
    post<ActionReceipt>('/actions/execute', body, options),
  listActionReceipts: (
    query: PageQuery & {
      decision_id?: string;
      approval_id?: string;
      experiment_id?: string;
      status?: ActionReceiptStatus;
    } = {},
  ) => get<CollectionPage<ActionReceipt>>('/action-receipts', { ...query }),
  getActionReceipt: (id: string) => get<ActionReceipt>(`/action-receipts/${enc(id)}`),

  // Events and materiality
  listEvents: (
    query: PageQuery & {
      event_type?: EventType;
      potentially_material?: boolean;
      from_state_version?: number;
      to_state_version?: number;
    } = {},
  ) => get<CollectionPage<Event>>('/events', { ...query }),
  getEvent: (id: string) => get<Event>(`/events/${enc(id)}`),
  createEvent: (body: EventCreateRequest, options?: WriteOptions) => post<Event>('/events', body, options),
  evaluateMateriality: (eventId: string, options?: WriteOptions) =>
    post<MaterialityResult>(`/events/${enc(eventId)}/materiality`, undefined, options),
  getMateriality: (eventId: string) => get<MaterialityResult>(`/events/${enc(eventId)}/materiality`),

  // Demo (backend DEMO_MODE only)
  resetDemo: () => post<DemoResetResult>('/demo/reset'),

  // Audit
  listAudit: (query: PageQuery & { decision_id?: string; state_version?: number; event_id?: string; query?: string } = {}) =>
    get<CollectionPage<AuditActivity>>('/audit', { ...query }),
  getDecisionTrace: (decisionId: string, limit?: number) =>
    get<CollectionPage<AuditRecord>>(`/audit/${enc(decisionId)}`, { limit }),
};
