/**
 * Shared Naming & Data Contract v1 Compliant Mock Data.
 * PulseBoard Startup Scenario for Experiment Governor.
 */

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

export type ExperimentStatus = 'PROPOSED' | 'APPROVED' | 'RUNNING' | 'COMPLETED' | 'REJECTED';

export interface Experiment {
  id: string; // "A", "B", "C"
  name: string;
  cost_usd: number | null;
  engineering_hours: number | null;
  traffic_required: number | null;
  dependencies: string[];
  status: ExperimentStatus;
  decision_role: string;
  // Extended presentation metadata
  short_description?: string;
  objective?: string;
  hypothesis?: string;
  duration?: string | null;
  success_threshold?: string | null;
  provenance?: {
    source: string;
    quality: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  missing_fields?: string[];
}

export interface EvidenceItem {
  id: string;
  source: string;
  content: string;
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
  relevance?: string;
}

export interface CandidateStrategy {
  id: string;
  title: string;
  subtitle: string;
  experiment_ids: string[];
  sequence: string[];
  conditional: boolean;
  condition: string | null;
  status: 'Recommended' | 'Alternative' | 'Infeasible';
  expected_impact: string;
  confidence: string;
  cost_usd: number;
  engineering_hours: number;
  traffic_required: number;
  risk_level: 'Low' | 'Medium' | 'High';
  key_advantage: string;
  tradeoff_note?: string;
}

export interface Recommendation {
  decision_id: string;
  recommended_strategy_id: string;
  now: string[];
  next: string[];
  later: string[];
  defer: string[];
  reasoning_summary: string;
  requires_approval: boolean;
}

export interface GovernorStatus {
  state: 'Monitoring' | 'Active' | 'Replanning';
  decision_cycle: string;
  last_activity: string;
}

export interface CommitmentItem {
  id: string;
  name: string;
  hours_committed: number;
  priority: 'Critical' | 'High' | 'Medium';
  notes: string;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  title: string;
  details: string;
}

export interface DecisionWorkspaceData {
  goal: Goal;
  primary_constraint: string;
  strategies: CandidateStrategy[];
  evidence: EvidenceItem[];
  recommendation: Recommendation;
}

export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Approval {
  id: string; // "APR-001"
  decision_id: string; // "DEC-001"
  strategy_id: string; // "STRATEGY-A-B"
  decision: ApprovalDecision;
  reason: string;
  threshold_usd: number;
  state_version: number;
  // Context fields for UI display
  experiment_ids?: string[];
  cost_usd?: number;
  engineering_hours?: number;
  traffic_required?: number;
  proposed_by?: string;
  requested_at?: string;
  decided_at?: string | null;
  impact_summary?: string;
}

export interface ActionReceipt {
  id: string; // "ACT-001"
  decision_id: string; // "DEC-001"
  strategy_id: string; // "STRATEGY-A-B"
  experiment_id: string; // "B"
  previous_status: ExperimentStatus;
  new_status: ExperimentStatus;
  budget_reserved_usd: number;
  engineering_reserved_hours: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  executed_at?: string;
}

export interface PulseBoardData {
  organization_state: OrganizationState;
  goal: Goal;
  governor_status: GovernorStatus;
  experiments: Experiment[];
  commitments: CommitmentItem[];
  recent_activity: ActivityItem[];
  decision_workspace: DecisionWorkspaceData;
  approvals: Approval[];
  action_receipts: ActionReceipt[];
}

export const pulseboardMockData: PulseBoardData = {
  organization_state: {
    organization_id: 'pulseboard',
    organization_name: 'PulseBoard',
    budget_usd: 4000,
    engineering_capacity_hours: 60,
    reserved_engineering_hours: 36,
    available_engineering_hours: 24,
    eligible_traffic: 10000,
    approval_threshold_usd: 2000,
    state_version: 1,
  },
  goal: {
    id: 'GOAL-001',
    text: 'Choose our next four-week growth strategy without delaying the enterprise SSO commitment.',
    horizon_weeks: 4,
    protected_commitments: ['enterprise_sso'],
  },
  governor_status: {
    state: 'Monitoring',
    decision_cycle: 'Recommendation available',
    last_activity: 'Just now',
  },
  experiments: [
    {
      id: 'A',
      name: 'Pricing Willingness Test',
      cost_usd: 600,
      engineering_hours: 6,
      traffic_required: 4000,
      dependencies: [],
      status: 'PROPOSED',
      decision_role: 'Tests pricing willingness before a larger checkout investment.',
      short_description: 'Validate 15% price uplift acceptance across target SMB segment.',
      objective: 'Test customer willingness to accept a 15% price increase without significant conversion drop-off.',
      hypothesis: 'Customers will accept a 15% price uplift ($29 → $34/mo) without exceeding a 5% relative conversion drop.',
      duration: '2 weeks',
      success_threshold: 'Conversion rate ≥ 4.2% on $34 tier',
      provenance: {
        source: 'Founder Plan',
        quality: 'HIGH',
      },
      missing_fields: [],
    },
    {
      id: 'B',
      name: 'Annual-plan Checkout',
      cost_usd: 2500,
      engineering_hours: 24,
      traffic_required: 3500,
      dependencies: ['A'],
      status: 'PROPOSED',
      decision_role: 'Introduces annual billing discount option at checkout conditional on pricing test.',
      short_description: 'Introduce annual billing discount option at checkout.',
      objective: 'Increase upfront cash collection and LTV by offering a 20% annual discount.',
      hypothesis: 'Offering annual billing upfront will convert 15% of checkout traffic to annual commitments.',
      duration: '3 weeks',
      success_threshold: 'Annual plan take-rate ≥ 12%',
      provenance: {
        source: 'Founder Plan',
        quality: 'HIGH',
      },
      missing_fields: [],
    },
    {
      id: 'C',
      name: 'Referral Prototype',
      cost_usd: 1800,
      engineering_hours: 16,
      traffic_required: 3000,
      dependencies: [],
      status: 'PROPOSED',
      decision_role: 'In-app double-sided referral incentive loop prototype.',
      short_description: 'In-app double-sided referral incentive loop.',
      objective: 'Test viral growth loops by rewarding existing users with $10 credit per referral.',
      hypothesis: 'In-app referral prompts will generate 0.15 viral coefficient (k-factor).',
      duration: '2 weeks',
      success_threshold: 'Viral coefficient k ≥ 0.12',
      provenance: {
        source: 'Founder Plan',
        quality: 'MEDIUM',
      },
      missing_fields: [],
    },
  ],
  commitments: [
    {
      id: 'com-1',
      name: 'Enterprise SSO',
      hours_committed: 36,
      priority: 'Critical',
      notes: 'Protected from experiment allocation',
    },
  ],
  recent_activity: [
    {
      id: 'act-1',
      timestamp: '09:06',
      title: 'Recommendation generated',
      details: 'Run Pricing Test → Validate Annual Checkout',
    },
    {
      id: 'act-2',
      timestamp: '09:00',
      title: 'Decision initiated',
      details: 'Four-week growth strategy',
    },
  ],
  decision_workspace: {
    goal: {
      id: 'GOAL-001',
      text: 'Choose our next four-week growth strategy without delaying the enterprise SSO commitment.',
      horizon_weeks: 4,
      protected_commitments: ['enterprise_sso'],
    },
    primary_constraint: 'Enterprise SSO delivery (36h committed, hard deadline)',
    strategies: [
      {
        id: 'STRATEGY-A-B',
        title: 'Sequential Expansion (Recommended)',
        subtitle: 'De-risked sequential validation of pricing prior to annual checkout build',
        experiment_ids: ['A', 'B'],
        sequence: ['Pricing Willingness Test (6h, $600)', 'Annual-plan Checkout (24h, $2,500)'],
        conditional: true,
        condition: 'Run B only if A meets its success threshold.',
        status: 'Recommended',
        expected_impact: '+$42,000 ARR potential',
        confidence: '88% Governor Confidence',
        cost_usd: 3100,
        engineering_hours: 30,
        traffic_required: 7500,
        risk_level: 'Low',
        key_advantage: 'Establishes price elasticity early; conditional gating prevents wasted checkout engineering if price test fails.',
        tradeoff_note: 'Requires sequential execution across Weeks 1-4.',
      },
      {
        id: 'STRATEGY-C',
        title: 'Viral Loop Focus',
        subtitle: 'Standalone referral loop prototype execution',
        experiment_ids: ['C'],
        sequence: ['Referral Prototype (16h, $1,800)'],
        conditional: false,
        condition: null,
        status: 'Alternative',
        expected_impact: '+18% user referral lift',
        confidence: '65% Governor Confidence',
        cost_usd: 1800,
        engineering_hours: 16,
        traffic_required: 3000,
        risk_level: 'Medium',
        key_advantage: 'Leaves 8h buffer for additional bug fixes; low engineering friction.',
        tradeoff_note: 'Lower direct ARR impact compared to monetization tests.',
      },
      {
        id: 'STRATEGY-A-B-C',
        title: 'Parallel Aggressive (Infeasible)',
        subtitle: 'Simultaneous referral & pricing experiments',
        experiment_ids: ['A', 'B', 'C'],
        sequence: ['Pricing Willingness Test (6h)', 'Referral Prototype (16h)', 'Annual Checkout (24h)'],
        conditional: false,
        condition: null,
        status: 'Infeasible',
        expected_impact: '+$55,000 ARR (Theoretical)',
        confidence: 'Infeasible',
        cost_usd: 4900,
        engineering_hours: 46,
        traffic_required: 10500,
        risk_level: 'High',
        key_advantage: 'Maximizes parallel test coverage.',
        tradeoff_note: 'Violates 24h engineering capacity and overlaps Enterprise SSO commitment.',
      },
    ],
    evidence: [
      {
        id: 'EVIDENCE-001',
        source: 'enterprise_customer_interviews',
        content: '80% of pipeline prospects requested SSO; delaying SSO risks $120k ARR pipeline.',
        quality: 'HIGH',
        relevance: 'Enforces hard 36h commitment shield.',
      },
      {
        id: 'EVIDENCE-002',
        source: 'pricing_survey_data',
        content: 'Current pricing ($29/mo) is 25% below market median; 15% price elasticity test has high upside.',
        quality: 'HIGH',
        relevance: 'Justifies Pricing Willingness Test as prerequisite.',
      },
      {
        id: 'EVIDENCE-003',
        source: 'engineering_velocity_log',
        content: 'Available capacity capped at 24h over 4 weeks after accounting for SSO sprint commitment.',
        quality: 'HIGH',
        relevance: 'Eliminates Parallel Aggressive Strategy C.',
      },
    ],
    recommendation: {
      decision_id: 'DEC-001',
      recommended_strategy_id: 'STRATEGY-A-B',
      now: ['Run Pricing Willingness Test (A)'],
      next: ['Evaluate Pricing Willingness Test result'],
      later: ['Consider Annual-plan Checkout (B) if threshold is met'],
      defer: ['C'],
      reasoning_summary:
        'Governor CP-SAT solver evaluates Strategy A-B as optimal. Executing Pricing Willingness Test (A) first validates price acceptance with only 6h eng commitment. If positive, Annual Checkout (B) proceeds in Week 3-4 within resource thresholds while preserving 36h for Enterprise SSO.',
      requires_approval: true,
    },
  },
  approvals: [
    {
      id: 'APR-001',
      decision_id: 'DEC-001',
      strategy_id: 'STRATEGY-A-B',
      decision: 'PENDING',
      reason: 'Strategy execution cost ($2,500 USD) and engineering commitment (24 hrs) exceed founder governance threshold of $2,000 USD.',
      threshold_usd: 2000,
      state_version: 1,
      experiment_ids: ['A', 'B'],
      cost_usd: 2500,
      engineering_hours: 24,
      traffic_required: 10000,
      proposed_by: 'Experiment Governor (Automated Recommendation Engine)',
      requested_at: 'Today at 10:14 AM',
      impact_summary: 'Reserves $2,500 budget and 24 engineering hours to execute Pricing Willingness Test (A) followed by Annual Plan Checkout (B).',
    },
    {
      id: 'APR-000',
      decision_id: 'DEC-000',
      strategy_id: 'STRATEGY-A',
      decision: 'APPROVED',
      reason: 'Founder approved initial exploratory allocation for Pricing Willingness Test.',
      threshold_usd: 500,
      state_version: 1,
      experiment_ids: ['A'],
      cost_usd: 600,
      engineering_hours: 6,
      traffic_required: 4000,
      proposed_by: 'Founder Authorization',
      requested_at: 'Yesterday at 2:30 PM',
      decided_at: 'Yesterday at 3:15 PM',
      impact_summary: 'Authorized $600 allocation and 6 engineering hours for initial market testing.',
    },
  ],
  action_receipts: [
    {
      id: 'ACT-000',
      decision_id: 'DEC-000',
      strategy_id: 'STRATEGY-A',
      experiment_id: 'A',
      previous_status: 'PROPOSED',
      new_status: 'APPROVED',
      budget_reserved_usd: 600,
      engineering_reserved_hours: 6,
      status: 'SUCCESS',
      executed_at: 'Yesterday at 3:15 PM',
    },
  ],
};
