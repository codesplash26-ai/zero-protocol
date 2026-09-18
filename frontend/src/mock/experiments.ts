/**
 * Temporary mock data for Experiment Governor portfolio and interpretation flow.
 * Will be replaced by backend API integration.
 */

export type ExperimentStatus = 'Proposed' | 'Conditional' | 'Deferred' | 'Running' | 'Completed';

export interface ExperimentProvenance {
  source: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface DetailedExperiment {
  id: string;
  name: string;
  shortDescription: string;
  objective: string;
  hypothesis: string;
  status: ExperimentStatus;
  cost: number | null;
  engineeringHours: number | null;
  trafficSessions: number | null;
  duration: string | null;
  dependencies: string[];
  successThreshold: string | null;
  decisionUnlocked: string;
  provenance: ExperimentProvenance;
  missingFields: string[];
}

export const initialExperiments: DetailedExperiment[] = [
  {
    id: 'exp-1',
    name: 'Pricing Willingness Test',
    shortDescription: 'Validate 15% price uplift acceptance across target SMB segment.',
    objective: 'Test customer willingness to accept a 15% price increase without significant conversion drop-off.',
    hypothesis: 'Customers will accept a 15% price uplift ($29 → $34/mo) without exceeding a 5% relative conversion drop.',
    status: 'Proposed',
    cost: 600,
    engineeringHours: 6,
    trafficSessions: 4000,
    duration: '2 weeks',
    dependencies: [],
    successThreshold: 'Conversion rate ≥ 4.2% on $34 tier',
    decisionUnlocked: 'Pricing tier direction & revenue model update',
    provenance: {
      source: 'Founder Plan',
      confidence: 'High',
    },
    missingFields: [],
  },
  {
    id: 'exp-2',
    name: 'Annual-plan Checkout',
    shortDescription: 'Introduce annual billing discount option at checkout.',
    objective: 'Increase upfront cash collection and LTV by offering a 20% annual discount.',
    hypothesis: 'Offering annual billing upfront will convert 15% of checkout traffic to annual commitments.',
    status: 'Conditional',
    cost: 2500,
    engineeringHours: 24,
    trafficSessions: 3500,
    duration: '3 weeks',
    dependencies: ['Pricing Willingness Test'],
    successThreshold: 'Annual plan take-rate ≥ 12%',
    decisionUnlocked: 'Annual checkout monetization pipeline',
    provenance: {
      source: 'Founder Plan',
      confidence: 'High',
    },
    missingFields: [],
  },
  {
    id: 'exp-3',
    name: 'Referral Prototype',
    shortDescription: 'In-app double-sided referral incentive loop.',
    objective: 'Test viral growth loops by rewarding existing users with $10 credit per referral.',
    hypothesis: 'In-app referral prompts will generate 0.15 viral coefficient (k-factor).',
    status: 'Deferred',
    cost: 1800,
    engineeringHours: 16,
    trafficSessions: 3000,
    duration: '2 weeks',
    dependencies: [],
    successThreshold: 'Viral coefficient k ≥ 0.12',
    decisionUnlocked: 'Organic referral growth engine',
    provenance: {
      source: 'Founder Plan',
      confidence: 'Medium',
    },
    missingFields: [],
  },
];

export const mockInterpretedExperiment: DetailedExperiment = {
  id: 'exp-interpreted-1',
  name: 'Enterprise Self-Serve Onboarding Flow',
  shortDescription: 'Streamlined self-serve signup flow for mid-market teams.',
  objective: 'Reduce onboarding friction for mid-market teams requiring custom workspace roles.',
  hypothesis: 'Automated role templates will increase 14-day activation from 22% to 35%.',
  status: 'Proposed',
  cost: null, // Missing field example
  engineeringHours: 8,
  trafficSessions: 5000,
  duration: '2 weeks',
  dependencies: [],
  successThreshold: 'Activation rate ≥ 30%',
  decisionUnlocked: 'Self-serve enterprise onboarding strategy',
  provenance: {
    source: 'Experiment Plan Document (PDF)',
    confidence: 'High',
  },
  missingFields: ['Cost / Budget requirement'],
};
