import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Approval } from '../../types/contract';
import { formatUsd, formatRelativeTime } from '../../lib/format';
import { PlayCircle, ShieldCheck } from 'lucide-react';

export interface StartActionCardProps {
  /** An APPROVED or NOT_REQUIRED approval with no action receipt yet. */
  approval: Approval;
  experimentName?: string | null;
  busy?: boolean;
  onStart: (approval: Approval) => void;
}

/** Controlled action that is authorized but not yet executed. */
export const StartActionCard: React.FC<StartActionCardProps> = ({ approval, experimentName, busy = false, onStart }) => {
  const notRequired = approval.decision === 'NOT_REQUIRED';

  return (
    <Card padding="lg" style={{ border: '1px solid #99F6E4' }}>
      <CardHeader style={{ marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
            <Badge variant="teal" size="md">
              <ShieldCheck size={12} style={{ marginRight: '4px' }} />
              {notRequired ? 'No Founder Approval Required' : 'Founder Approved'}
            </Badge>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              {approval.id} • {approval.decision_id}
            </span>
          </div>
          <CardTitle style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Ready to start experiment {approval.experiment_id}
            {experimentName ? ` — ${experimentName}` : ''}
          </CardTitle>
          <CardDescription style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {approval.reason} • {formatRelativeTime(approval.decided_at ?? approval.requested_at)} • State v{approval.state_version}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div>
            Starting reserves <strong>{formatUsd(approval.authorized_cost_usd)}</strong>,{' '}
            <strong>{approval.authorized_engineering_hours}h</strong> engineering and{' '}
            <strong>{approval.authorized_traffic.toLocaleString()}</strong> sessions. The backend revalidates feasibility first.
          </div>
          <Button variant="teal" size="md" icon={<PlayCircle size={16} />} onClick={() => onStart(approval)} disabled={busy}>
            {busy ? 'Starting…' : `Start ${approval.experiment_id}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
