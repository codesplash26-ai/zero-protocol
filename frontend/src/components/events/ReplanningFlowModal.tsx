import React from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Event, MaterialityResult } from '../../mock/pulseboard';
import { RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface ReplanningFlowModalProps {
  event: Event;
  materiality: MaterialityResult;
  onClose: () => void;
  onApplyReplan: (newStrategyId: string) => void;
}

export const ReplanningFlowModal: React.FC<ReplanningFlowModalProps> = ({
  event,
  onClose,
  onApplyReplan,
}) => {
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
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <CardHeader
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-bg-subtle)',
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

        {/* MODAL BODY */}
        <CardContent style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* STEP 1: EVENT & CONSTRAINT SHIFT */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-success)' }}>
                <CheckCircle2 size={16} />
                Capacity Buffer Expanded (SSO Vendor Delay)
              </div>
              <Badge variant="success">+18 Hours Unlocked</Badge>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
              {event.description}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.75rem',
                marginTop: '0.25rem',
                paddingTop: '0.5rem',
                borderTop: '1px dotted var(--color-success-border)',
                fontSize: '0.75rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>SSO Eng Reservation: </span>
                <strong>36h → 18h (-18h)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Available Eng Buffer: </span>
                <strong style={{ color: 'var(--color-success)' }}>24h → 42h Remaining</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>State Version: </span>
                <strong>v1 → v2</strong>
              </div>
            </div>
          </div>

          {/* STEP 2: STRATEGY RE-EVALUATION RESULTS */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
              Governor Strategy Portfolio Re-Evaluation
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Newly Feasible Strategy A-B */}
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-warning-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-warning-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                      STRATEGY-A-B (Sequential Expansion)
                    </span>
                    <Badge variant="warning">Unlocked & Optimal (Requires Approval)</Badge>
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                    Feasible (Fits in 42h Buffer)
                  </div>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  <strong>Adapted Strategy Sequence: </strong>
                  Execute Pricing Willingness Test (A) followed by Annual Plan Checkout (B). Total engineering required: 30 Hours (6h + 24h).
                </div>

                {/* Metrics Breakdown */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.625rem',
                    padding: '0.625rem',
                    backgroundColor: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Cost USD: </span>
                    <strong style={{ color: 'var(--color-warning)' }}>$2,500 USD (Exceeds $2,000 threshold)</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Eng Hours: </span>
                    <strong style={{ color: 'var(--color-success)' }}>30h / 42h Available Buffer</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Remaining Capacity: </span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>12h Uncommitted Buffer</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GOVERNOR ADAPTATION REASONING */}
          <div
            style={{
              padding: '0.875rem',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--color-text-primary)' }}>Governor Adaptation Reasoning: </strong>
            The SSO vendor delay freed 18 engineering hours, expanding available capacity from 24h to 42h. This capacity expansion allows Strategy A-B (requiring 30h) to become feasible. Because Strategy A-B costs $2,500 USD, it exceeds the founder governance threshold of $2,000 USD and is routed to the Approvals Queue (APR-001) for explicit founder authorization.
          </div>

          {/* ACTION FOOTER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.875rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--color-governor-teal)' }} />
              State Version 2 Governance Transition
            </div>

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => onApplyReplan('STRATEGY-A-B')}
                icon={<CheckCircle2 size={16} />}
              >
                Apply Re-Plan & Route to Approvals (STRATEGY-A-B)
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
};
