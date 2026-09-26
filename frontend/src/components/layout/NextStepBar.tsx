import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useGovernorData } from '../../state/governorContext';
import { computeNextStep } from '../../lib/nextStep';

const TONES = {
  action: { border: 'var(--color-governor-teal)', bg: 'var(--color-governor-teal-light)', color: 'var(--color-governor-teal)' },
  info: { border: 'var(--color-accent-blue)', bg: 'var(--color-accent-blue-light)', color: 'var(--color-accent-blue)' },
  warning: { border: 'var(--color-warning)', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
};

/** "What do I do next?" — shown above every page, computed from live backend state. */
export const NextStepBar: React.FC = () => {
  const { overview, currentRun, materialEvents, goalChanged, error } = useGovernorData();
  const location = useLocation();
  const navigate = useNavigate();

  if (!overview || error) return null;

  const step = computeNextStep(overview, currentRun, materialEvents, goalChanged);
  const tone = TONES[step.tone];
  const onTargetPage = step.action?.to === location.pathname;
  const icon =
    step.tone === 'info' && step.message.startsWith('The Governor is evaluating') ? (
      <Loader2 size={18} className="eg-spin" />
    ) : step.tone === 'warning' ? (
      <AlertTriangle size={18} />
    ) : (
      <Compass size={18} />
    );

  return (
    <div
      role="status"
      aria-label="Next step"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: tone.bg,
        border: `1px solid ${tone.border}`,
        borderLeft: `5px solid ${tone.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: tone.color, display: 'flex' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', color: tone.color }}>NEXT STEP</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.4 }}>
            {step.message}
          </div>
        </div>
      </div>
      {step.action && !onTargetPage && (
        <Button
          variant={step.tone === 'info' ? 'outline' : 'teal'}
          size="sm"
          icon={<ArrowRight size={14} />}
          iconPosition="right"
          onClick={() => navigate(step.action!.to)}
        >
          {step.action.label}
        </Button>
      )}
      <style>{`
        @keyframes eg-spin { to { transform: rotate(360deg); } }
        .eg-spin { animation: eg-spin 1s linear infinite; }
      `}</style>
    </div>
  );
};
