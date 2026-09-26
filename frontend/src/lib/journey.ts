import type { DecisionRun, Event, OverviewSnapshot } from '../types/contract';
import { isRunActive } from '../hooks/usePollRun';
import { isUnansweredMaterialEvent } from './nextStep';

export const JOURNEY_STAGES = ['Goal', 'Recommendation', 'Approval', 'Action', 'Event', 'Replan'] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export interface JourneyPosition {
  /** Index into JOURNEY_STAGES of the stage the founder is at now. */
  current: number;
  /** One plain sentence about the current stage. */
  caption: string;
  busy: boolean;
}

/**
 * Where the workspace is in the Governor loop, derived only from backend state.
 * The loop repeats: after a replan it returns to Approval/Action.
 */
export function computeJourney(
  overview: OverviewSnapshot,
  currentRun: DecisionRun | null,
  materialEvents: Event[],
): JourneyPosition {
  const { active_goal: goal, latest_recommendation: recommendation, experiments, governor_status: governor } = overview;
  const stateVersion = overview.organization_state.state_version;

  if (!goal) return { current: 0, caption: 'Set a measurable goal to begin.', busy: false };
  if (isRunActive(currentRun) || governor.state === 'RUNNING' || governor.state === 'REPLANNING') {
    return { current: 1, caption: 'The Governor is weighing strategies right now.', busy: true };
  }
  if (materialEvents.some((event) => isUnansweredMaterialEvent(event, stateVersion, recommendation))) {
    return { current: 5, caption: 'A material change arrived — replan so the plan adapts.', busy: false };
  }
  if (!recommendation) return { current: 1, caption: 'Run the Governor to get a recommendation.', busy: false };
  if (overview.pending_approval_count > 0) {
    return { current: 2, caption: 'A controlled action is waiting for your approval.', busy: false };
  }

  const nowExperiment = experiments.find((item) => item.id === recommendation.now[0]);
  if (nowExperiment && (nowExperiment.status === 'PROPOSED' || nowExperiment.status === 'APPROVED')) {
    return recommendation.requires_approval && nowExperiment.status === 'PROPOSED'
      ? { current: 2, caption: `Experiment ${nowExperiment.id} needs your approval before it starts.`, busy: false }
      : { current: 3, caption: `Start experiment ${nowExperiment.id} — the recommended next action.`, busy: false };
  }
  if (nowExperiment?.status === 'RUNNING') {
    return { current: 4, caption: `Experiment ${nowExperiment.id} is running — record its result when it lands.`, busy: false };
  }
  return { current: 4, caption: 'Record what happened in the real world.', busy: false };
}
