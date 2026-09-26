import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { StrategyView } from '../../types/contract';
import { formatUsd } from '../../lib/format';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, DollarSign, Cpu, TrendingUp } from 'lucide-react';

export interface StrategyCardProps {
  strategy: StrategyView;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  isSelected = false,
  onSelect,
}) => {
  const getStatusBadge = (status: StrategyView['evaluation_status']) => {
    switch (status) {
      case 'RECOMMENDED':
        return (
          <Badge variant="teal" size="md">
            <CheckCircle2 size={13} />
            <span>Governor Recommended</span>
          </Badge>
        );
      case 'ALTERNATIVE':
        return (
          <Badge variant="info" size="md">
            <AlertTriangle size={13} />
            <span>Feasible Alternative</span>
          </Badge>
        );
      case 'INFEASIBLE':
        return (
          <Badge variant="danger" size="md">
            <XCircle size={13} />
            <span>Constraint Violation</span>
          </Badge>
        );
      default:
        return <Badge variant="default" size="md">{status}</Badge>;
    }
  };

  const isRecommended = strategy.evaluation_status === 'RECOMMENDED';
  const isInfeasible = strategy.evaluation_status === 'INFEASIBLE';
  const { consequences, feasibility } = strategy;

  return (
    <Card
      padding="lg"
      style={{
        border: isSelected
          ? '2px solid var(--color-accent-blue)'
          : isRecommended
          ? '1px solid #99F6E4'
          : isInfeasible
          ? '1px solid #FECACA'
          : '1px solid var(--color-border)',
        backgroundColor: isInfeasible ? '#FFFBFB' : 'var(--color-card)',
        opacity: isInfeasible ? 0.85 : 1,
        transition: 'all 0.15s ease-in-out',
        cursor: onSelect && !isInfeasible ? 'pointer' : 'default',
        boxShadow: isRecommended ? '0 4px 12px -2px rgba(15, 118, 110, 0.08)' : 'var(--shadow-sm)',
      }}
      onClick={() => onSelect && !isInfeasible && onSelect()}
    >
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CardTitle style={{ fontSize: '1.0625rem' }}>{strategy.title} (ID: {strategy.id})</CardTitle>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
              {strategy.subtitle}
            </div>
          </div>
        </div>

        <div>{getStatusBadge(strategy.evaluation_status)}</div>
      </CardHeader>

      <CardContent style={{ marginTop: '0.875rem' }}>
        {/* Execution Sequence Step Flow */}
        <div
          style={{
            padding: '0.75rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.375rem',
            }}
          >
            EXECUTION SEQUENCE (EXPERIMENTS: {strategy.experiment_ids.join(', ')})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            {strategy.sequence.map((step, idx) => (
              <React.Fragment key={idx}>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-main)',
                    backgroundColor: '#FFFFFF',
                    padding: '0.25rem 0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {step}
                </span>
                {idx < strategy.sequence.length - 1 && (
                  <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isRecommended ? 'var(--color-governor-teal-light)' : 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={12} style={{ color: 'var(--color-success)' }} />
              <span>EXPECTED IMPACT</span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
              {strategy.expected_impact ?? <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Not estimated</span>}
            </div>
          </div>

          <div
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Cpu size={12} style={{ color: 'var(--color-accent-blue)' }} />
              <span>ENG HOURS</span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isInfeasible ? 'var(--color-danger)' : 'var(--color-text-main)', marginTop: '0.125rem' }}>
              {strategy.engineering_hours}h
            </div>
          </div>

          <div
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <DollarSign size={12} style={{ color: 'var(--color-warning)' }} />
              <span>EST. COST</span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
              {formatUsd(strategy.cost_usd)}
            </div>
          </div>
        </div>

        {/* Deterministic consequences (backend feasibility + consequence engines) */}
        <div
          style={{
            padding: '0.75rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            marginBottom: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.25rem',
            }}
          >
            CONSEQUENCES (STATE v{consequences.evaluated_state_version})
          </div>
          <div>
            Remaining after selection:{' '}
            <strong style={{ color: 'var(--color-text-main)' }}>{formatUsd(consequences.remaining_budget_usd)}</strong>,{' '}
            <strong style={{ color: 'var(--color-text-main)' }}>{consequences.remaining_engineering_hours}h</strong> engineering,{' '}
            <strong style={{ color: 'var(--color-text-main)' }}>{consequences.remaining_traffic.toLocaleString()}</strong> sessions
          </div>
          <div>
            Delay: <strong style={{ color: 'var(--color-text-main)' }}>{consequences.delay_days} days</strong> · Affected
            commitments:{' '}
            <strong style={{ color: 'var(--color-text-main)' }}>
              {consequences.affected_commitments.length ? consequences.affected_commitments.join(', ') : 'None'}
            </strong>{' '}
            · Traffic used: <strong style={{ color: 'var(--color-text-main)' }}>{strategy.traffic_required.toLocaleString()}</strong>
          </div>
          {feasibility.violations.length > 0 && (
            <div style={{ color: 'var(--color-danger)', marginTop: '0.25rem' }}>
              <strong>Constraint violations:</strong> {feasibility.violations.join('; ')}
            </div>
          )}
        </div>

        {/* Advantage & Tradeoff Notes */}
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
            Key Advantage: <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>{strategy.key_advantage}</span>
          </div>
          {strategy.tradeoff_note && (
            <div style={{ marginTop: '0.25rem', color: isInfeasible ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
              <strong>Note:</strong> {strategy.tradeoff_note}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
