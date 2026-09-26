import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, X, ArrowRight, Map as MapIcon } from 'lucide-react';
import { useGovernorData } from '../../state/governorContext';
import { buildGuideSteps, markAuditVisited, wasAuditVisited } from '../../lib/demoGuide';

export interface DemoGuideProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

/** Floating seven-step walkthrough of the PulseBoard demo, ticked off from backend state. */
export const DemoGuide: React.FC<DemoGuideProps> = ({ open, onClose, onOpen }) => {
  const { overview, error } = useGovernorData();
  const location = useLocation();
  const navigate = useNavigate();
  const onAudit = location.pathname === '/audit';

  const steps = overview ? buildGuideSteps(overview, onAudit || wasAuditVisited()) : [];
  const auditReady = steps.length > 0 && steps[5].done;
  useEffect(() => {
    if (onAudit && auditReady) markAuditVisited();
  }, [onAudit, auditReady]);

  if (!overview || error) return null;

  const doneCount = steps.filter((step) => step.done).length;
  const currentIndex = steps.findIndex((step) => !step.done);
  const complete = currentIndex === -1;

  const shell: React.CSSProperties = {
    position: 'fixed',
    right: '1rem',
    bottom: '1rem',
    zIndex: 35,
    boxShadow: 'var(--shadow-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid #99F6E4',
    backgroundColor: '#FFFFFF',
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="eg-button"
        style={{
          ...shell,
          // Solid brand colour: the collapsed launcher must stand out from page content.
          backgroundColor: 'var(--color-governor-teal)',
          border: '1px solid var(--color-governor-teal)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 0.875rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#FFFFFF',
          cursor: 'pointer',
        }}
      >
        <MapIcon size={16} />
        Demo guide {doneCount}/{steps.length}
      </button>
    );
  }

  return (
    <aside aria-label="Demo guide" style={{ ...shell, width: 'min(340px, calc(100vw - 2rem))', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-governor-teal)',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapIcon size={16} />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Guided demo</div>
            <div style={{ fontSize: '0.6875rem', opacity: 0.85 }}>
              {doneCount} of {steps.length} steps done
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close demo guide"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex' }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ height: '4px', backgroundColor: 'var(--color-governor-teal-light)' }}>
        <div
          style={{
            height: '100%',
            width: `${(doneCount / steps.length) * 100}%`,
            backgroundColor: 'var(--color-governor-teal-accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: '0.5rem 0', maxHeight: '55vh', overflowY: 'auto' }}>
        {steps.map((step, index) => {
          const current = index === currentIndex;
          return (
            <li
              key={step.title}
              style={{
                display: 'flex',
                gap: '0.625rem',
                padding: '0.5rem 1rem',
                backgroundColor: current ? 'var(--color-governor-teal-light)' : 'transparent',
                borderLeft: current ? '3px solid var(--color-governor-teal)' : '3px solid transparent',
                opacity: !step.done && !current ? 0.6 : 1,
              }}
            >
              <span style={{ color: step.done ? 'var(--color-success)' : 'var(--color-text-muted)', marginTop: '1px' }}>
                {step.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-main)',
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}
                >
                  {index + 1}. {step.title}
                </div>
                {current && (
                  <>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-governor-teal)', fontWeight: 600, marginTop: '0.125rem' }}>
                      {step.action}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem', lineHeight: 1.4 }}>
                      {step.why}
                    </div>
                    {location.pathname !== step.to && (
                      <button
                        type="button"
                        onClick={() => navigate(step.to)}
                        style={{
                          marginTop: '0.375rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--color-accent-blue)',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        {step.linkLabel} <ArrowRight size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {complete && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          Demo complete. Use <strong>Reset demo</strong> in the header to run it again.
        </div>
      )}
    </aside>
  );
};
