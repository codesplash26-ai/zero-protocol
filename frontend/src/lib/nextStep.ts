import type { DecisionRun, Event, Experiment, OverviewSnapshot, Recommendation } from '../types/contract';
import { isRunActive } from '../hooks/usePollRun';
import { formatUsd } from './format';
import { findNothingFits } from './capacity';

const INACTIVE: ReadonlySet<Experiment['status']> = new Set(['COMPLETED', 'REJECTED']);

/**
 * Experiments the recommendation does not mention at all: they were added after
 * it was generated, so the plan has never considered them.
 */
export function experimentsMissingFromPlan(
  recommendation: Recommendation | null,
  experiments: Experiment[],
): Experiment[] {
  if (!recommendation) return [];
  const known = new Set([...recommendation.now, ...recommendation.next, ...recommendation.later, ...recommendation.defer]);
  return experiments.filter((item) => !INACTIVE.has(item.status) && !known.has(item.id));
}

/** A potentially material event at the current state that no recommendation has answered yet. */
export function isUnansweredMaterialEvent(
  event: Event,
  stateVersion: number | null,
  recommendation: Recommendation | null,
): boolean {
  return (
    event.state_version === stateVersion &&
    !(recommendation && recommendation.state_version >= event.state_version)
  );
}

export interface NextStep {
  message: string;
  action?: { label: string; to: string };
  tone: 'info' | 'action' | 'warning';
}

/** What the founder should do next, derived only from backend state. */
export function computeNextStep(
  overview: OverviewSnapshot,
  currentRun: DecisionRun | null,
  materialEvents: Event[],
  goalChanged = false,
): NextStep {
  const { governor_status: governor, latest_recommendation: recommendation, experiments } = overview;
  const stateVersion = overview.organization_state.state_version;

  if (isRunActive(currentRun) || governor.state === 'RUNNING' || governor.state === 'REPLANNING') {
    return {
      tone: 'info',
      message: 'The Governor is evaluating strategies — this usually takes 10–60 seconds.',
      action: { label: 'View progress', to: '/decision' },
    };
  }
  // Running the Governor again cannot help until an experiment fits the resources left.
  const nothingFits = findNothingFits(overview);
  if (nothingFits && (goalChanged || governor.state === 'FAILED')) {
    return {
      tone: 'warning',
      message: `${goalChanged ? 'Your goal changed, but there' : 'The last Governor run found nothing feasible. There'} is no remaining experiment that fits the budget, hours and traffic left. Add a cheaper experiment first.`,
      action: { label: 'Open Experiments', to: '/experiments' },
    };
  }
  if (governor.state === 'FAILED') {
    return {
      tone: 'warning',
      message: 'The last Governor run failed. Open the Decision page to see why and run it again.',
      action: { label: 'Open Decision', to: '/decision' },
    };
  }
  if (goalChanged) {
    return {
      tone: 'action',
      message: 'Your goal changed. Run the Governor so the plan is built for the new goal.',
      action: { label: 'Run the Governor', to: '/decision' },
    };
  }
  if (!recommendation) {
    return {
      tone: 'action',
      message: 'Start here: run the Governor to get a recommendation for your goal.',
      action: { label: 'Run the Governor', to: '/decision' },
    };
  }

  const unanswered = materialEvents.find((event) => isUnansweredMaterialEvent(event, stateVersion, recommendation));
  if (unanswered) {
    return {
      tone: 'action',
      message: `A material change was recorded: “${unanswered.description}” Replan now so the Governor can adapt, or record further changes first.`,
      action: { label: 'Replan on Events', to: '/events' },
    };
  }

  const missing = experimentsMissingFromPlan(recommendation, experiments);
  if (missing.length > 0) {
    return {
      tone: 'warning',
      message: `New experiment${missing.length > 1 ? 's' : ''} ${missing.map((item) => item.id).join(', ')} ${
        missing.length > 1 ? 'are' : 'is'
      } not in the current plan. Re-run the Governor to include ${missing.length > 1 ? 'them' : 'it'}.`,
      action: { label: 'Re-run Governor', to: '/decision' },
    };
  }

  const current = experiments.find((item) => item.id === recommendation.now[0]);
  if (current && (current.status === 'PROPOSED' || current.status === 'APPROVED')) {
    return recommendation.requires_approval
      ? {
          tone: 'action',
          message: `Founder decision needed: experiment ${current.id} (${current.name}) costs ${formatUsd(current.cost_usd)}, above the ${formatUsd(overview.organization_state.approval_threshold_usd)} threshold.`,
          action: { label: `Review ${current.id}`, to: '/approvals' },
        }
      : {
          tone: 'action',
          message: `Start experiment ${current.id} (${current.name}) — no founder approval needed.`,
          action: { label: `Start ${current.id}`, to: '/approvals' },
        };
  }

  const running = experiments.filter((item) => item.status === 'RUNNING');
  if (running.length > 0) {
    return {
      tone: 'info',
      message: `Experiment ${running.map((item) => item.id).join(', ')} ${running.length > 1 ? 'are' : 'is'} running. When results arrive, record them on the Events page.`,
      action: { label: 'Record a result', to: '/events' },
    };
  }

  return {
    tone: 'info',
    message: 'The plan is up to date. Record an event to see the Governor adapt.',
    action: { label: 'Open Events', to: '/events' },
  };
}
