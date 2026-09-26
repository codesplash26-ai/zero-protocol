import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { api } from '../api/endpoints';
import { usePollRun } from '../hooks/usePollRun';
import type { DecisionRun, Event, OverviewSnapshot } from '../types/contract';
import { GovernorDataContext, type GovernorData } from './governorContext';

/** While the backend is unreachable, try again on this cadence (plus manual retry). */
const ERROR_RETRY_INTERVAL_MS = 15_000;

interface OverviewState {
  overview: OverviewSnapshot | null;
  /** Events the backend classified as potentially material (newest first). */
  materialEvents: Event[];
  error: ApiError | null;
  settled: boolean;
  refreshedAt: number;
}

export const GovernorDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overviewState, setOverviewState] = useState<OverviewState>({
    overview: null,
    materialEvents: [],
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
    // Material events feed guidance (next step, badges, journey); losing them never blocks the overview.
    const materialEvents = api
      .listEvents({ potentially_material: true, limit: 20 })
      .then((page) => page.items)
      .catch(() => [] as Event[]);
    return Promise.all([api.getOverview(), materialEvents]).then(
      ([overview, events]) => {
        if (seq === requestSeq.current) {
          setOverviewState({ overview, materialEvents: events, error: null, settled: true, refreshedAt: Date.now() });
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

  const resetDemo = useCallback(async () => {
    await api.resetDemo();
    // Runs followed before the reset belong to deleted decisions.
    setTrackedRun(null);
    setSettledRun(null);
    await refresh();
  }, [refresh]);

  const backendActiveRun = backendActiveRunId && poll.run?.id === backendActiveRunId ? poll.run : null;
  const decisionId =
    backendActiveRun?.decision_id ??
    trackedRun?.decision_id ??
    settledRun?.decision_id ??
    overview?.latest_recommendation?.decision_id ??
    null;

  // The goal the current plan was made for; recommendations do not carry it, the workspace does.
  const [planGoal, setPlanGoal] = useState<{ decisionId: string; goalId: string } | null>(null);
  const knownPlanDecision = planGoal?.decisionId ?? null;
  useEffect(() => {
    if (!decisionId || knownPlanDecision === decisionId) return;
    let cancelled = false;
    api.getDecisionWorkspace(decisionId).then(
      (workspace) => {
        if (!cancelled) setPlanGoal({ decisionId, goalId: workspace.goal.id });
      },
      () => {
        // Guidance only; the Decision page reports workspace errors itself.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [decisionId, knownPlanDecision]);
  const planGoalId = planGoal && planGoal.decisionId === decisionId ? planGoal.goalId : null;
  const activeGoalId = overview?.active_goal?.id ?? null;
  const goalChanged = !!activeGoalId && !!planGoalId && planGoalId !== activeGoalId;

  const value = useMemo<GovernorData>(() => {
    return {
      overview,
      materialEvents: overviewState.materialEvents,
      organization: overview?.organization_state ?? null,
      stateVersion: overview?.organization_state.state_version ?? null,
      governorStatus: error ? null : (overview?.governor_status ?? null),
      latestRecommendation: overview?.latest_recommendation ?? null,
      pendingApprovalCount: overview?.pending_approval_count ?? null,
      decisionId,
      goalChanged,
      currentRun,
      isRunPolling: poll.isPolling,
      isLoading: !overviewState.settled,
      refreshedAt: overviewState.refreshedAt,
      error,
      refresh,
      trackRun,
      resetDemo,
    };
  }, [
    overview,
    overviewState.materialEvents,
    error,
    overviewState.settled,
    overviewState.refreshedAt,
    decisionId,
    goalChanged,
    poll.isPolling,
    currentRun,
    refresh,
    trackRun,
    resetDemo,
  ]);

  return <GovernorDataContext.Provider value={value}>{children}</GovernorDataContext.Provider>;
};
