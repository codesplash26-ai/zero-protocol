import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { api } from '../api/endpoints';
import type { DecisionRun, DecisionRunStatus } from '../types/contract';

/** Governor runs take from under a second (rule-based) to ~30s (LLM). */
export const RUN_POLL_INTERVAL_MS = 2000;
/** Consecutive unreachable/5xx responses tolerated before polling gives up. */
const MAX_TRANSIENT_FAILURES = 5;

const ACTIVE_STATUSES: ReadonlySet<DecisionRunStatus> = new Set(['QUEUED', 'RUNNING']);

export function isRunActive(run: Pick<DecisionRun, 'status'> | null | undefined): boolean {
  return !!run && ACTIVE_STATUSES.has(run.status);
}

export interface PollRunState {
  /** Latest run returned by the backend for runId, or null before the first response. */
  run: DecisionRun | null;
  /** True while runId is set and the run has not reached a non-active status. */
  isPolling: boolean;
  error: ApiError | null;
}

interface InternalState {
  runId: string | null;
  run: DecisionRun | null;
  error: ApiError | null;
  done: boolean;
}

/**
 * Polls GET /decision-runs/{runId} while the run is QUEUED or RUNNING and stops
 * on SUCCEEDED, FAILED or any other status. One request is in flight at a time
 * (the next poll is scheduled after the previous one returns); changing runId
 * or unmounting cancels the pending request and timer.
 *
 * onSettled fires once when the run leaves QUEUED/RUNNING.
 */
export function usePollRun(
  runId: string | null,
  options: { intervalMs?: number; onSettled?: (run: DecisionRun) => void } = {},
): PollRunState {
  const intervalMs = options.intervalMs ?? RUN_POLL_INTERVAL_MS;
  const onSettledRef = useRef(options.onSettled);
  useEffect(() => {
    onSettledRef.current = options.onSettled;
  });

  const [state, setState] = useState<InternalState>({ runId: null, run: null, error: null, done: false });

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let transientFailures = 0;
    const controller = new AbortController();

    const tick = async () => {
      try {
        const run = await api.getDecisionRun(runId, controller.signal);
        if (cancelled) return;
        transientFailures = 0;
        const active = isRunActive(run);
        setState({ runId, run, error: null, done: !active });
        if (active) {
          timer = setTimeout(tick, intervalMs);
        } else {
          onSettledRef.current?.(run);
        }
      } catch (caught) {
        if (cancelled) return;
        const error =
          caught instanceof ApiError ? caught : new ApiError(0, 'NETWORK_ERROR', 'The run status could not be loaded.');
        const transient = error.isNetworkError || error.status >= 500;
        const retry = transient && ++transientFailures <= MAX_TRANSIENT_FAILURES;
        setState((previous) => ({
          runId,
          run: previous.runId === runId ? previous.run : null,
          error,
          done: !retry,
        }));
        if (retry) timer = setTimeout(tick, intervalMs * 2);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [runId, intervalMs]);

  const current = state.runId === runId;
  return {
    run: current ? state.run : null,
    isPolling: !!runId && !(current && state.done),
    error: current ? state.error : null,
  };
}
