import type { GovernorState, GovernorStatus } from '../types/contract';

const DECISION_CYCLE_LABELS: Record<string, string> = {
  READY: 'Ready for a decision',
  INITIAL: 'Initial evaluation',
  MATERIAL_EVENT: 'Material event replan',
  APPROVAL_REPLAN_REQUEST: 'Approval replan',
  NEW_RECOMMENDATION: 'New recommendation',
  REPLANNED: 'Strategy replanned',
  PRESERVED: 'Strategy preserved',
  NO_ACTION: 'No action required',
  QUEUED: 'Run queued',
  RUNNING: 'Run in progress',
  SUCCEEDED: 'Run succeeded',
  FAILED: 'Last run failed',
};

const GOVERNOR_TITLES: Record<GovernorState, string> = {
  MONITORING: 'Governor Monitoring',
  RUNNING: 'Governor Evaluating',
  REPLANNING: 'Governor Replanning',
  FAILED: 'Governor Run Failed',
};

const GOVERNOR_SHORT: Record<GovernorState, string> = {
  MONITORING: 'Monitoring',
  RUNNING: 'Evaluating',
  REPLANNING: 'Replanning',
  FAILED: 'Run failed',
};

const GOVERNOR_DOTS: Record<GovernorState, string> = {
  MONITORING: 'var(--color-governor-teal-accent)',
  RUNNING: '#FBBF24',
  REPLANNING: '#FBBF24',
  FAILED: '#F87171',
};

const GOVERNOR_BADGES: Record<GovernorState, 'teal' | 'warning' | 'danger'> = {
  MONITORING: 'teal',
  RUNNING: 'warning',
  REPLANNING: 'warning',
  FAILED: 'danger',
};

export interface GovernorDisplay {
  title: string;
  short: string;
  detail: string;
  dot: string;
  badge: 'teal' | 'warning' | 'danger' | 'default';
}

export function decisionCycleLabel(cycle: string): string {
  return DECISION_CYCLE_LABELS[cycle] ?? cycle.replace(/_/g, ' ').toLowerCase();
}

/** Display text for GET /overview governor_status; nothing is shown as live before it loads. */
export function describeGovernor(status: GovernorStatus | null, isLoading: boolean): GovernorDisplay {
  if (!status) {
    return {
      title: isLoading ? 'Connecting to Governor…' : 'Governor status unavailable',
      short: isLoading ? 'Connecting…' : 'Unavailable',
      detail: isLoading ? 'Loading live status' : 'Backend unreachable',
      dot: '#64748B',
      badge: 'default',
    };
  }
  return {
    title: GOVERNOR_TITLES[status.state] ?? status.state,
    short: GOVERNOR_SHORT[status.state] ?? status.state,
    detail: decisionCycleLabel(status.decision_cycle),
    dot: GOVERNOR_DOTS[status.state] ?? '#64748B',
    badge: GOVERNOR_BADGES[status.state] ?? 'default',
  };
}
