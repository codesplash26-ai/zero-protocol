import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import type { Commitment, Goal } from '../../types/contract';
import { api } from '../../api/endpoints';
import { describeApiError } from '../../lib/apiErrors';
import { X, Target, CheckCircle2 } from 'lucide-react';

interface GoalTemplate {
  label: string;
  text: string;
  horizonWeeks: number;
}

/** Starting points only; the founder can edit the text before saving. */
const TEMPLATES: GoalTemplate[] = [
  {
    label: 'Original PulseBoard goal',
    text: 'Choose our next four-week growth strategy without delaying the enterprise SSO commitment.',
    horizonWeeks: 4,
  },
  {
    label: 'Increase paid conversions',
    text: 'Increase paid conversions within four weeks without delaying the enterprise SSO commitment.',
    horizonWeeks: 4,
  },
  {
    label: 'Improve activation',
    text: 'Improve activation of new sign-ups within six weeks using the lowest-cost experiments first.',
    horizonWeeks: 6,
  },
  {
    label: 'Grow referrals',
    text: 'Grow referrals and word of mouth within eight weeks while keeping engineering focused on committed work.',
    horizonWeeks: 8,
  },
];

export interface ChangeGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: Goal | null;
  commitments: Commitment[];
  /** Current organization state_version, required by POST /goals. */
  stateVersion: number | null;
  /** Called with the backend-created goal; the page refreshes shared state. */
  onCreated: (goal: Goal) => void;
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--color-text-main)',
  marginBottom: '0.375rem',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '0.5625rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  color: 'var(--color-text-main)',
  backgroundColor: '#FFFFFF',
};

const Form: React.FC<Omit<ChangeGoalModalProps, 'isOpen'>> = ({
  onClose,
  currentGoal,
  commitments,
  stateVersion,
  onCreated,
}) => {
  const [text, setText] = useState(currentGoal?.text ?? '');
  const [horizon, setHorizon] = useState(String(currentGoal?.horizon_weeks ?? 4));
  const [protectedIds, setProtectedIds] = useState<string[]>(
    currentGoal?.protected_commitments ?? commitments.filter((item) => item.protected).map((item) => item.id),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<Goal | null>(null);

  const horizonWeeks = Number(horizon);
  const unchanged =
    !!currentGoal &&
    text.trim() === currentGoal.text &&
    horizonWeeks === currentGoal.horizon_weeks &&
    [...protectedIds].sort().join() === [...currentGoal.protected_commitments].sort().join();
  const canSubmit =
    text.trim().length > 0 && Number.isInteger(horizonWeeks) && horizonWeeks > 0 && stateVersion !== null && !unchanged && !submitting;

  const toggle = (id: string) =>
    setProtectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || stateVersion === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const goal = await api.createGoal({
        text: text.trim(),
        horizon_weeks: horizonWeeks,
        protected_commitments: protectedIds,
        expected_state_version: stateVersion,
      });
      setCreated(goal);
      onCreated(goal);
      setTimeout(onClose, 1000);
    } catch (caught) {
      setSubmitError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <CardContent style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <CheckCircle2 size={36} style={{ color: 'var(--color-success)' }} />
        <div style={{ fontWeight: 700, marginTop: '0.75rem' }}>Goal saved ({created.id})</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Run the Governor to build a plan for it.
        </div>
      </CardContent>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
        <div>
          <span style={fieldLabel}>Start from a template</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {TEMPLATES.map((template) => (
              <Button
                key={template.label}
                type="button"
                variant={text.trim() === template.text ? 'teal' : 'outline'}
                size="sm"
                onClick={() => {
                  setText(template.text);
                  setHorizon(String(template.horizonWeeks));
                }}
              >
                {template.label}
              </Button>
            ))}
          </div>
        </div>

        <label>
          <span style={fieldLabel}>Goal</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="What should the next experiments achieve, and by when?"
            style={{ ...input, resize: 'vertical' }}
          />
        </label>

        <label style={{ maxWidth: '12rem' }}>
          <span style={fieldLabel}>Time horizon (weeks)</span>
          <input type="number" min={1} step={1} value={horizon} onChange={(e) => setHorizon(e.target.value)} style={input} />
        </label>

        {commitments.length > 0 && (
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={fieldLabel}>Commitments the plan must not delay</legend>
            {commitments.map((commitment) => (
              <label
                key={commitment.id}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.25rem 0' }}
              >
                <input type="checkbox" checked={protectedIds.includes(commitment.id)} onChange={() => toggle(commitment.id)} />
                {commitment.name}
                <span style={{ color: 'var(--color-text-muted)' }}>({commitment.reserved_engineering_hours}h reserved)</span>
              </label>
            ))}
          </fieldset>
        )}

        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
          Saving records a new goal. The current plan was made for the previous goal, so run the Governor again
          afterwards. Budget, hours and dependencies still decide what is feasible.
        </p>

        {submitError && (
          <div role="alert" style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>
            {submitError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={<Target size={16} />} disabled={!canSubmit}>
            {submitting ? 'Saving…' : 'Save goal'}
          </Button>
        </div>
      </CardContent>
    </form>
  );
};

/** Lets the founder set a new decision target through POST /goals. */
export const ChangeGoalModal: React.FC<ChangeGoalModalProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return (
    <>
      <div
        onClick={props.onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 40, backdropFilter: 'blur(3px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Change goal"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(600px, calc(100vw - 2rem))',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          padding: '1.5rem',
        }}
      >
        <CardHeader>
          <CardTitle>Change goal</CardTitle>
          <IconButton icon={<X size={18} />} ariaLabel="Close" onClick={props.onClose} />
        </CardHeader>
        {/* Mounted per opening, so the form starts from the current goal each time. */}
        <Form {...props} />
      </div>
    </>
  );
};
