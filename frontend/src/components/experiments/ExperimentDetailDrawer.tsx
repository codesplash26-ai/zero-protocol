import React from 'react';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import type { Experiment } from '../../mock/pulseboard';
import { X, GitBranch, Target, ShieldCheck, AlertCircle } from 'lucide-react';

export interface ExperimentDetailDrawerProps {
  experiment: Experiment | null;
  onClose: () => void;
}

export const ExperimentDetailDrawer: React.FC<ExperimentDetailDrawerProps> = ({
  experiment,
  onClose,
}) => {
  if (!experiment) return null;

  const getStatusBadge = (exp: Experiment) => {
    if (exp.dependencies && exp.dependencies.length > 0) {
      return <Badge variant="teal">Conditional</Badge>;
    }
    switch (exp.status) {
      case 'PROPOSED':
        return <Badge variant="default">Proposed</Badge>;
      case 'APPROVED':
        return <Badge variant="teal">Approved</Badge>;
      case 'RUNNING':
        return <Badge variant="info">Running</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="default">{exp.status}</Badge>;
    }
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {getStatusBadge(experiment)}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                ID: {experiment.id}
              </span>
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
          {/* Missing Fields Banner if any */}
          {experiment.missing_fields && experiment.missing_fields.length > 0 && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-warning-bg)',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                color: 'var(--color-warning)',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div>
                <strong>Missing Information:</strong> {experiment.missing_fields.join(', ')}
              </div>
            </div>
          )}

          {/* Objective & Description */}
          <div>
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
              OBJECTIVE & DESCRIPTION
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
              {experiment.objective || experiment.short_description || 'Not specified'}
            </p>
          </div>

          {/* Hypothesis */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-accent-blue)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.25rem',
              }}
            >
              CORE HYPOTHESIS
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.5 }}>
              "{experiment.hypothesis || 'Not specified'}"
            </div>
          </div>

          {/* Core Resource Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                ESTIMATED COST (USD)
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {experiment.cost_usd !== null ? `$${experiment.cost_usd.toLocaleString()}` : <span style={{ color: 'var(--color-text-muted)' }}>Not specified</span>}
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                ENGINEERING EFFORT
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {experiment.engineering_hours !== null ? `${experiment.engineering_hours}h` : <span style={{ color: 'var(--color-text-muted)' }}>Not specified</span>}
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                TRAFFIC REQUIRED
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {experiment.traffic_required !== null ? `${experiment.traffic_required.toLocaleString()} sessions` : <span style={{ color: 'var(--color-text-muted)' }}>Not specified</span>}
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                ESTIMATED DURATION
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {experiment.duration || <span style={{ color: 'var(--color-text-muted)' }}>Not specified</span>}
              </div>
            </div>
          </div>

          {/* Dependencies */}
          <div>
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
              DEPENDENCIES
            </div>
            {experiment.dependencies && experiment.dependencies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {experiment.dependencies.map((dep, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
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
                    <GitBranch size={14} />
                    <span>Prerequisite Experiment ID: {dep}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                No external experiment dependencies (Independent).
              </div>
            )}
          </div>

          {/* Success Threshold & Decision Unlocked */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                SUCCESS THRESHOLD
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
                {experiment.success_threshold || <span style={{ color: 'var(--color-text-muted)' }}>Not specified</span>}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Target size={12} style={{ color: 'var(--color-accent-blue)' }} />
                <span>DECISION ROLE</span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent-blue)', marginTop: '0.125rem' }}>
                {experiment.decision_role}
              </div>
            </div>
          </div>

          {/* Provenance */}
          {experiment.provenance && (
            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <ShieldCheck size={14} style={{ color: 'var(--color-governor-teal)' }} />
                <span>Source: {experiment.provenance.source}</span>
              </div>
              <span>Quality: {experiment.provenance.quality}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
