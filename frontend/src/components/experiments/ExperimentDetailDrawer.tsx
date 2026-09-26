import React from 'react';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import type { Experiment } from '../../types/contract';
import { ExperimentStatusBadge } from './ExperimentStatusBadge';
import { useApiResource } from '../../hooks/useApiResource';
import { api } from '../../api/endpoints';
import { formatUsd, formatDateTime } from '../../lib/format';
import { describeApiError } from '../../lib/apiErrors';
import { X, GitBranch, Target, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

export interface ExperimentDetailDrawerProps {
  experiment: Experiment | null;
  /** All experiments, used to show whether each dependency is satisfied. */
  experiments: Experiment[];
  onClose: () => void;
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.375rem',
};

const tile: React.CSSProperties = {
  padding: '0.75rem',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
};

const OUTCOME_LABELS: Record<Experiment['outcome'], string> = {
  PENDING: 'Pending',
  SUCCESS: 'Success',
  FAILURE: 'Failure',
};

export const ExperimentDetailDrawer: React.FC<ExperimentDetailDrawerProps> = ({ experiment, experiments, onClose }) => {
  const evidence = useApiResource(
    experiment ? `evidence:${experiment.id}` : null,
    () => api.listEvidence({ experiment_id: experiment!.id, limit: 200 }),
  );

  if (!experiment) return null;

  const byId = new Map(experiments.map((item) => [item.id, item]));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          zIndex: 40,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Right Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <ExperimentStatusBadge experiment={experiment} />
              {experiment.dependencies.length > 0 && (
                <Badge variant="teal" size="sm">
                  <GitBranch size={12} />
                  <span>Gated on {experiment.dependencies.join(', ')}</span>
                </Badge>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {experiment.id}</span>
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                marginTop: '0.375rem',
                lineHeight: 1.3,
              }}
            >
              {experiment.name}
            </h2>
          </div>

          <IconButton icon={<X size={20} />} ariaLabel="Close drawer" onClick={onClose} />
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Decision role */}
          <div>
            <div style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Target size={12} style={{ color: 'var(--color-accent-blue)' }} />
              <span>DECISION ROLE</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
              {experiment.decision_role ?? <span style={{ color: 'var(--color-text-muted)' }}>Not specified</span>}
            </p>
          </div>

          {/* Core Resource Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={tile}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ESTIMATED COST (USD)</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {formatUsd(experiment.cost_usd)}
              </div>
            </div>
            <div style={tile}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ENGINEERING EFFORT</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {experiment.engineering_hours}h
              </div>
            </div>
            <div style={tile}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>TRAFFIC REQUIRED</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {experiment.traffic_required.toLocaleString()} sessions
              </div>
            </div>
            <div style={tile}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>OUTCOME</div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  marginTop: '0.125rem',
                  color:
                    experiment.outcome === 'SUCCESS'
                      ? 'var(--color-success)'
                      : experiment.outcome === 'FAILURE'
                        ? 'var(--color-danger)'
                        : 'var(--color-text-muted)',
                }}
              >
                {OUTCOME_LABELS[experiment.outcome]}
              </div>
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <div style={sectionLabel}>DEPENDENCIES</div>
            {experiment.dependencies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {experiment.dependencies.map((dep) => {
                  const prerequisite = byId.get(dep);
                  // Contract rule: only COMPLETED + SUCCESS satisfies a dependency.
                  const satisfied = prerequisite?.status === 'COMPLETED' && prerequisite.outcome === 'SUCCESS';
                  return (
                    <div
                      key={dep}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-governor-teal-light)',
                        border: '1px solid #99F6E4',
                        fontSize: '0.8125rem',
                        color: 'var(--color-governor-teal)',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <GitBranch size={14} />
                        Prerequisite {dep}
                        {prerequisite ? ` (${prerequisite.name})` : ''}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          color: satisfied ? 'var(--color-success)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {satisfied ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {satisfied ? 'Satisfied' : 'Not yet satisfied'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                No external experiment dependencies (Independent).
              </div>
            )}
          </div>

          {/* Evidence recorded for this experiment */}
          <div>
            <div style={sectionLabel}>RECORDED EVIDENCE</div>
            {evidence.isLoading ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Loading evidence…</div>
            ) : evidence.error ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{describeApiError(evidence.error)}</div>
            ) : evidence.data && evidence.data.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {evidence.data.items.map((item) => (
                  <div key={item.id} style={{ ...tile, padding: '0.75rem 0.875rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <ShieldCheck size={14} style={{ color: 'var(--color-governor-teal)' }} />
                        {item.source} · {item.id}
                      </span>
                      <span>Quality: {item.quality}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                      {item.content}
                    </div>
                    {item.retrieved_at && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Retrieved {formatDateTime(item.retrieved_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                No evidence has been recorded for this experiment.
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
