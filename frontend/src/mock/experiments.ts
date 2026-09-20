/**
 * Temporary mock data for Experiment Governor portfolio and interpretation flow.
 * Aligned 100% with Shared Naming & Data Contract v1.
 */

import type { Experiment, ExperimentStatus } from './pulseboard';

export type { ExperimentStatus };

export const initialExperiments: Experiment[] = [
  {
    id: 'A',
    name: 'Pricing Willingness Test',
    short_description: 'Validate 15% price uplift acceptance across target SMB segment.',
    objective: 'Test customer willingness to accept a 15% price increase without significant conversion drop-off.',
    hypothesis: 'Customers will accept a 15% price uplift ($29 → $34/mo) without exceeding a 5% relative conversion drop.',
    status: 'PROPOSED',
    cost_usd: 600,
    engineering_hours: 6,
    traffic_required: 4000,
    duration: '2 weeks',
    dependencies: [],
    success_threshold: 'Conversion rate ≥ 4.2% on $34 tier',
    decision_role: 'Tests pricing willingness before a larger checkout investment.',
    provenance: {
      source: 'Founder Plan',
      quality: 'HIGH',
    },
    missing_fields: [],
  },
  {
    id: 'B',
    name: 'Annual-plan Checkout',
    short_description: 'Introduce annual billing discount option at checkout.',
    objective: 'Increase upfront cash collection and LTV by offering a 20% annual discount.',
    hypothesis: 'Offering annual billing upfront will convert 15% of checkout traffic to annual commitments.',
    status: 'PROPOSED', // Gated condition in decision workspace
    cost_usd: 2500,
    engineering_hours: 24,
    traffic_required: 3500,
    duration: '3 weeks',
    dependencies: ['A'],
    success_threshold: 'Annual plan take-rate ≥ 12%',
    decision_role: 'Introduces annual billing discount option at checkout conditional on pricing test.',
    provenance: {
      source: 'Founder Plan',
      quality: 'HIGH',
    },
    missing_fields: [],
  },
  {
    id: 'C',
    name: 'Referral Prototype',
    short_description: 'In-app double-sided referral incentive loop.',
    objective: 'Test viral growth loops by rewarding existing users with $10 credit per referral.',
    hypothesis: 'In-app referral prompts will generate 0.15 viral coefficient (k-factor).',
    status: 'PROPOSED',
    cost_usd: 1800,
    engineering_hours: 16,
    traffic_required: 3000,
    duration: '2 weeks',
    dependencies: [],
    success_threshold: 'Viral coefficient k ≥ 0.12',
    decision_role: 'In-app double-sided referral incentive loop prototype.',
    provenance: {
      source: 'Founder Plan',
      quality: 'MEDIUM',
    },
    missing_fields: [],
  },
];

export const mockInterpretedExperiment: Experiment = {
  id: 'EXP-004',
  name: 'Enterprise Self-Serve Onboarding Flow',
  short_description: 'Streamlined self-serve signup flow for mid-market teams.',
  objective: 'Reduce onboarding friction for mid-market teams requiring custom workspace roles.',
  hypothesis: 'Automated role templates will increase 14-day activation from 22% to 35%.',
  status: 'PROPOSED',
  cost_usd: null, // Missing field example
  engineering_hours: 8,
  traffic_required: 5000,
  duration: '2 weeks',
  dependencies: [],
  success_threshold: 'Activation rate ≥ 30%',
  decision_role: 'Self-serve enterprise onboarding strategy validation',
  provenance: {
    source: 'Experiment Plan Document (PDF)',
    quality: 'HIGH',
  },
  missing_fields: ['cost_usd'],
};
