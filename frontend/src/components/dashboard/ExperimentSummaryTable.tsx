import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import type { Experiment } from '../../types/contract';
import { ExperimentStatusBadge } from '../experiments/ExperimentStatusBadge';
import { formatUsd } from '../../lib/format';
import { FlaskConical, ArrowRight } from 'lucide-react';

export interface ExperimentSummaryTableProps {
  experiments: Experiment[];
}

export const ExperimentSummaryTable: React.FC<ExperimentSummaryTableProps> = ({ experiments }) => {
  const navigate = useNavigate();

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
              CANDIDATE PIPELINE
            </div>
            <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
              Experiments
            </CardTitle>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/experiments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-accent-blue)',
            cursor: 'pointer',
            padding: '0.375rem 0.625rem',
            borderRadius: 'var(--radius-md)',
            transition: 'background-color 0.15s ease',
          }}
          className="eg-table-link"
        >
          <span>View all experiments</span>
          <ArrowRight size={14} />
        </button>
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
              <th style={{ padding: '0.75rem 0 0.75rem 1rem', textAlign: 'right' }}>Traffic</th>
            </tr>
          </thead>
          <tbody>
            {experiments.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '1rem 0', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
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
                <td style={{ padding: '0.875rem 1rem 0.875rem 0', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  <div>{exp.name} (ID: {exp.id})</div>
                  {exp.dependencies && exp.dependencies.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '0.125rem' }}>
                      Depends on: {exp.dependencies.join(', ')}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <ExperimentStatusBadge experiment={exp} />
                </td>
                <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {formatUsd(exp.cost_usd)}
                </td>
                <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)' }}>
                  {exp.engineering_hours}h
                </td>
                <td style={{ padding: '0.875rem 0 0.875rem 1rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                  {exp.traffic_required.toLocaleString()} sessions
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .eg-table-link:hover {
          background-color: var(--color-accent-blue-light) !important;
        }
      `}</style>
    </Card>
  );
};
