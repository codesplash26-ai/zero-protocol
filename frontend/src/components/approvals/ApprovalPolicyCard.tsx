import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { OrganizationState, Goal } from '../../types/contract';
import { formatUsd } from '../../lib/format';
import { ShieldCheck, DollarSign, Clock, Lock } from 'lucide-react';

export interface ApprovalPolicyCardProps {
  organizationState: OrganizationState;
  goal: Goal | null;
}

export const ApprovalPolicyCard: React.FC<ApprovalPolicyCardProps> = ({
  organizationState,
  goal,
}) => {
  return (
    <Card padding="md" style={{ borderLeft: '4px solid var(--color-warning)' }}>
      <CardHeader style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-warning-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-warning)',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '0.9375rem' }}>Active Governance Policy</CardTitle>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                State Version {organizationState.state_version} • Organization: {organizationState.organization_name}
              </div>
            </div>
          </div>
          <Badge variant="warning">Strict Enforcement</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '0.875rem',
            backgroundColor: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Threshold */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <DollarSign size={16} style={{ color: 'var(--color-warning)', marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Approval Threshold
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {formatUsd(organizationState.approval_threshold_usd)} USD
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Expenditures above threshold require explicit authorization
              </div>
            </div>
          </div>

          {/* Capacity Guardrail */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <Clock size={16} style={{ color: 'var(--color-accent-blue)', marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Available Eng Buffer
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {organizationState.available_engineering_hours}h / {organizationState.engineering_capacity_hours}h
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {organizationState.reserved_engineering_hours}h reserved (commitments and running experiments)
              </div>
            </div>
          </div>

          {/* Protected Commitment */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <Lock size={16} style={{ color: 'var(--color-accent-purple)', marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Protected Commitments
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {goal && goal.protected_commitments.length > 0
                  ? goal.protected_commitments.join(', ').replace(/_/g, ' ').toUpperCase()
                  : 'None recorded'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Cannot be overridden by experiment strategies
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
