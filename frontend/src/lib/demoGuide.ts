import type { OverviewSnapshot } from '../types/contract';

/** Browser-only UI conveniences; nothing authoritative is stored here. */
const OPEN_KEY = 'eg-demo-guide-open';
const AUDIT_KEY = 'eg-demo-guide-audit-visited';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the guide still works for this page view.
  }
}

/** Open by default until the user closes it. */
export const isGuideOpenStored = (): boolean => read(OPEN_KEY) !== '0';
export const storeGuideOpen = (open: boolean): void => write(OPEN_KEY, open ? '1' : '0');
export const wasAuditVisited = (): boolean => read(AUDIT_KEY) === '1';
export const markAuditVisited = (): void => write(AUDIT_KEY, '1');
export const clearGuideProgress = (): void => write(AUDIT_KEY, null);

export interface GuideStep {
  title: string;
  action: string;
  why: string;
  to: string;
  linkLabel: string;
  done: boolean;
}

const started = (status: string | undefined) => status === 'RUNNING' || status === 'COMPLETED';

/**
 * The seven-step PulseBoard story (Contract Appendix B). Each step is ticked
 * off from backend state; a later step being done implies the earlier ones.
 */
export function buildGuideSteps(overview: OverviewSnapshot, auditVisited: boolean): GuideStep[] {
  const experiment = (id: string) => overview.experiments.find((item) => item.id === id);
  const a = experiment('A');
  const b = experiment('B');
  const sso = overview.commitments.find((item) => item.id === 'enterprise_sso');
  const recommendation = overview.latest_recommendation;
  const stateVersion = overview.organization_state.state_version;

  const ssoReleased = !!sso && sso.reserved_engineering_hours < 36;
  const own = [
    recommendation !== null,
    started(a?.status),
    a?.status === 'COMPLETED' && a.outcome === 'SUCCESS',
    ssoReleased,
    ssoReleased && !!recommendation && recommendation.state_version === stateVersion,
    started(b?.status),
    started(b?.status) && auditVisited,
  ];
  const done = own.map((_, index) => own.slice(index).some(Boolean));

  const steps: Omit<GuideStep, 'done'>[] = [
    {
      title: 'Run the Governor',
      action: 'Decision → Run Governor',
      why: 'The AI weighs cost, capacity and information value against your goal.',
      to: '/decision',
      linkLabel: 'Open Decision',
    },
    {
      title: 'Start experiment A',
      action: 'Approvals → Start A',
      why: 'The cheap test runs first; under $2,000 it needs no founder approval.',
      to: '/approvals',
      linkLabel: 'Open Approvals',
    },
    {
      title: 'Record “A succeeded”',
      action: 'Events → Quick Events → A succeeded',
      why: 'The result unlocks the bigger bet, experiment B.',
      to: '/events',
      linkLabel: 'Open Events',
    },
    {
      title: 'Record “SSO frees 18h”',
      action: 'Events → Enterprise SSO frees 18h',
      why: 'A real-world change arrives; the backend checks whether it is material.',
      to: '/events',
      linkLabel: 'Open Events',
    },
    {
      title: 'Replan',
      action: 'Events → Trigger Governor Re-Plan',
      why: 'The plan adapts only because the change is material.',
      to: '/events',
      linkLabel: 'Open Events',
    },
    {
      title: 'Approve and start B',
      action: 'Approvals → Approve and start B',
      why: '$2,500 is above the threshold, so the founder decides.',
      to: '/approvals',
      linkLabel: 'Open Approvals',
    },
    {
      title: 'Review the Audit Trail',
      action: 'Audit Trail',
      why: 'Every recommendation, approval, action and event is traceable.',
      to: '/audit',
      linkLabel: 'Open Audit Trail',
    },
  ];
  return steps.map((step, index) => ({ ...step, done: done[index] }));
}
