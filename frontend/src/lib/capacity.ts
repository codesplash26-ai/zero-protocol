import type { Experiment, OverviewSnapshot } from '../types/contract';
import { formatUsd } from './format';

const OPEN: ReadonlySet<Experiment['status']> = new Set(['PROPOSED', 'APPROVED']);

/** Why the Governor has nothing it can plan, or null when at least one experiment fits. */
export interface NothingFits {
  message: string;
}

function shortfall(item: Experiment, budget: number, hours: number, traffic: number): string {
  const needs: string[] = [];
  if (item.cost_usd > budget) needs.push(formatUsd(item.cost_usd));
  if (item.engineering_hours > hours) needs.push(`${item.engineering_hours}h`);
  if (item.traffic_required > traffic) needs.push(`${item.traffic_required.toLocaleString()} sessions`);
  return `${item.id} needs ${needs.join(', ')}`;
}

/**
 * A strategy needs at least one experiment that fits the remaining budget,
 * engineering hours and traffic on its own. When none does, every Governor run
 * would fail, so say why up front. Dependencies are ignored, which keeps this a
 * safe check: it only reports when nothing can possibly fit.
 */
export function findNothingFits(overview: OverviewSnapshot): NothingFits | null {
  const state = overview.organization_state;
  const budget = state.budget_usd;
  const hours = state.available_engineering_hours;
  const traffic = state.eligible_traffic;
  const open = overview.experiments.filter((item) => OPEN.has(item.status));

  if (open.length === 0) {
    return {
      message:
        'Every experiment is already running, completed or rejected, so there is nothing new to plan. Add an experiment on the Experiments page, or use Reset demo.',
    };
  }
  const fits = open.some(
    (item) => item.cost_usd <= budget && item.engineering_hours <= hours && item.traffic_required <= traffic,
  );
  if (fits) return null;
  return {
    message: `No remaining experiment fits the resources left (${formatUsd(budget)}, ${hours}h engineering, ${traffic.toLocaleString()} sessions): ${open
      .map((item) => shortfall(item, budget, hours, traffic))
      .join('; ')}. Add a cheaper experiment on the Experiments page, or use Reset demo.`,
  };
}
