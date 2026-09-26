import { createContext, useContext } from 'react';
import type { ApiError } from '../api/client';
import type {
  DecisionRun,
  GovernorStatus,
  OrganizationState,
  OverviewSnapshot,
  Recommendation,
} from '../types/contract';

/**
 * Shared, backend-authoritative Governor data. Pages read from here and call
 * refresh() after a successful mutation instead of editing copies locally.
 */
export interface GovernorData {
  /** Last successful GET /overview response. */
  overview: OverviewSnapshot | null;
  organization: OrganizationState | null;
  stateVersion: number | null;
  /** Null while loading or when the backend is unreachable; never fabricated. */
  governorStatus: GovernorStatus | null;
  latestRecommendation: Recommendation | null;
  pendingApprovalCount: number | null;

  /**
   * Decision the workspace is about, from (in order): the backend's active
   * run, a run started in this session via trackRun, or the decision that
   * owns the backend's latest recommendation. Null when none is known.
   */
  decisionId: string | null;
  /** Run currently being polled (active backend run or a tracked run). */
  currentRun: DecisionRun | null;
  isRunPolling: boolean;

  /** True until the first /overview response or error. */
  isLoading: boolean;
  /** Time of the last successful /overview load; use it to refetch page data after a refresh. */
  refreshedAt: number;
  /** Set when the last /overview request failed. */
  error: ApiError | null;
  /** Reload /overview from the backend. Safe to call concurrently. */
  refresh: () => Promise<void>;
  /** Follow a run returned by POST /decisions or /replans until it settles. */
  trackRun: (run: DecisionRun) => void;
  /** Restore the seeded demo scenario (backend DEMO_MODE), forget followed runs, reload. */
  resetDemo: () => Promise<void>;
}

export const GovernorDataContext = createContext<GovernorData | null>(null);

export function useGovernorData(): GovernorData {
  const value = useContext(GovernorDataContext);
  if (value === null) {
    throw new Error('useGovernorData must be used inside <GovernorDataProvider>.');
  }
  return value;
}
