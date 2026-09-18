/**
 * Temporary demo data — will be replaced by backend API integration.
 * PulseBoard Startup Scenario for Experiment Governor.
 */

export interface StartupSnapshot {
  budget: {
    total: number;
    available: number;
    currency: string;
  };
  engineering: {
    total: number;
    committed: number;
    available: number;
  };
  traffic: {
    eligibleSessions: number;
  };
  commitments: {
    criticalCount: number;
    primaryName: string;
  };
}

export interface CurrentDecisionState {
  goal: string;
  horizon: string;
  recommendationState: string;
}

export interface GovernorStatus {
  state: 'Monitoring' | 'Active' | 'Replanning';
  decisionCycle: string;
  lastActivity: string;
}

export interface ExperimentSummaryItem {
  id: string;
  name: string;
  status: 'Proposed' | 'Conditional' | 'Active' | 'Completed';
  cost: number;
  engineeringHours: number;
  trafficSessions: number;
  dependency?: string;
}

export interface CommitmentItem {
  id: string;
  name: string;
  hoursCommitted: number;
  priority: 'Critical' | 'High' | 'Medium';
  notes: string;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  title: string;
  details: string;
}

export interface StrategyOption {
  id: string;
  title: string;
  subtitle: string;
  sequence: string[];
  status: 'Recommended' | 'Alternative' | 'Infeasible';
  expectedImpact: string;
  confidence: string;
  cost: number;
  engineeringHours: number;
  trafficSessions: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  keyAdvantage: string;
  tradeoffNote?: string;
}

export interface EvidenceItem {
  id: string;
  source: string;
  insight: string;
  confidence: 'High' | 'Medium' | 'Low';
  relevance: string;
}

export interface DecisionWorkspaceData {
  goal: string;
  horizon: string;
  primaryConstraint: string;
  strategies: StrategyOption[];
  evidence: EvidenceItem[];
  recommendationReasoning: string;
}

export interface PulseBoardData {
  startupSnapshot: StartupSnapshot;
  currentDecision: CurrentDecisionState;
  governorStatus: GovernorStatus;
  experiments: ExperimentSummaryItem[];
  commitments: CommitmentItem[];
  recentActivity: ActivityItem[];
  decisionWorkspace: DecisionWorkspaceData;
}

export const pulseboardMockData: PulseBoardData = {
  startupSnapshot: {
    budget: {
      total: 4000,
      available: 4000,
      currency: '$',
    },
    engineering: {
      total: 60,
      committed: 36,
      available: 24,
    },
    traffic: {
      eligibleSessions: 10000,
    },
    commitments: {
      criticalCount: 1,
      primaryName: 'Enterprise SSO',
    },
  },
  currentDecision: {
    goal: 'Choose our next four-week growth strategy without delaying the enterprise SSO commitment.',
    horizon: '4 weeks',
    recommendationState: 'Run Pricing Test → Validate Annual Checkout',
  },
  governorStatus: {
    state: 'Monitoring',
    decisionCycle: 'Recommendation available',
    lastActivity: 'Just now',
  },
  experiments: [
    {
      id: 'exp-1',
      name: 'Pricing Willingness Test',
      status: 'Proposed',
      cost: 600,
      engineeringHours: 6,
      trafficSessions: 4000,
    },
    {
      id: 'exp-2',
      name: 'Annual-plan Checkout',
      status: 'Conditional',
      cost: 2500,
      engineeringHours: 24,
      trafficSessions: 3500,
      dependency: 'Pricing Willingness Test',
    },
    {
      id: 'exp-3',
      name: 'Referral Prototype',
      status: 'Proposed',
      cost: 1800,
      engineeringHours: 16,
      trafficSessions: 3000,
    },
  ],
  commitments: [
    {
      id: 'com-1',
      name: 'Enterprise SSO',
      hoursCommitted: 36,
      priority: 'Critical',
      notes: 'Protected from experiment allocation',
    },
  ],
  recentActivity: [
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
  decisionWorkspace: {
    goal: 'Choose our next four-week growth strategy without delaying the enterprise SSO commitment.',
    horizon: '4 weeks',
    primaryConstraint: 'Enterprise SSO delivery (36h committed, hard deadline)',
    strategies: [
      {
        id: 'strat-a',
        title: 'Sequential Expansion (Recommended)',
        subtitle: 'De-risked sequential validation of pricing prior to annual checkout build',
        sequence: ['Pricing Willingness Test (6h, $600)', 'Annual-plan Checkout (24h, $2,500)'],
        status: 'Recommended',
        expectedImpact: '+$42,000 ARR potential',
        confidence: '88% Governor Confidence',
        cost: 3100,
        engineeringHours: 30,
        trafficSessions: 7500,
        riskLevel: 'Low',
        keyAdvantage: 'Establishes price elasticity early; conditional gating prevents wasted checkout engineering if price test fails.',
        tradeoffNote: 'Requires sequential execution across Weeks 1-4.',
      },
      {
        id: 'strat-b',
        title: 'Viral Loop Focus',
        subtitle: 'Standalone referral loop prototype execution',
        sequence: ['Referral Prototype (16h, $1,800)'],
        status: 'Alternative',
        expectedImpact: '+18% user referral lift',
        confidence: '65% Governor Confidence',
        cost: 1800,
        engineeringHours: 16,
        trafficSessions: 3000,
        riskLevel: 'Medium',
        keyAdvantage: 'Leaves 8h buffer for additional bug fixes; low engineering friction.',
        tradeoffNote: 'Lower direct ARR impact compared to monetization tests.',
      },
      {
        id: 'strat-c',
        title: 'Parallel Aggressive (Infeasible)',
        subtitle: 'Simultaneous referral & pricing experiments',
        sequence: ['Pricing Willingness Test (6h)', 'Referral Prototype (16h)', 'Annual Checkout (24h)'],
        status: 'Infeasible',
        expectedImpact: '+$55,000 ARR (Theoretical)',
        confidence: 'Infeasible',
        cost: 4900,
        engineeringHours: 46,
        trafficSessions: 10500,
        riskLevel: 'High',
        keyAdvantage: 'Maximizes parallel test coverage.',
        tradeoffNote: 'Violates 24h engineering capacity and overlaps Enterprise SSO commitment.',
      },
    ],
    evidence: [
      {
        id: 'ev-1',
        source: 'Enterprise Customer Interviews',
        insight: '80% of pipeline prospects requested SSO; delaying SSO risks $120k ARR pipeline.',
        confidence: 'High',
        relevance: 'Enforces hard 36h commitment shield.',
      },
      {
        id: 'ev-2',
        source: 'Pricing Survey Data',
        insight: 'Current pricing ($29/mo) is 25% below market median; 15% price elasticity test has high upside.',
        confidence: 'High',
        relevance: 'Justifies Pricing Willingness Test as prerequisite.',
      },
      {
        id: 'ev-3',
        source: 'Engineering Velocity Log',
        insight: 'Available capacity capped at 24h over 4 weeks after accounting for SSO sprint commitment.',
        confidence: 'High',
        relevance: 'Eliminates Parallel Aggressive Strategy C.',
      },
    ],
    recommendationReasoning:
      'Governor CP-SAT solver evaluates Strategy A as optimal. Executing Pricing Willingness Test first validates price acceptance with only 6h eng commitment. If positive, Annual Checkout proceeds in Week 3-4 within resource thresholds while preserving 36h for Enterprise SSO.',
  },
};
