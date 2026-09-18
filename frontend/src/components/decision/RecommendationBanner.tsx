import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface RecommendationBannerProps {
  recommendedTitle: string;
  reasoning: string;
  onApprove?: () => void;
}

export const RecommendationBanner: React.FC<RecommendationBannerProps> = ({
  recommendedTitle,
  reasoning,
  onApprove,
}) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onApprove) {
      onApprove();
    } else {
      navigate('/approvals');
    }
  };

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
              GOVERNOR OPTIMIZATION RECOMMENDATION
            </div>
            <CardTitle style={{ fontSize: '1.125rem', marginTop: '0.125rem' }}>
              Optimal Strategy: {recommendedTitle}
            </CardTitle>
          </div>
        </div>

        <Badge variant="teal" size="md">
          <CheckCircle2 size={13} />
          <span>CP-SAT Validated</span>
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
          {reasoning}
        </p>

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
            <strong>Action Required:</strong> Submit recommendation to Governance Approval Queue.
          </div>

          <Button
            variant="teal"
            size="md"
            icon={<ArrowRight size={16} />}
            iconPosition="right"
            onClick={handleAction}
          >
            Request Founder Approval
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
