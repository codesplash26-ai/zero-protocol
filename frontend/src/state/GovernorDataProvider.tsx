import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { api } from '../api/endpoints';
import { usePollRun } from '../hooks/usePollRun';
import type { DecisionRun, OverviewSnapshot } from '../types/contract';
import { GovernorDataContext, type GovernorData } from './governorContext';

/** While the backend is unreachable, try again on this cadence (plus manual retry). */
const ERROR_RETRY_INTERVAL_MS = 15_000;

interface OverviewState {
  overview: OverviewSnapshot | null;
  error: ApiError | null;
  settled: boolean;
  refreshedAt: number;
}

export const GovernorDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overviewState, setOverviewState] = useState<OverviewState>({
    overview: null,
    error: null,
    settled: false,
    refreshedAt: 0,
  });
  const [trackedRun, setTrackedRun] = useState<DecisionRun | null>(null);
  // Most recent run observed reaching a final status in this session.
  const [settledRun, setSettledRun] = useState<DecisionRun | null>(null);
  const requestSeq = useRef(0);

  const refresh = useCallback((): Promise<void> => {
    // Only the newest request may update state, so overlapping refreshes are safe.
    const seq = ++requestSeq.current;
    return api.getOverview().then(
      (overview) => {
        if (seq === requestSeq.current) {
          setOverviewState({ overview, error: null, settled: true, refreshedAt: Date.now() });
        }
      },
      (caught: unknown) => {
        if (seq !== requestSeq.current) return;
        const error =
          caught instanceof ApiError
            ? caught
            : new ApiError(0, 'NETWORK_ERROR', 'The Experiment Governor API could not be reached.');
        setOverviewState((previous) => ({ ...previous, error, settled: true }));
      },
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { overview, error } = overviewState;

  useEffect(() => {
    if (!error) return;
    const timer = setInterval(() => void refresh(), ERROR_RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [error, refresh]);

  // A run started in this session wins until it settles; otherwise follow the
  // run the backend reports as active (e.g. started before a page reload).
  const backendActiveRunId = error ? null : (overview?.governor_status.active_run_id ?? null);
  const pollRunId = trackedRun?.id ?? backendActiveRunId;
  const handleSettled = useCallback(
    (run: DecisionRun) => {
      setSettledRun(run);
      setTrackedRun((tracked) => (tracked?.id === run.id ? null : tracked));
      void refresh();
    },
    [refresh],
  );
  const poll = usePollRun(pollRunId, { onSettled: handleSettled });
  const currentRun = poll.run ?? (trackedRun?.id === pollRunId ? trackedRun : null) ?? settledRun;

  const trackRun = useCallback((run: DecisionRun) => setTrackedRun(run), []);

  const value = useMemo<GovernorData>(() => {
    const backendActiveRun = backendActiveRunId && poll.run?.id === backendActiveRunId ? poll.run : null;
    const decisionId =
      backendActiveRun?.decision_id ??
      trackedRun?.decision_id ??
      settledRun?.decision_id ??
      overview?.latest_recommendation?.decision_id ??
      null;
    return {
      overview,
      organization: overview?.organization_state ?? null,
      stateVersion: overview?.organization_state.state_version ?? null,
      governorStatus: error ? null : (overview?.governor_status ?? null),
      latestRecommendation: overview?.latest_recommendation ?? null,
      pendingApprovalCount: overview?.pending_approval_count ?? null,
      decisionId,
      currentRun,
      isRunPolling: poll.isPolling,
      isLoading: !overviewState.settled,
      refreshedAt: overviewState.refreshedAt,
      error,
      refresh,
      trackRun,
    };
  }, [
    overview,
    error,
    overviewState.settled,
    overviewState.refreshedAt,
    backendActiveRunId,
    poll.run,
    poll.isPolling,
    currentRun,
    trackedRun,
    settledRun,
    refresh,
    trackRun,
  ]);

  return <GovernorDataContext.Provider value={value}>{children}</GovernorDataContext.Provider>;
};
