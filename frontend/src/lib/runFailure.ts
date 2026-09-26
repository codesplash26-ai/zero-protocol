import type { DecisionRun, OverviewSnapshot } from '../types/contract';
import { findNothingFits } from './capacity';

/** A founder-readable account of a failed Governor run; the raw error stays in technical details. */
export interface RunFailure {
  title: string;
  message: string;
}

const AGAIN = 'Run the Governor again. If it keeps failing, use Reset demo to start from a clean state.';

export function describeRunFailure(run: DecisionRun, overview: OverviewSnapshot | null): RunFailure {
  // Checked first: when nothing fits, any other symptom (e.g. provider errors) is a side effect.
  const nothingFits = overview ? findNothingFits(overview) : null;
  if (nothingFits) return { title: 'Nothing feasible to recommend.', message: nothingFits.message };

  const code = run.error?.code ?? '';
  const raw = run.error?.message ?? '';
  const text = `${code} ${raw}`.toLowerCase();

  if (code === 'RUN_TIMEOUT') {
    return {
      title: 'The run took too long.',
      message: 'The Governor did not finish within 10 minutes, so the run was stopped. Run it again.',
    };
  }
  if (text.includes('state_version') || text.includes('state version') || text.includes('stale')) {
    return {
      title: "The startup's data changed during the run.",
      message: 'Something was updated while the Governor was working, so its result no longer matched. Run it again to plan with the latest data.',
    };
  }
  if (code === 'RUN_NOT_COMPLETED') {
    return { title: 'The Governor finished without a recommendation.', message: AGAIN };
  }
  if (text.includes('all llm providers failed')) {
    return {
      title: 'The Governor could not complete its analysis.',
      message:
        'The AI providers were unavailable and the built-in fallback could not produce a plan from the current data. Try again in a few minutes, or check the API keys in the setup.',
    };
  }
  if (text.includes('backend') || text.includes('connection') || text.includes('timed out')) {
    return {
      title: 'The Governor lost contact with the backend.',
      message: 'The run was interrupted by a connection problem. Check that all services are running, then run it again.',
    };
  }
  return { title: "The Governor couldn't complete this run.", message: AGAIN };
}
