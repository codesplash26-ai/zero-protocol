import React from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Experiment } from '../../types/contract';
import { ExperimentStatusBadge } from './ExperimentStatusBadge';
import { formatUsd } from '../../lib/format';
import { FlaskConical, Eye, GitBranch } from 'lucide-react';

export interface ExperimentListTableProps {
  experiments: Experiment[];
  onSelectExperiment: (exp: Experiment) => void;
}

export const ExperimentListTable: React.FC<ExperimentListTableProps> = ({
  experiments,
  onSelectExperiment,
}) => {
  return (
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
            <FlaskConical size={18} />
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
              CANDIDATE REPOSITORY
            </div>
            <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
              Experiment Portfolio
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.875rem',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '0.75rem 1rem 0.75rem 0' }}>Experiment</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Cost</th>
              <th style={{ padding: '0.75rem 1rem' }}>Engineering</th>
              <th style={{ padding: '0.75rem 1rem' }}>Traffic</th>
              <th style={{ padding: '0.75rem 1rem' }}>Decision Unlocked</th>
              <th style={{ padding: '0.75rem 0 0.75rem 1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {experiments.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '1rem 0', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                  No experiments have been recorded yet.
                </td>
              </tr>
            )}
            {experiments.map((exp, index) => (
              <tr
                key={exp.id}
                style={{
                  borderBottom: index < experiments.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <td style={{ padding: '1rem 1rem 1rem 0', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  <div>{exp.name} (ID: {exp.id})</div>
                  {exp.dependencies.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.6875rem',
                        color: 'var(--color-governor-teal)',
                        fontWeight: 600,
                        marginTop: '0.25rem',
                      }}
                    >
                      <GitBranch size={12} />
                      <span>Gated on: {exp.dependencies.join(', ')}</span>
                    </div>
                  )}
                </td>

                <td style={{ padding: '1rem' }}>
                  <ExperimentStatusBadge experiment={exp} />
                </td>

                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {formatUsd(exp.cost_usd)}
                </td>

                <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>
                  {exp.engineering_hours}h
                </td>

                <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>
                  {exp.traffic_required.toLocaleString()} sessions
                </td>

                <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {exp.decision_role ?? <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                </td>

                <td style={{ padding: '1rem 0 1rem 1rem', textAlign: 'right' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => onSelectExperiment(exp)}
                  >
                    View details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
