import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Goal } from '../../mock/pulseboard';
import { Target, ArrowRight, Calendar, GitPullRequest } from 'lucide-react';

export interface DecisionSummaryCardProps {
  goal: Goal;
  recommendationState: string;
}

export const DecisionSummaryCard: React.FC<DecisionSummaryCardProps> = ({ goal, recommendationState }) => {
  const navigate = useNavigate();

  return (
    <Card padding="lg" style={{ borderLeft: '4px solid var(--color-accent-blue)' }}>
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
            <Target size={18} />
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
              ACTIVE STRATEGIC DECISION
            </div>
            <CardTitle style={{ fontSize: '1.125rem', marginTop: '0.125rem' }}>Current Decision</CardTitle>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge variant="info">
            <Calendar size={12} />
            <span>Horizon: {goal.horizon_weeks} weeks</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent style={{ marginTop: '0.75rem' }}>
        {/* Goal Description */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.25rem',
            }}
          >
            Goal Statement (ID: {goal.id})
          </div>
          <div
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              lineHeight: 1.5,
            }}
          >
            "{goal.text}"
          </div>
        </div>

        {/* Recommendation State & Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <GitPullRequest size={14} style={{ color: 'var(--color-governor-teal)' }} />
              <span>Current Recommendation State:</span>
            </div>
            <div
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'var(--color-governor-teal)',
                marginTop: '0.125rem',
              }}
            >
              {recommendationState}
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={<ArrowRight size={16} />}
            iconPosition="right"
            onClick={() => navigate('/decision')}
          >
            Open Decision
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
