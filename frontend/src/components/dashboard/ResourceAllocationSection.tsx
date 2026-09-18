import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { CommitmentItem } from '../../mock/pulseboard';
import { Cpu, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

export interface ResourceAllocationSectionProps {
  totalEngineeringHours: number;
  committedHours: number;
  availableHours: number;
  commitments: CommitmentItem[];
}

export const ResourceAllocationSection: React.FC<ResourceAllocationSectionProps> = ({
  totalEngineeringHours,
  committedHours,
  availableHours,
  commitments,
}) => {
  const committedPercentage = Math.round((committedHours / totalEngineeringHours) * 100);
  const availablePercentage = Math.round((availableHours / totalEngineeringHours) * 100);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem',
      }}
    >
      {/* Visual Engineering Allocation Card */}
      <Card padding="lg">
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-accent-blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent-blue)',
              }}
            >
              <Cpu size={18} />
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
                RESOURCE CONSTRAINTS
              </div>
              <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
                Engineering Allocation
              </CardTitle>
            </div>
          </div>

          <Badge variant="default">{totalEngineeringHours}h Total</Badge>
        </CardHeader>

        <CardContent style={{ marginTop: '0.75rem' }}>
          {/* Stacked Progress Bar */}
          <div
            style={{
              height: '12px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg)',
              display: 'flex',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: `${committedPercentage}%`,
                backgroundColor: 'var(--color-primary)',
                transition: 'width 0.3s ease',
              }}
              title={`Enterprise SSO Committed: ${committedHours}h (${committedPercentage}%)`}
            />
            <div
              style={{
                width: `${availablePercentage}%`,
                backgroundColor: 'var(--color-governor-teal)',
                transition: 'width 0.3s ease',
              }}
              title={`Experiment Capacity Available: ${availableHours}h (${availablePercentage}%)`}
            />
          </div>

          {/* Allocation Legend Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--color-primary)' }} />
                <span>COMMITTED (SSO)</span>
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.25rem' }}>
                {committedHours}h
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.375rem' }}>
                  ({committedPercentage}%)
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-governor-teal-light)',
                border: '1px solid #CCFBF1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-governor-teal)', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--color-governor-teal)' }} />
                <span>EXPERIMENT CAP</span>
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-governor-teal)', marginTop: '0.25rem' }}>
                {availableHours}h
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.375rem' }}>
                  ({availablePercentage}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commitment Card */}
      <Card padding="lg">
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-danger)',
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-danger)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                PROTECTED COMMITMENT
              </div>
              <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
                {commitments[0]?.name || 'Enterprise SSO'}
              </CardTitle>
            </div>
          </div>

          <Badge variant="danger">
            <Lock size={12} />
            <span>Critical</span>
          </Badge>
        </CardHeader>

        <CardContent style={{ marginTop: '0.75rem' }}>
          <div
            style={{
              padding: '0.875rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              marginBottom: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Committed Allocation:
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                {commitments[0]?.hoursCommitted || 36}h
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              padding: '0.5rem 0',
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <span>{commitments[0]?.notes || 'Protected from experiment allocation'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
