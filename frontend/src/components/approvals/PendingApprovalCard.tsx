import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Approval, OrganizationState, StrategyView } from '../../types/contract';
import { formatUsd, formatRelativeTime } from '../../lib/format';
import { Term } from '../ui/Term';
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, GitBranch, ArrowRight, DollarSign, Clock, Users, ShieldAlert } from 'lucide-react';

export interface PendingApprovalCardProps {
  approval: Approval;
  /** Strategy context from the decision workspace; authorization covers approval.experiment_id only. */
  strategy?: StrategyView | null;
  experimentName?: string | null;
  organization: OrganizationState;
  /** Reasoning from the recommendation this approval belongs to, when available. */
  reasoning?: string | null;
  busy?: boolean;
  onApprove: (approval: Approval) => void;
  onReject: (approval: Approval) => void;
  onRequestReplan: (approval: Approval) => void;
}

export const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({
  approval,
  strategy,
  experimentName,
  organization,
  reasoning,
  busy = false,
  onApprove,
  onReject,
  onRequestReplan,
}) => {
  const cost = approval.authorized_cost_usd;
  const hours = approval.authorized_engineering_hours;
  const traffic = approval.authorized_traffic;
  const available = organization.available_engineering_hours;

  return (
    <Card padding="lg" style={{ border: '1px solid var(--color-warning-border)', backgroundColor: 'var(--color-bg-card)' }}>
      <CardHeader style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
              <Badge variant="warning" size="md">
                <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                Pending Authorization
              </Badge>

              <span className="eg-tech" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                {approval.id} • {approval.decision_id}
              </span>
            </div>

            <CardTitle style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Start experiment {approval.experiment_id}
              {experimentName ? ` — ${experimentName}` : ''}
            </CardTitle>
            <CardDescription style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Requested by {approval.requested_by} • {formatRelativeTime(approval.requested_at)} • State v{approval.state_version}
            </CardDescription>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              <Term k="approvalThreshold">Approval threshold</Term>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-warning)' }}>
              {formatUsd(approval.threshold_usd)} USD
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Why Approval Is Required Banner */}
        <div
          style={{
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <ShieldAlert size={20} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-warning-text)' }}>
              Reason For Authorization Required
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
              {approval.reason}
            </div>
          </div>
        </div>

        {/* Resource Allocation Breakdown */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
            Resource Allocation Impact
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.875rem',
            }}
          >
            {/* Cost Card */}
            <div
              style={{
                padding: '0.875rem',
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                <DollarSign size={14} style={{ color: 'var(--color-warning)' }} />
                Budget Required
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.25rem 0' }}>
                {formatUsd(cost)} USD
              </div>
              <div style={{ fontSize: '0.6875rem', color: cost > approval.threshold_usd ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                {cost > approval.threshold_usd
                  ? `Exceeds threshold by ${formatUsd(cost - approval.threshold_usd)} USD`
                  : 'Within the approval threshold'}
              </div>
            </div>

            {/* Engineering Hours Card */}
            <div
              style={{
                padding: '0.875rem',
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                <Clock size={14} style={{ color: 'var(--color-accent-blue)' }} />
                Engineering Hours
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.25rem 0' }}>
                {hours} Hours
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                {available > 0
                  ? `${Math.round((hours / available) * 100)}% of the ${available}h currently available`
                  : 'No engineering hours currently available'}
              </div>
            </div>

            {/* Traffic Required Card */}
            <div
              style={{
                padding: '0.875rem',
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                <Users size={14} style={{ color: 'var(--color-accent-purple)' }} />
                Traffic Allocation
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.25rem 0' }}>
                {traffic.toLocaleString()} sessions
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                Of {organization.eligible_traffic.toLocaleString()} eligible sessions
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Sequence Details */}
        {strategy && (
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <GitBranch size={16} style={{ color: 'var(--color-accent-blue)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Strategy Context: {strategy.title} ({strategy.id})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
              {strategy.sequence.map((step, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />}
                  <span
                    style={{
                      padding: '0.25rem 0.625rem',
                      backgroundColor: 'var(--color-bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {step}
                  </span>
                </React.Fragment>
              ))}
            </div>
            {strategy.conditional && strategy.condition && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                Condition: {strategy.condition}
              </div>
            )}
          </div>
        )}

        {/* Reasoning Summary */}
        {reasoning && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Governor Summary: </strong>
            {reasoning}
          </div>
        )}

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRequestReplan(approval)}
            icon={<RefreshCw size={14} />}
            disabled={busy}
          >
            Request Re-Plan
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(approval)}
            icon={<XCircle size={14} style={{ color: 'var(--color-danger)' }} />}
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}
            disabled={busy}
          >
            Reject {approval.experiment_id}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => onApprove(approval)}
            icon={<CheckCircle2 size={16} />}
            disabled={busy}
          >
            Approve and start {approval.experiment_id}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
