import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Event, EventType } from '../../mock/pulseboard';
import { Zap, X, PlusCircle } from 'lucide-react';

export interface SimulateEventModalProps {
  onClose: () => void;
  onEmitEvent: (event: Omit<Event, 'id' | 'state_version'>, isMaterial: boolean, reason: string) => void;
}

export const SimulateEventModal: React.FC<SimulateEventModalProps> = ({
  onClose,
  onEmitEvent,
}) => {
  const [eventType, setEventType] = useState<EventType>('CAPACITY_CHANGE');
  const [description, setDescription] = useState('SSO Vendor reports additional 12-hour API schema dependency block.');
  const [engDelta, setEngDelta] = useState<number>(12);
  const [budgetDelta, setBudgetDelta] = useState<number>(0);
  const [isMaterial, setIsMaterial] = useState<boolean>(true);
  const [reason, setReason] = useState('Available engineering capacity drops below strategy threshold.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEmitEvent(
      {
        event_type: eventType,
        description,
        engineering_delta_hours: Number(engDelta),
        budget_delta_usd: Number(budgetDelta),
        timestamp: 'Just now',
        source: 'Simulated System Trigger',
      },
      isMaterial,
      reason
    );
  };

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
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
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
                Test Observe-Adapt Event Feed & Materiality Classification
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Event Type Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                Event Type
              </label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value as EventType)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                }}
              >
                <option value="CAPACITY_CHANGE">CAPACITY_CHANGE (Engineering / Vendor Delay)</option>
                <option value="EXPERIMENT_RESULT">EXPERIMENT_RESULT (Cohort Telemetry)</option>
                <option value="BUDGET_CHANGE">BUDGET_CHANGE (Capital Allocation)</option>
                <option value="DEPENDENCY_CHANGE">DEPENDENCY_CHANGE (Technical Prerequisite)</option>
                <option value="COMMITMENT_CHANGE">COMMITMENT_CHANGE (Roadmap Shield)</option>
              </select>
            </div>

            {/* Description Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                Event Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* Resource Deltas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                  Eng Delta Hours (+ / -)
                </label>
                <input
                  type="number"
                  value={engDelta}
                  onChange={e => setEngDelta(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    backgroundColor: 'var(--color-bg-subtle)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                  Budget Delta USD (+ / -)
                </label>
                <input
                  type="number"
                  value={budgetDelta}
                  onChange={e => setBudgetDelta(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    backgroundColor: 'var(--color-bg-subtle)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Materiality Toggle */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                <input
                  type="checkbox"
                  checked={isMaterial}
                  onChange={e => setIsMaterial(e.target.checked)}
                />
                Mark as Potentially Material Event (Triggers Governor Re-Plan)
              </label>

              {isMaterial && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                    Materiality Reason
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      fontSize: '0.75rem',
                      backgroundColor: 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
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
              <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" icon={<PlusCircle size={16} />}>
                Emit Simulated Event
              </Button>
            </div>
          </CardContent>
        </form>
      </div>
    </div>
  );
};
