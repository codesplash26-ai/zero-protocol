import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { DecisionRun } from '../../types/contract';
import { formatRelativeTime } from '../../lib/format';

const RUN_TYPE_LABELS: Record<DecisionRun['run_type'], string> = {
  INITIAL: 'Initial evaluation',
  MATERIAL_EVENT: 'Material event replan',
  APPROVAL_REPLAN_REQUEST: 'Approval replan',
};

export interface RunStatusCardProps {
  run: DecisionRun;
  onRetry?: () => void;
  retryDisabled?: boolean;
}

/** A Governor run that is in progress or failed; succeeded runs show the recommendation instead. */
export const RunStatusCard: React.FC<RunStatusCardProps> = ({ run, onRetry, retryDisabled }) => {
  const failed = run.status === 'FAILED';

  return (
    <Card
      padding="lg"
      style={{
        border: failed ? '1px solid #FECACA' : '1px solid #FDE68A',
        borderLeft: failed ? '5px solid var(--color-danger)' : '5px solid var(--color-warning)',
      }}
    >
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ color: failed ? 'var(--color-danger)' : 'var(--color-warning)', display: 'flex' }}>
            {failed ? <AlertTriangle size={20} /> : <Loader2 size={20} className="eg-spin" />}
          </div>
          <div>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {RUN_TYPE_LABELS[run.run_type]} · {run.id}
            </div>
            <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
              {failed ? 'Governor run failed' : 'Governor is evaluating strategies…'}
            </CardTitle>
          </div>
        </div>
        <Badge variant={failed ? 'danger' : 'warning'}>{run.status}</Badge>
      </CardHeader>
      <CardContent style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        {failed ? (
          <>
            <div>
              <strong>{run.error?.code ?? 'UNKNOWN'}:</strong> {run.error?.message ?? 'The run failed without an error message.'}
            </div>
            {onRetry && (
              <div style={{ marginTop: '0.75rem' }}>
                <Button variant="outline" size="sm" onClick={onRetry} disabled={retryDisabled}>
                  Run Governor again
                </Button>
              </div>
            )}
          </>
        ) : (
          <div>
            Queued {formatRelativeTime(run.created_at)} at state v{run.input_state_version}. The worker evaluates
            feasibility, runs CP-SAT and persists a recommendation; this page updates when the run finishes.
          </div>
        )}
      </CardContent>
      <style>{`
        @keyframes eg-spin { to { transform: rotate(360deg); } }
        .eg-spin { animation: eg-spin 1s linear infinite; }
      `}</style>
    </Card>
  );
};
