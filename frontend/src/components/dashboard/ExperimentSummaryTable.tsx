import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { ExperimentSummaryItem } from '../../mock/pulseboard';
import { FlaskConical, ArrowRight } from 'lucide-react';

export interface ExperimentSummaryTableProps {
  experiments: ExperimentSummaryItem[];
}

export const ExperimentSummaryTable: React.FC<ExperimentSummaryTableProps> = ({ experiments }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: ExperimentSummaryItem['status']) => {
    switch (status) {
      case 'Proposed':
        return <Badge variant="default">Proposed</Badge>;
      case 'Conditional':
        return <Badge variant="teal">Conditional</Badge>;
      case 'Active':
        return <Badge variant="info">Active</Badge>;
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

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
              Active Experiments
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
            {experiments.map((exp, index) => (
              <tr
                key={exp.id}
                style={{
                  borderBottom: index < experiments.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <td style={{ padding: '0.875rem 1rem 0.875rem 0', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  <div>{exp.name}</div>
                  {exp.dependency && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '0.125rem' }}>
                      Depends on: {exp.dependency}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>{getStatusBadge(exp.status)}</td>
                <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  ${exp.cost.toLocaleString()}
                </td>
                <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)' }}>
                  {exp.engineeringHours}h
                </td>
                <td style={{ padding: '0.875rem 0 0.875rem 1rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                  {exp.trafficSessions.toLocaleString()} sessions
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
