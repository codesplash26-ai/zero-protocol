import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import type { DetailedExperiment } from '../../mock/experiments';
import { X, Plus, CheckCircle2 } from 'lucide-react';

export interface AddExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExperiment: (exp: DetailedExperiment) => void;
}

export const AddExperimentModal: React.FC<AddExperimentModalProps> = ({
  isOpen,
  onClose,
  onAddExperiment,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [cost, setCost] = useState('');
  const [engineeringHours, setEngineeringHours] = useState('');
  const [trafficSessions, setTrafficSessions] = useState('');
  const [duration, setDuration] = useState('');
  const [dependencies, setDependencies] = useState('');
  const [successThreshold, setSuccessThreshold] = useState('');
  const [decisionUnlocked, setDecisionUnlocked] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newExp: DetailedExperiment = {
      id: `exp-${Date.now()}`,
      name: name.trim(),
      shortDescription: description.trim() || 'Manual founder experiment entry.',
      objective: description.trim() || 'Manual entry objective.',
      hypothesis: hypothesis.trim() || 'Not specified',
      status: 'Proposed',
      cost: cost ? parseFloat(cost) : null,
      engineeringHours: engineeringHours ? parseFloat(engineeringHours) : null,
      trafficSessions: trafficSessions ? parseInt(trafficSessions, 10) : null,
      duration: duration.trim() || null,
      dependencies: dependencies ? dependencies.split(',').map((d) => d.trim()).filter(Boolean) : [],
      successThreshold: successThreshold.trim() || null,
      decisionUnlocked: decisionUnlocked.trim() || 'General growth validation',
      provenance: {
        source: 'Manual Founder Input',
        confidence: 'High',
      },
      missingFields: [],
    };

    onAddExperiment(newExp);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
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
          {isSubmitted ? (
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
                Normalized experiment added to candidate portfolio.
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
                  Description / Objective
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
                  placeholder="e.g. Offering annual billing will convert 15% of checkout traffic..."
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    placeholder="2500"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Eng Hours (h)
                  </label>
                  <input
                    type="number"
                    placeholder="24"
                    value={engineeringHours}
                    onChange={(e) => setEngineeringHours(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                    Traffic (Sessions)
                  </label>
                  <input
                    type="number"
                    placeholder="3500"
                    value={trafficSessions}
                    onChange={(e) => setTrafficSessions(e.target.value)}
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
                    Dependencies (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Pricing Willingness Test"
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
                    Decision Unlocked
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monetization model"
                    value={decisionUnlocked}
                    onChange={(e) => setDecisionUnlocked(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

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
                <Button variant="primary" type="submit">
                  Create Experiment
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
