import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Approval } from '../../types/contract';
import { formatUsd } from '../../lib/format';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, X, Lock } from 'lucide-react';

export interface ApprovalConfirmModalProps {
  approval: Approval | null;
  mode: 'APPROVE' | 'REJECT';
  onClose: () => void;
  onConfirm: (approval: Approval, reason: string) => void;
  busy?: boolean;
  error?: string | null;
}

export const ApprovalConfirmModal: React.FC<ApprovalConfirmModalProps> = ({
  approval,
  mode,
  onClose,
  onConfirm,
  busy = false,
  error = null,
}) => {
  const [customReason, setCustomReason] = useState(
    mode === 'APPROVE'
      ? `Founder approved starting experiment ${approval?.experiment_id ?? ''}.`.replace(' .', '.')
      : `Founder rejected starting experiment ${approval?.experiment_id ?? ''}.`.replace(' .', '.')
  );

  if (!approval) return null;

  const isApprove = mode === 'APPROVE';

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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
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
                backgroundColor: isApprove ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isApprove ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {isApprove ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.125rem' }}>
                {isApprove ? `Approve and start ${approval.experiment_id}` : `Reject starting ${approval.experiment_id}`}
              </CardTitle>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Binding Governance Authorization • {approval.id}
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

        <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Summary Box */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: isApprove ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${isApprove ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-primary)',
              lineHeight: 1.5,
            }}
          >
            {isApprove ? (
              <div>
                <strong>Legal & Organizational Impact: </strong>
                Approving authorizes one action — starting experiment <strong>{approval.experiment_id}</strong> — and
                then asks the backend to start it, reserving <strong>{formatUsd(approval.authorized_cost_usd)} USD</strong> and{' '}
                <strong>{approval.authorized_engineering_hours} engineering hours</strong>. It does not approve later steps
                of the strategy.
              </div>
            ) : (
              <div>
                <strong>Rejection Impact: </strong>
                Rejecting records the founder's decision for experiment {approval.experiment_id}. No resources are
                reserved; you can request a Governor replan afterwards.
              </div>
            )}
          </div>

          {/* Authorization Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Decision ID</div>
              <strong style={{ color: 'var(--color-text-primary)' }}>{approval.decision_id}</strong>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Strategy ID</div>
              <strong style={{ color: 'var(--color-text-primary)' }}>{approval.strategy_id}</strong>
            </div>
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

          {/* Reason Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
              Authorization Rationale / Audit Note
            </label>
            <textarea
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem',
                fontSize: '0.8125rem',
                backgroundColor: 'var(--color-bg-subtle)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <Lock size={12} />
              State Version {approval.state_version}
            </div>

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant={isApprove ? 'primary' : 'outline'}
                size="md"
                disabled={busy || !customReason.trim()}
                onClick={() => onConfirm(approval, customReason.trim())}
                icon={isApprove ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                style={!isApprove ? { color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' } : {}}
              >
                {busy ? 'Submitting…' : isApprove ? 'Confirm Authorization' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
};
