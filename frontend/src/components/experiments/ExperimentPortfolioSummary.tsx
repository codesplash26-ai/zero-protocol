import React from 'react';
import { Card } from '../ui/Card';
import type { Experiment } from '../../mock/pulseboard';
import { FlaskConical, FileText, GitBranch, PlayCircle } from 'lucide-react';

export interface ExperimentPortfolioSummaryProps {
  experiments: Experiment[];
}

export const ExperimentPortfolioSummary: React.FC<ExperimentPortfolioSummaryProps> = ({
  experiments,
}) => {
  const total = experiments.length;
  const proposed = experiments.filter((e) => e.status === 'PROPOSED').length;
  const conditional = experiments.filter((e) => e.dependencies && e.dependencies.length > 0).length;
  const running = experiments.filter((e) => e.status === 'RUNNING').length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}
    >
      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
              TOTAL EXPERIMENTS
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                letterSpacing: '-0.02em',
                marginTop: '0.25rem',
                lineHeight: 1.2,
              }}
            >
              {total}
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-accent-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-blue)',
            }}
          >
            <FlaskConical size={20} />
          </div>
        </div>
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          Candidate portfolio size
        </div>
      </Card>

      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
              PROPOSED
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                letterSpacing: '-0.02em',
                marginTop: '0.25rem',
                lineHeight: 1.2,
              }}
            >
              {proposed}
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            <FileText size={20} />
          </div>
        </div>
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          Awaiting strategy evaluation
        </div>
      </Card>

      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
              CONDITIONAL / GATED
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-governor-teal)',
                letterSpacing: '-0.02em',
                marginTop: '0.25rem',
                lineHeight: 1.2,
              }}
            >
              {conditional}
            </div>
          </div>
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
            <GitBranch size={20} />
          </div>
        </div>
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          Gated on prior experiment outcomes
        </div>
      </Card>

      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
              RUNNING
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                letterSpacing: '-0.02em',
                marginTop: '0.25rem',
                lineHeight: 1.2,
              }}
            >
              {running}
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-success-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
            }}
          >
            <PlayCircle size={20} />
          </div>
        </div>
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          Active in-market execution
        </div>
      </Card>
    </div>
  );
};
