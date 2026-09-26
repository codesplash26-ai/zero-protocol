import React from 'react';
import { Badge } from '../ui/Badge';
import type { Experiment } from '../../types/contract';

const STATUS: Record<Experiment['status'], { label: string; variant: 'default' | 'teal' | 'info' | 'success' | 'danger' }> = {
  PROPOSED: { label: 'Proposed', variant: 'default' },
  APPROVED: { label: 'Approved', variant: 'teal' },
  RUNNING: { label: 'Running', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
};

/**
 * Lifecycle badge from the backend status. The outcome is shown only once the
 * experiment is COMPLETED; dependency gating is displayed separately.
 */
export const ExperimentStatusBadge: React.FC<{ experiment: Pick<Experiment, 'status' | 'outcome'> }> = ({ experiment }) => {
  const status = STATUS[experiment.status] ?? { label: experiment.status, variant: 'default' as const };
  const completed = experiment.status === 'COMPLETED';
  const variant = completed && experiment.outcome === 'FAILURE' ? 'danger' : status.variant;
  const outcome = completed && experiment.outcome !== 'PENDING' ? ` · ${experiment.outcome === 'SUCCESS' ? 'Success' : 'Failure'}` : '';
  return <Badge variant={variant}>{`${status.label}${outcome}`}</Badge>;
};
