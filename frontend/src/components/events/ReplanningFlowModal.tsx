import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { DecisionRun, Event, MaterialityResult, Recommendation } from '../../types/contract';
import { formatSignedHours } from '../../lib/format';
import { isRunActive } from '../../hooks/usePollRun';
import { RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';

const RESULT_LABELS: Record<string, string> = {
  NEW_RECOMMENDATION: 'New recommendation',
  REPLANNED: 'Strategy replanned',
  PRESERVED: 'Strategy preserved',
  NO_ACTION: 'No action required',
};

export interface ReplanningFlowModalProps {
  event: Event;
  materiality: MaterialityResult;
  /** The replan run for this event, once requested (followed by the shared poller). */
  run: DecisionRun | null;
  /** Latest recommendation for the decision, shown once the run succeeds. */
  recommendation: Recommendation | null;
  requesting: boolean;
  error: string | null;
  canRequest: boolean;
  onRequestReplan: () => void;
  onClose: () => void;
}

const panel: React.CSSProperties = {
  padding: '1rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  fontSize: '0.8125rem',
};

export const ReplanningFlowModal: React.FC<ReplanningFlowModalProps> = ({
  event,
  materiality,
  run,
  recommendation,
  requesting,
  error,
  canRequest,
  onRequestReplan,
  onClose,
}) => {
  const navigate = useNavigate();
  const active = isRunActive(run);
  const succeeded = run?.status === 'SUCCEEDED';
  const failed = run?.status === 'FAILED';
  const answered = succeeded && recommendation !== null && recommendation.state_version === run?.input_state_version;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <CardHeader
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-bg)',
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
              <RefreshCw size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.125rem' }}>Governor Re-Planning & Adaptation</CardTitle>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Observe → Adapt Cycle • Material Event {event.id} • State v{event.state_version}
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

        {/* MODAL BODY */}
        <CardContent style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* STEP 1: OBSERVED EVENT AND MATERIALITY FACTS */}
          <div style={{ ...panel, backgroundColor: 'var(--color-warning-bg)', borderColor: '#FDE68A' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                <AlertTriangle size={16} />
                1. Observed event ({event.event_type})
              </div>
              {event.engineering_delta_hours !== 0 && (
                <Badge variant={event.engineering_delta_hours > 0 ? 'success' : 'warning'}>
                  {formatSignedHours(event.engineering_delta_hours)} engineering
                </Badge>
              )}
            </div>
            <div style={{ color: 'var(--color-text-main)' }}>{event.description}</div>
            <ul style={{ margin: '0 0 0 1.125rem', padding: 0, color: 'var(--color-text-secondary)' }}>
              {materiality.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          {/* STEP 2: GOVERNOR REPLAN RUN */}
          <div style={{ ...panel, backgroundColor: 'var(--color-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                {active ? <Loader2 size={16} className="eg-spin" /> : <ShieldCheck size={16} style={{ color: 'var(--color-governor-teal)' }} />}
                2. Governor replan run
              </div>
              {run && (
                <Badge variant={failed ? 'danger' : succeeded ? 'teal' : 'warning'}>
                  {run.id} • {run.status}
                </Badge>
              )}
            </div>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {!run &&
                'Request a replan to let the Governor re-evaluate strategies against the current state. It may preserve the plan, change it, or take no action.'}
              {run && active && `Evaluating strategies at state v${run.input_state_version}…`}
              {run && succeeded && `Completed: ${RESULT_LABELS[run.result ?? ''] ?? run.result ?? 'finished'}.`}
              {run && failed && (
                <span style={{ color: 'var(--color-danger)' }}>
                  {run.error?.code}: {run.error?.message}
                </span>
              )}
            </div>
          </div>

          {/* STEP 3: OUTCOME */}
          {answered && recommendation && (
            <div style={{ ...panel, backgroundColor: 'var(--color-governor-teal-light)', borderColor: '#99F6E4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--color-governor-teal)' }}>
                <CheckCircle2 size={16} />
                3. Recommendation at state v{recommendation.state_version}: {recommendation.recommended_strategy_id}
              </div>
              <div style={{ color: 'var(--color-text-main)' }}>
                Now: <strong>{recommendation.now.join(', ') || '—'}</strong> • Next: <strong>{recommendation.next.join(', ') || '—'}</strong> •
                Deferred: <strong>{recommendation.defer.join(', ') || '—'}</strong>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{recommendation.reasoning_summary}</div>
              <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>
                {recommendation.requires_approval
                  ? 'Founder approval is required before the next experiment can start.'
                  : 'No founder approval is required for the next experiment.'}
              </div>
            </div>
          )}

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

          {/* FOOTER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.625rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            {(!run || failed) && (
              <Button variant="primary" size="md" icon={<RefreshCw size={16} />} onClick={onRequestReplan} disabled={!canRequest || requesting}>
                {requesting ? 'Requesting…' : failed ? 'Retry Governor Re-Plan' : 'Request Governor Re-Plan'}
              </Button>
            )}
            {answered && (
              <Button variant="teal" size="md" onClick={() => navigate('/approvals')}>
                Open Approvals
              </Button>
            )}
          </div>
        </CardContent>
      </div>
      <style>{`
        @keyframes eg-spin { to { transform: rotate(360deg); } }
        .eg-spin { animation: eg-spin 1s linear infinite; }
      `}</style>
    </div>
  );
};
