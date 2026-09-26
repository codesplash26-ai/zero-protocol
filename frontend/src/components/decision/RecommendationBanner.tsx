import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Approval, Recommendation, SolverStatus } from '../../types/contract';
import { formatUsd } from '../../lib/format';

export interface RecommendationBannerProps {
  recommendation: Recommendation;
  /** Title of the recommended StrategyView, when the workspace returned it. */
  recommendedTitle: string | null;
  optimizationStatus: SolverStatus | null;
  /** Backend approval record for the current executable experiment, if any. */
  approval: Approval | null;
}

const PLAN_COLUMNS: { key: 'now' | 'next' | 'later' | 'defer'; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'next', label: 'Next' },
  { key: 'later', label: 'Later' },
  { key: 'defer', label: 'Deferred' },
];

/** What the founder must do next, as stated by the backend's approval record. */
function describeAction(recommendation: Recommendation, approval: Approval | null): string {
  const current = recommendation.now[0];
  if (!current) return 'No experiment is executable right now.';
  if (!approval) return `Approval status for experiment ${current} has not been recorded yet.`;
  switch (approval.decision) {
    case 'PENDING':
      return `Founder approval required to start ${approval.experiment_id}: ${approval.reason}`;
    case 'NOT_REQUIRED':
      return `No founder approval required to start ${approval.experiment_id} (${formatUsd(approval.authorized_cost_usd)} is within the ${formatUsd(approval.threshold_usd)} threshold).`;
    case 'APPROVED':
      return `Founder approved starting ${approval.experiment_id}.`;
    case 'REJECTED':
      return `Founder rejected starting ${approval.experiment_id}.`;
    case 'INVALIDATED':
      return `The approval for ${approval.experiment_id} was invalidated by a state change.`;
  }
}

export const RecommendationBanner: React.FC<RecommendationBannerProps> = ({
  recommendation,
  recommendedTitle,
  optimizationStatus,
  approval,
}) => {
  const navigate = useNavigate();
  const pending = approval?.decision === 'PENDING';

  return (
    <Card
      padding="lg"
      style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid #99F6E4',
        borderLeft: '5px solid var(--color-governor-teal)',
        boxShadow: '0 4px 12px -2px rgba(15, 118, 110, 0.08)',
      }}
    >
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-governor-teal-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-governor-teal)',
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-governor-teal)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              GOVERNOR RECOMMENDATION · STATE v{recommendation.state_version}
            </div>
            <CardTitle style={{ fontSize: '1.125rem', marginTop: '0.125rem' }}>
              Recommended Strategy: {recommendedTitle ?? recommendation.recommended_strategy_id}
            </CardTitle>
          </div>
        </div>

        <Badge variant={optimizationStatus ? 'teal' : 'default'} size="md">
          <CheckCircle2 size={13} />
          <span>{optimizationStatus ? `CP-SAT ${optimizationStatus}` : 'No solver result'}</span>
        </Badge>
      </CardHeader>

      <CardContent style={{ marginTop: '0.875rem' }}>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            marginBottom: '1.25rem',
          }}
        >
          {recommendation.reasoning_summary}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {PLAN_COLUMNS.map(({ key, label }) => (
            <div
              key={key}
              style={{
                padding: '0.625rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: key === 'now' ? 'var(--color-governor-teal-light)' : 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.06em' }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {recommendation[key].length ? (
                  recommendation[key].join(', ')
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '0.875rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            <strong>{pending ? 'Action Required:' : 'Next Step:'}</strong> {describeAction(recommendation, approval)}
          </div>

          <Button
            variant="teal"
            size="md"
            icon={<ArrowRight size={16} />}
            iconPosition="right"
            onClick={() => navigate('/approvals')}
          >
            {pending ? 'Review Founder Approval' : 'Open Approvals'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
