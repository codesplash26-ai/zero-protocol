import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Event, MaterialityResult } from '../../mock/pulseboard';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

export interface MaterialEventAlertBannerProps {
  materialEvent: Event;
  materiality: MaterialityResult;
  onTriggerReplan: () => void;
}

export const MaterialEventAlertBanner: React.FC<MaterialEventAlertBannerProps> = ({
  materialEvent,
  materiality,
  onTriggerReplan,
}) => {
  return (
    <Card
      padding="md"
      style={{
        border: '1px solid var(--color-warning-border)',
        backgroundColor: 'var(--color-warning-bg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
              <Badge variant="warning" size="md">
                <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                Material Event Detected
              </Badge>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                State Version {materialEvent.state_version} Trigger
              </span>
            </div>

            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {materialEvent.description}
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', lineHeight: 1.4 }}>
              <strong>Constraint Shift: </strong> Available experiment engineering buffer expanded by{' '}
              <strong style={{ color: 'var(--color-success)' }}>{materialEvent.engineering_delta_hours} hours</strong> (from 24h to 42h remaining). Candidate Strategy <code style={{ color: 'var(--color-text-primary)' }}>STRATEGY-A-B</code> (requires 30h) is now <strong>Feasible</strong>, but requires founder approval ($2,500 cost exceeds $2,000 threshold).
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
              Impacted Fields: {materiality.affected_fields.join(', ')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
          <Button
            variant="primary"
            size="md"
            onClick={onTriggerReplan}
            icon={<RefreshCw size={16} />}
          >
            Trigger Governor Re-Plan
          </Button>

          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Observe → Adapt Decision Cycle
          </span>
        </div>
      </div>
    </Card>
  );
};
