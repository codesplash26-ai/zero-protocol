import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useGovernorData } from '../../state/governorContext';
import { clearGuideProgress } from '../../lib/demoGuide';
import { describeApiError } from '../../lib/apiErrors';

/** Confirms and performs the demo reset (backend DEMO_MODE). */
export const ResetDemoDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { resetDemo } = useGovernorData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setBusy(true);
    setError(null);
    try {
      await resetDemo();
      clearGuideProgress();
      onClose();
      navigate('/overview');
    } catch (caught) {
      setError(describeApiError(caught));
      setBusy(false);
    }
  };

  return (
    <div
      onClick={() => !busy && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reset demo"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--color-text-main)' }}>
            <RotateCcw size={18} style={{ color: 'var(--color-warning)' }} />
            Reset the demo?
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
          This deletes every decision, event, approval, added experiment and audit record, and restores the PulseBoard
          starting point (state v1: $4,000 budget, 24h available, experiments A, B and C).
        </p>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" icon={<RotateCcw size={14} />} onClick={handleReset} disabled={busy}>
            {busy ? 'Resetting…' : 'Reset demo'}
          </Button>
        </div>
      </div>
    </div>
  );
};
