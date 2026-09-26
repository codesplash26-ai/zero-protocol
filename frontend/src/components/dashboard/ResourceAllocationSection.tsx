import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Commitment, OrganizationState } from '../../types/contract';
import { Cpu, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

export interface ResourceAllocationSectionProps {
  organizationState: OrganizationState;
  commitments: Commitment[];
}

export const ResourceAllocationSection: React.FC<ResourceAllocationSectionProps> = ({
  organizationState,
  commitments,
}) => {
  const {
    engineering_capacity_hours,
    reserved_engineering_hours,
    available_engineering_hours,
  } = organizationState;

  const percentOf = (hours: number) =>
    engineering_capacity_hours > 0 ? Math.round((hours / engineering_capacity_hours) * 100) : 0;
  const committedPercentage = percentOf(reserved_engineering_hours);
  const availablePercentage = percentOf(available_engineering_hours);
  // Protected work (e.g. Enterprise SSO) comes first; reserved hours also include running experiments.
  const primaryCommitment = commitments.find((item) => item.protected) ?? commitments[0] ?? null;

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

          <Badge variant="default">{engineering_capacity_hours}h Total</Badge>
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
              title={`Reserved: ${reserved_engineering_hours}h (${committedPercentage}%)`}
            />
            <div
              style={{
                width: `${availablePercentage}%`,
                backgroundColor: 'var(--color-governor-teal)',
                transition: 'width 0.3s ease',
              }}
              title={`Experiment Capacity Available: ${available_engineering_hours}h (${availablePercentage}%)`}
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
                <span>RESERVED</span>
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.25rem' }}>
                {reserved_engineering_hours}h
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
                {available_engineering_hours}h
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
                {primaryCommitment?.name ?? 'No commitments recorded'}
              </CardTitle>
            </div>
          </div>

          {primaryCommitment && (
            <Badge variant={primaryCommitment.priority === 'CRITICAL' ? 'danger' : 'warning'}>
              <Lock size={12} />
              <span>{primaryCommitment.priority === 'CRITICAL' ? 'Critical' : primaryCommitment.priority === 'HIGH' ? 'High' : 'Medium'}</span>
            </Badge>
          )}
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
                {primaryCommitment ? `${primaryCommitment.reserved_engineering_hours}h` : '—'}
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
            <span>
              {primaryCommitment?.notes ??
                (primaryCommitment?.protected ? 'Protected from experiment allocation.' : 'No notes recorded.')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
