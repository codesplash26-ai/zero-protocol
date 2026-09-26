import React from 'react';
import { CheckCircle2, XCircle, Unlock, MinusCircle, PlusCircle, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Commitment, Experiment } from '../../types/contract';
import type { SimulatedEventInput } from './SimulateEventModal';

/** Engineering hours used by the demo presets (Contract Appendix B uses +18 and −12). */
const RELEASE_HOURS = 18;
const BLOCK_HOURS = 12;

export interface EventPresetsProps {
  experiments: Experiment[];
  commitments: Commitment[];
  availableHours: number;
  disabled: boolean;
  onEmit: (event: SimulatedEventInput) => void;
  onCustom: () => void;
}

/**
 * One-click event facts built from the current state. They only describe what
 * happened; the backend applies the event and decides materiality.
 */
export const EventPresets: React.FC<EventPresetsProps> = ({
  experiments,
  commitments,
  availableHours,
  disabled,
  onEmit,
  onCustom,
}) => {
  const running = experiments.filter((item) => item.status === 'RUNNING');
  const releasable = commitments.filter((item) => item.reserved_engineering_hours >= RELEASE_HOURS);

  const result = (experiment: Experiment, outcome: 'SUCCESS' | 'FAILURE'): SimulatedEventInput => ({
    event_type: 'EXPERIMENT_RESULT',
    description:
      outcome === 'SUCCESS'
        ? `${experiment.name} met its success threshold.`
        : `${experiment.name} did not meet its success threshold.`,
    experiment_id: experiment.id,
    experiment_outcome: outcome,
    source: 'founder_simulation',
  });

  return (
    <Card padding="md">
      <CardHeader style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={18} style={{ color: 'var(--color-governor-teal)' }} />
          <CardTitle style={{ fontSize: '0.9375rem' }}>Quick Events</CardTitle>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Record what happened — the backend decides whether it is material
        </span>
      </CardHeader>
      <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
        {running.map((experiment) => (
          <React.Fragment key={experiment.id}>
            <Button
              variant="teal"
              size="sm"
              icon={<CheckCircle2 size={14} />}
              disabled={disabled}
              onClick={() => onEmit(result(experiment, 'SUCCESS'))}
            >
              {experiment.id} succeeded
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<XCircle size={14} />}
              disabled={disabled}
              onClick={() => onEmit(result(experiment, 'FAILURE'))}
            >
              {experiment.id} failed
            </Button>
          </React.Fragment>
        ))}
        {releasable.map((commitment) => (
          <Button
            key={commitment.id}
            variant="primary"
            size="sm"
            icon={<Unlock size={14} />}
            disabled={disabled}
            onClick={() =>
              onEmit({
                event_type: 'CAPACITY_CHANGE',
                description: `${commitment.name} work is delayed, releasing ${RELEASE_HOURS} reserved engineering hours.`,
                engineering_delta_hours: RELEASE_HOURS,
                commitment_id: commitment.id,
                source: 'founder_simulation',
              })
            }
          >
            {commitment.name} frees {RELEASE_HOURS}h
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          icon={<MinusCircle size={14} />}
          disabled={disabled || availableHours < BLOCK_HOURS}
          title={availableHours < BLOCK_HOURS ? `Only ${availableHours}h available` : undefined}
          onClick={() =>
            onEmit({
              event_type: 'CAPACITY_CHANGE',
              description: `A new ${BLOCK_HOURS}-hour engineering block reduces available capacity.`,
              engineering_delta_hours: -BLOCK_HOURS,
              source: 'founder_simulation',
            })
          }
        >
          New {BLOCK_HOURS}h block (−{BLOCK_HOURS}h)
        </Button>
        <Button variant="ghost" size="sm" icon={<PlusCircle size={14} />} disabled={disabled} onClick={onCustom}>
          Custom event…
        </Button>
        {running.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
            Result presets appear when an experiment is running.
          </span>
        )}
      </CardContent>
    </Card>
  );
};
