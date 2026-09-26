import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { LiveDataState } from '../components/ui/LiveDataState';
import { ApprovalPolicyCard } from '../components/approvals/ApprovalPolicyCard';
import { PendingApprovalCard } from '../components/approvals/PendingApprovalCard';
import { StartActionCard } from '../components/approvals/StartActionCard';
import { ApprovalHistoryTable } from '../components/approvals/ApprovalHistoryTable';
import { ApprovalConfirmModal } from '../components/approvals/ApprovalConfirmModal';
import { useGovernorData } from '../state/governorContext';
import { useApiResource } from '../hooks/useApiResource';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { describeApiError } from '../lib/apiErrors';
import type { ActionReceipt, Approval } from '../types/contract';
import { ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

/** Actor recorded on founder decisions (the MVP has no user accounts). */
const FOUNDER_ACTOR_ID = 'founder';

interface ApprovalsData {
  approvals: Approval[];
  receiptsByApproval: Record<string, ActionReceipt | null>;
}

/** Approvals plus their receipts, joined by approval_id through the receipts filter. */
async function loadApprovals(): Promise<ApprovalsData> {
  const page = await api.listApprovals({ limit: 200 });
  const decided = page.items.filter((item) => item.decision === 'APPROVED' || item.decision === 'NOT_REQUIRED');
  const receipts = await Promise.all(
    decided.map((item) => api.listActionReceipts({ approval_id: item.id, limit: 1 })),
  );
  const receiptsByApproval: Record<string, ActionReceipt | null> = {};
  decided.forEach((item, index) => {
    receiptsByApproval[item.id] = receipts[index].items[0] ?? null;
  });
  return { approvals: page.items, receiptsByApproval };
}

type Notice = { tone: 'success' | 'error'; text: string };

export const Approvals: React.FC = () => {
  const { overview, stateVersion, decisionId, refreshedAt, isLoading, error, refresh, trackRun } = useGovernorData();
  const data = useApiResource('approvals', loadApprovals, refreshedAt);
  const [activeModal, setActiveModal] = useState<{ approval: Approval; mode: 'APPROVE' | 'REJECT' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const approvals = data.data?.approvals ?? [];
  const receiptsByApproval = data.data?.receiptsByApproval ?? {};
  const experiments = overview?.experiments ?? [];
  const experimentName = (id: string) => experiments.find((item) => item.id === id)?.name ?? null;

  // Act only on the decision being followed; approvals of earlier decisions stay in the history.
  const isCurrentDecision = (item: Approval) => !decisionId || item.decision_id === decisionId;
  const pending = approvals.filter((item) => item.decision === 'PENDING' && isCurrentDecision(item));
  // Authorized but not executed, and still bound to the current organization state.
  const readyToStart = approvals.filter(
    (item) =>
      (item.decision === 'APPROVED' || item.decision === 'NOT_REQUIRED') &&
      isCurrentDecision(item) &&
      !receiptsByApproval[item.id] &&
      item.state_version === stateVersion &&
      experiments.some((exp) => exp.id === item.experiment_id && (exp.status === 'PROPOSED' || exp.status === 'APPROVED')),
  );

  const focusApproval = pending[0] ?? null;
  const workspace = useApiResource(
    focusApproval ? `workspace:${focusApproval.decision_id}` : null,
    () => api.getDecisionWorkspace(focusApproval!.decision_id),
    refreshedAt,
  );
  const focusStrategy = workspace.data?.strategies.find((item) => item.id === focusApproval?.strategy_id) ?? null;
  const focusReasoning =
    workspace.data?.recommendation?.recommended_strategy_id === focusApproval?.strategy_id
      ? workspace.data?.recommendation?.reasoning_summary
      : null;

  const handleFailure = (caught: unknown, prefix = '') => {
    const text = `${prefix}${describeApiError(caught)}`;
    if (caught instanceof ApiError && (caught.isConflict || caught.isNetworkError)) void refresh();
    return text;
  };

  const executeAction = (approval: Approval, expectedVersion: number) =>
    api.executeAction({
      decision_id: approval.decision_id,
      strategy_id: approval.strategy_id,
      experiment_id: approval.experiment_id,
      approval_id: approval.id,
      expected_state_version: expectedVersion,
    });

  const handleStart = async (approval: Approval) => {
    if (stateVersion === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const receipt = await executeAction(approval, stateVersion);
      setNotice({
        tone: 'success',
        text: `Experiment ${receipt.experiment_id} is ${receipt.new_status}. Receipt ${receipt.id} recorded at state v${receipt.state_version}.`,
      });
      void refresh();
    } catch (caught) {
      setNotice({ tone: 'error', text: handleFailure(caught, `Starting ${approval.experiment_id} failed: `) });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDecision = async (approval: Approval, reason: string) => {
    if (stateVersion === null || !activeModal) return;
    const approve = activeModal.mode === 'APPROVE';
    setBusy(true);
    setModalError(null);
    let decided: Approval;
    try {
      decided = await api.decideApproval(approval.id, {
        decision: approve ? 'APPROVED' : 'REJECTED',
        reason,
        actor_id: FOUNDER_ACTOR_ID,
        expected_state_version: stateVersion,
      });
    } catch (caught) {
      setModalError(handleFailure(caught));
      setBusy(false);
      return;
    }

    setActiveModal(null);
    if (!approve) {
      setNotice({ tone: 'success', text: `Starting ${decided.experiment_id} was rejected (${decided.id}).` });
      setBusy(false);
      void refresh();
      return;
    }

    // Approval and execution are separate backend operations; report them separately.
    try {
      const receipt = await executeAction(decided, stateVersion);
      setNotice({
        tone: 'success',
        text: `${decided.id} approved. Experiment ${receipt.experiment_id} is ${receipt.new_status} — receipt ${receipt.id} at state v${receipt.state_version}.`,
      });
    } catch (caught) {
      setNotice({
        tone: 'error',
        text: handleFailure(caught, `${decided.id} was approved, but starting ${decided.experiment_id} failed: `),
      });
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const handleRequestReplan = async (approval: Approval) => {
    if (stateVersion === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const run = await api.requestReplan(approval.decision_id, {
        trigger_approval_id: approval.id,
        expected_state_version: stateVersion,
      });
      trackRun(run);
      setNotice({ tone: 'success', text: `Replan ${run.id} queued for ${approval.decision_id}. Follow progress on the Decision page.` });
      void refresh();
    } catch (caught) {
      setNotice({ tone: 'error', text: handleFailure(caught, 'Replan request failed: ') });
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <PageHeader
      title="Approvals & Governance"
      description="Review and authorize high-impact experimentation strategies exceeding governance thresholds."
      badge={<Badge variant="warning">Governance Engine</Badge>}
    />
  );

  if (!overview || error) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {header}
        <LiveDataState
          kind={isLoading ? 'loading' : 'unavailable'}
          action={isLoading ? undefined : { label: 'Retry', onClick: () => void refresh() }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {header}

      {/* NOTIFICATION BANNER */}
      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: notice.tone === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            border: `1px solid ${notice.tone === 'error' ? '#FECACA' : '#BBF7D0'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: 'var(--color-text-main)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {notice.tone === 'error' ? (
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. GOVERNANCE POLICY CARD */}
      <Section>
        <ApprovalPolicyCard organizationState={overview.organization_state} goal={overview.active_goal} />
      </Section>

      {data.isLoading ? (
        <LiveDataState kind="loading" title="Loading approvals…" />
      ) : data.error && !data.data ? (
        <LiveDataState
          kind="error"
          message={describeApiError(data.error)}
          action={{ label: 'Retry', onClick: data.reload }}
        />
      ) : (
        <>
          {/* 2. PENDING APPROVAL QUEUE */}
          <Section title={`Pending Approval Queue (${pending.length})`}>
            {focusApproval ? (
              <PendingApprovalCard
                approval={focusApproval}
                strategy={focusStrategy}
                experimentName={experimentName(focusApproval.experiment_id)}
                organization={overview.organization_state}
                reasoning={focusReasoning}
                busy={busy}
                onApprove={(approval) => {
                  setModalError(null);
                  setActiveModal({ approval, mode: 'APPROVE' });
                }}
                onReject={(approval) => {
                  setModalError(null);
                  setActiveModal({ approval, mode: 'REJECT' });
                }}
                onRequestReplan={handleRequestReplan}
              />
            ) : (
              <Card padding="lg">
                <CardHeader>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-success-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-success)',
                      }}
                    >
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <CardTitle style={{ fontSize: '1.0625rem' }}>Queue Clear — No Pending Approvals</CardTitle>
                      <CardDescription>No decisions are currently awaiting founder authorization.</CardDescription>
                    </div>
                  </div>
                  <Badge variant="success">0 Pending</Badge>
                </CardHeader>
                <CardContent>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                    The backend has no approval in PENDING state. Actions within the approval threshold appear below as
                    ready to start.
                  </p>
                </CardContent>
              </Card>
            )}
          </Section>

          {/* 2b. AUTHORIZED ACTIONS NOT YET EXECUTED */}
          {readyToStart.length > 0 && (
            <Section title={`Ready to Start (${readyToStart.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {readyToStart.map((approval) => (
                  <StartActionCard
                    key={approval.id}
                    approval={approval}
                    experimentName={experimentName(approval.experiment_id)}
                    busy={busy}
                    onStart={handleStart}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* 3. APPROVAL & AUDIT HISTORY */}
          <Section title="Authorization & Action Audit History">
            <ApprovalHistoryTable approvals={approvals} receiptsByApproval={receiptsByApproval} />
          </Section>
        </>
      )}

      {/* MODAL */}
      {activeModal && (
        <ApprovalConfirmModal
          approval={activeModal.approval}
          mode={activeModal.mode}
          busy={busy}
          error={modalError}
          onClose={() => !busy && setActiveModal(null)}
          onConfirm={handleConfirmDecision}
        />
      )}
    </div>
  );
};

export default Approvals;
