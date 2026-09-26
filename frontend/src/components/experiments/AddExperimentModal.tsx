import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import type { Experiment, ExperimentEvidenceInput } from '../../types/contract';
import { api } from '../../api/endpoints';
import { describeApiError } from '../../lib/apiErrors';
import { X, Plus, CheckCircle2 } from 'lucide-react';

export interface AddExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current organization state_version, required by POST /experiments. */
  stateVersion: number | null;
  /** Called with the backend-created experiment; the page refreshes shared state. */
  onCreated: (exp: Experiment) => void;
}

export const AddExperimentModal: React.FC<AddExperimentModalProps> = ({
  isOpen,
  onClose,
  stateVersion,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [costUsd, setCostUsd] = useState('');
  const [engineeringHours, setEngineeringHours] = useState('');
  const [trafficRequired, setTrafficRequired] = useState('');
  const [duration, setDuration] = useState('');
  const [dependencies, setDependencies] = useState('');
  const [successThreshold, setSuccessThreshold] = useState('');
  const [decisionRole, setDecisionRole] = useState('');
  const [created, setCreated] = useState<Experiment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setDescription('');
    setHypothesis('');
    setCostUsd('');
    setEngineeringHours('');
    setTrafficRequired('');
    setDuration('');
    setDependencies('');
    setSuccessThreshold('');
    setDecisionRole('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || stateVersion === null) return;

    // Canonical experiments hold only resources; narrative fields are stored
    // as evidence with provenance (Contract v1.1 §5.13).
    const narrative: [string, string][] = [
      ['Objective', description],
      ['Hypothesis', hypothesis],
      ['Duration', duration],
      ['Success threshold', successThreshold],
    ];
    const evidenceItems: ExperimentEvidenceInput[] = narrative
      .filter(([, value]) => value.trim())
      .map(([label, value]) => ({
        source: 'Manual Founder Input',
        content: `${label}: ${value.trim()}`,
        quality: 'HIGH',
      }));

    setSubmitting(true);
    setSubmitError(null);
    try {
      const experiment = await api.createExperiment({
        name: name.trim(),
        cost_usd: Number(costUsd),
        engineering_hours: Number(engineeringHours),
        traffic_required: Number(trafficRequired),
        dependencies: dependencies
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
        decision_role: decisionRole.trim() || null,
        evidence_items: evidenceItems,
        expected_state_version: stateVersion,
      });
      setCreated(experiment);
      resetForm();
      onCreated(experiment);
      setTimeout(() => {
        setCreated(null);
        onClose();
      }, 1200);
    } catch (caught) {
      setSubmitError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          zIndex: 40,
          backdropFilter: 'blur(3px)',
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '620px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                <Plus size={18} />
              </div>
              <CardTitle style={{ fontSize: '1.125rem' }}>Add Experiment</CardTitle>
            </div>
            <IconButton icon={<X size={20} />} ariaLabel="Close modal" onClick={onClose} />
          </div>
        </CardHeader>

        <CardContent style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {created ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-success)',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                Experiment Created
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Experiment {created.id} was recorded by the backend at state v{stateVersion}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                  Experiment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual-plan Checkout"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                  Description / Objective (stored as evidence)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short objective or description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                  Hypothesis
                </label>
                <input
                  type="text"
                  placeholder="e.g. Offering annual billing upfront will convert 15% of checkout traffic..."
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Cost (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    placeholder="2500"
                    value={costUsd}
                    onChange={(e) => setCostUsd(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Eng Hours (h) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    placeholder="24"
                    value={engineeringHours}
                    onChange={(e) => setEngineeringHours(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Traffic Required *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    placeholder="3500"
                    value={trafficRequired}
                    onChange={(e) => setTrafficRequired(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2 weeks"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Dependencies (IDs, e.g. A, B)
                  </label>
                  <input
                    type="text"
                    placeholder="A"
                    value={dependencies}
                    onChange={(e) => setDependencies(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Success Threshold
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Conversion ≥ 4%"
                    value={successThreshold}
                    onChange={(e) => setSuccessThreshold(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Decision Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monetization model"
                    value={decisionRole}
                    onChange={(e) => setDecisionRole(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid #FECACA',
                    color: 'var(--color-danger)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {submitError}
                </div>
              )}

              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                }}
              >
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting || stateVersion === null}>
                  {submitting ? 'Creating…' : 'Create Experiment'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </div>
    </>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: '#FFFFFF',
  color: 'var(--color-text-main)',
  outline: 'none',
  boxSizing: 'border-box',
};
