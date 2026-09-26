/** Plain-language definitions for the product's jargon. */
export const GLOSSARY = {
  stateVersion:
    'State version: a counter the backend increases every time budget, capacity, commitments or experiment status change. Decisions and approvals are tied to the version they were made at.',
  materiality:
    'Materiality: whether an event changes something the plan depends on (capacity, budget, dependencies or outcomes). Only material events justify replanning.',
  cpsat:
    'CP-SAT: Google OR-Tools constraint solver. It checks which experiment combinations fit the budget, hours, traffic and protected commitments — exact math, not AI guesses.',
  controlledAction:
    'Controlled action: a reversible, recorded state change (e.g. starting an experiment) that the backend re-checks before applying and confirms with a receipt.',
  approvalThreshold:
    'Approval threshold: any experiment costing more than this needs an explicit founder decision before it can start.',
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
