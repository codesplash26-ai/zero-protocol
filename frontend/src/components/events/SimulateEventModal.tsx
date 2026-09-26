import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Commitment, EventCreateRequest, EventType, Experiment, ExperimentOutcome } from '../../types/contract';
import { Zap, X, PlusCircle, Info } from 'lucide-react';

/** Event facts entered by the founder; the page adds occurred_at and expected_state_version. */
export type SimulatedEventInput = Omit<EventCreateRequest, 'occurred_at' | 'expected_state_version'>;

export interface SimulateEventModalProps {
  experiments: Experiment[];
  commitments: Commitment[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onEmitEvent: (event: SimulatedEventInput) => void;
}

const TYPE_HELP: Record<EventType, string> = {
  CAPACITY_CHANGE:
    'Engineering delta is signed: positive frees or adds capacity, negative removes it (a new 12h block is −12). Selecting a commitment changes its reservation; leaving it empty changes total capacity.',
  COMMITMENT_CHANGE: 'Changes the reserved hours of one commitment. Positive releases hours, negative reserves more.',
  EXPERIMENT_RESULT: 'Records the outcome of a RUNNING experiment and completes it. Only SUCCESS unlocks dependent experiments.',
  BUDGET_CHANGE: 'Changes the allocatable experiment budget. Positive adds budget, negative removes it.',
  DEPENDENCY_CHANGE: 'Records a change to an experiment’s prerequisites. Describe the change below.',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '0.375rem',
};

const control: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8125rem',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-main)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export const SimulateEventModal: React.FC<SimulateEventModalProps> = ({
  experiments,
  commitments,
  submitting,
  error,
  onClose,
  onEmitEvent,
}) => {
  const running = experiments.filter((item) => item.status === 'RUNNING');
  const [eventType, setEventType] = useState<EventType>('CAPACITY_CHANGE');
  const [description, setDescription] = useState('');
  const [engDelta, setEngDelta] = useState('');
  const [budgetDelta, setBudgetDelta] = useState('');
  const [experimentId, setExperimentId] = useState('');
  const [outcome, setOutcome] = useState<ExperimentOutcome>('SUCCESS');
  const [commitmentId, setCommitmentId] = useState('');
  const [source, setSource] = useState('founder_simulation');

  const usesEngineering = eventType === 'CAPACITY_CHANGE' || eventType === 'COMMITMENT_CHANGE';
  const usesCommitment = usesEngineering;
  const usesExperiment = eventType === 'EXPERIMENT_RESULT' || eventType === 'DEPENDENCY_CHANGE';
  const experimentChoices = eventType === 'EXPERIMENT_RESULT' ? running : experiments;
  const selectedExperiment = experimentChoices.some((item) => item.id === experimentId) ? experimentId : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Send only the facts the backend accepts for this event type.
    onEmitEvent({
      event_type: eventType,
      description: description.trim(),
      engineering_delta_hours: usesEngineering ? Number(engDelta) : 0,
      budget_delta_usd: eventType === 'BUDGET_CHANGE' ? Number(budgetDelta) : 0,
      experiment_id: usesExperiment ? selectedExperiment || null : null,
      experiment_outcome: eventType === 'EXPERIMENT_RESULT' ? outcome : null,
      commitment_id: usesCommitment && commitmentId ? commitmentId : null,
      source: source.trim() || 'founder_simulation',
    });
  };

  const canSubmit =
    description.trim().length > 0 &&
    !submitting &&
    (!usesExperiment || selectedExperiment !== '') &&
    (!usesEngineering || (engDelta !== '' && Number(engDelta) !== 0)) &&
    (eventType !== 'COMMITMENT_CHANGE' || commitmentId !== '') &&
    (eventType !== 'BUDGET_CHANGE' || (budgetDelta !== '' && Number(budgetDelta) !== 0));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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
              <Zap size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.125rem' }}>Simulate System Event</CardTitle>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Records a real event against the current organization state
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={fieldLabel}>Event Type</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} style={control}>
                <option value="CAPACITY_CHANGE">CAPACITY_CHANGE (Engineering / Vendor Delay)</option>
                <option value="EXPERIMENT_RESULT">EXPERIMENT_RESULT (Experiment Outcome)</option>
                <option value="BUDGET_CHANGE">BUDGET_CHANGE (Capital Allocation)</option>
                <option value="DEPENDENCY_CHANGE">DEPENDENCY_CHANGE (Technical Prerequisite)</option>
                <option value="COMMITMENT_CHANGE">COMMITMENT_CHANGE (Roadmap Shield)</option>
              </select>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem', lineHeight: 1.4 }}>
                {TYPE_HELP[eventType]}
              </div>
            </div>

            <div>
              <label style={fieldLabel}>Event Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                required
                placeholder="What happened?"
                style={{ ...control, resize: 'none' }}
              />
            </div>

            {usesExperiment && (
              <div style={{ display: 'grid', gridTemplateColumns: eventType === 'EXPERIMENT_RESULT' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                <div>
                  <label style={fieldLabel}>Experiment *</label>
                  <select value={selectedExperiment} onChange={(e) => setExperimentId(e.target.value)} style={control}>
                    <option value="">
                      {experimentChoices.length ? 'Select an experiment' : 'No RUNNING experiment'}
                    </option>
                    {experimentChoices.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} — {item.name} ({item.status})
                      </option>
                    ))}
                  </select>
                </div>
                {eventType === 'EXPERIMENT_RESULT' && (
                  <div>
                    <label style={fieldLabel}>Outcome *</label>
                    <select value={outcome} onChange={(e) => setOutcome(e.target.value as ExperimentOutcome)} style={control}>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAILURE">FAILURE</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {usesEngineering && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={fieldLabel}>Eng Delta Hours (+ / −) *</label>
                  <input
                    type="number"
                    step={1}
                    value={engDelta}
                    onChange={(e) => setEngDelta(e.target.value)}
                    placeholder="e.g. 18 or -12"
                    style={control}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Commitment{eventType === 'COMMITMENT_CHANGE' ? ' *' : ''}</label>
                  <select value={commitmentId} onChange={(e) => setCommitmentId(e.target.value)} style={control}>
                    <option value="">{eventType === 'COMMITMENT_CHANGE' ? 'Select a commitment' : 'None (total capacity)'}</option>
                    {commitments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.reserved_engineering_hours}h reserved)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {eventType === 'BUDGET_CHANGE' && (
              <div>
                <label style={fieldLabel}>Budget Delta USD (+ / −) *</label>
                <input
                  type="number"
                  step={1}
                  value={budgetDelta}
                  onChange={(e) => setBudgetDelta(e.target.value)}
                  placeholder="e.g. 500 or -500"
                  style={control}
                />
              </div>
            )}

            <div>
              <label style={fieldLabel}>Source</label>
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} style={control} />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.75rem',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.4,
              }}
            >
              <Info size={14} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--color-governor-teal)' }} />
              Materiality is not chosen here: the backend applies the event, increments the state version and then
              calculates deterministic materiality.
            </div>

            {error && (
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
                {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.625rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" icon={<PlusCircle size={16} />} disabled={!canSubmit}>
                {submitting ? 'Recording…' : 'Record Event'}
              </Button>
            </div>
          </CardContent>
        </form>
      </div>
    </div>
  );
};
