import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { StrategyOption } from '../../mock/pulseboard';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, DollarSign, Cpu, TrendingUp } from 'lucide-react';

export interface StrategyCardProps {
  strategy: StrategyOption;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  isSelected = false,
  onSelect,
}) => {
  const getStatusBadge = (status: StrategyOption['status']) => {
    switch (status) {
      case 'Recommended':
        return (
          <Badge variant="teal" size="md">
            <CheckCircle2 size={13} />
            <span>Governor Recommended</span>
          </Badge>
        );
      case 'Alternative':
        return (
          <Badge variant="info" size="md">
            <AlertTriangle size={13} />
            <span>Feasible Alternative</span>
          </Badge>
        );
      case 'Infeasible':
        return (
          <Badge variant="danger" size="md">
            <XCircle size={13} />
            <span>Constraint Violation</span>
          </Badge>
        );
    }
  };

  const isRecommended = strategy.status === 'Recommended';
  const isInfeasible = strategy.status === 'Infeasible';

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
              <CardTitle style={{ fontSize: '1.0625rem' }}>{strategy.title}</CardTitle>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
              {strategy.subtitle}
            </div>
          </div>
        </div>

        <div>{getStatusBadge(strategy.status)}</div>
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
            EXECUTION SEQUENCE
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
              {strategy.expectedImpact}
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
              {strategy.engineeringHours}h
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
              ${strategy.cost.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Advantage & Tradeoff Notes */}
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
            Key Advantage: <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>{strategy.keyAdvantage}</span>
          </div>
          {strategy.tradeoffNote && (
            <div style={{ marginTop: '0.25rem', color: isInfeasible ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
              <strong>Note:</strong> {strategy.tradeoffNote}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
