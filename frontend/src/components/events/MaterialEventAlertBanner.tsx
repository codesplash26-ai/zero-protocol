import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Event, MaterialityResult } from '../../types/contract';
import { formatSignedHours, formatUsd } from '../../lib/format';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

export interface MaterialEventAlertBannerProps {
  materialEvent: Event;
  materiality: MaterialityResult;
  onTriggerReplan: () => void;
  busy?: boolean;
}

/** A potentially material event at the current state that no recommendation has answered yet. */
export const MaterialEventAlertBanner: React.FC<MaterialEventAlertBannerProps> = ({
  materialEvent,
  materiality,
  onTriggerReplan,
  busy = false,
}) => {
  const deltas = [
    materialEvent.engineering_delta_hours !== 0 && `${formatSignedHours(materialEvent.engineering_delta_hours)} engineering`,
    materialEvent.budget_delta_usd !== 0 &&
      `${materialEvent.budget_delta_usd > 0 ? '+' : '−'}${formatUsd(Math.abs(materialEvent.budget_delta_usd))} budget`,
  ].filter(Boolean);

  return (
    <Card
      padding="md"
      style={{
        border: '1px solid #FDE68A',
        backgroundColor: 'var(--color-warning-bg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-warning)',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <Badge variant="warning" size="md">
                <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                Material Event Detected
              </Badge>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {materialEvent.id} • State Version {materialEvent.state_version}
                {deltas.length > 0 && ` • ${deltas.join(', ')}`}
              </span>
            </div>

            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
              {materialEvent.description}
            </div>

            {materiality.reasons.length > 0 && (
              <ul
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  margin: '0.375rem 0 0 1.125rem',
                  padding: 0,
                  lineHeight: 1.5,
                }}
              >
                {materiality.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
              Impacted Fields: {materiality.affected_fields.length ? materiality.affected_fields.join(', ') : 'None'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
          <Button variant="primary" size="md" onClick={onTriggerReplan} icon={<RefreshCw size={16} />} disabled={busy}>
            Trigger Governor Re-Plan
          </Button>

          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            The Governor decides whether to preserve or change the plan
          </span>
        </div>
      </div>
    </Card>
  );
};
