import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { ApprovalPolicyCard } from '../components/approvals/ApprovalPolicyCard';
import { PendingApprovalCard } from '../components/approvals/PendingApprovalCard';
import { ApprovalHistoryTable } from '../components/approvals/ApprovalHistoryTable';
import { ApprovalConfirmModal } from '../components/approvals/ApprovalConfirmModal';
import { pulseboardMockData, type Approval, type ActionReceipt } from '../mock/pulseboard';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Approvals: React.FC = () => {
  const [data, setData] = useState(pulseboardMockData);
  const [activeModal, setActiveModal] = useState<{
    approval: Approval;
    mode: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const pendingApprovals = data.approvals.filter(a => a.decision === 'PENDING');
  const targetStrategy = data.decision_workspace.strategies.find(
    s => s.id === (pendingApprovals[0]?.strategy_id || 'STRATEGY-A-B')
  );

  const handleOpenApproveModal = (approval: Approval) => {
    setActiveModal({ approval, mode: 'APPROVE' });
  };

  const handleOpenRejectModal = (approval: Approval) => {
    setActiveModal({ approval, mode: 'REJECT' });
  };

  const handleRequestReplan = (approval: Approval) => {
    setData(prev => ({
      ...prev,
      governor_status: {
        ...prev.governor_status,
        state: 'Replanning',
        decision_cycle: 'Re-evaluating under updated constraints',
        last_activity: 'Just now',
      },
    }));
    setNotification(`Re-plan requested for Approval ${approval.id}. Governor status set to Replanning.`);
  };

  const handleConfirmDecision = (approval: Approval, reasonNote: string) => {
    const isApprove = activeModal?.mode === 'APPROVE';
    const nowTimestamp = 'Just now';

    // 1. Update Approval Item
    const updatedApprovals = data.approvals.map(a => {
      if (a.id === approval.id) {
        return {
          ...a,
          decision: (isApprove ? 'APPROVED' : 'REJECTED') as Approval['decision'],
          reason: reasonNote,
          decided_at: nowTimestamp,
        };
      }
      return a;
    });

    // 2. Generate Action Receipt if approved
    const newReceipts: ActionReceipt[] = [...data.action_receipts];
    if (isApprove) {
      const actionId = `ACT-00${data.action_receipts.length + 1}`;
      newReceipts.unshift({
        id: actionId,
        decision_id: approval.decision_id,
        strategy_id: approval.strategy_id,
        experiment_id: approval.experiment_ids?.[1] || 'B',
        previous_status: 'PROPOSED',
        new_status: 'RUNNING',
        budget_reserved_usd: approval.cost_usd || 2500,
        engineering_reserved_hours: approval.engineering_hours || 24,
        status: 'SUCCESS',
        executed_at: nowTimestamp,
      });
    }

    // 3. Update Experiments status if approved
    const updatedExperiments = data.experiments.map(exp => {
      if (isApprove && (approval.experiment_ids || []).includes(exp.id)) {
        return {
          ...exp,
          status: 'RUNNING' as const,
        };
      }
      return exp;
    });

    // 4. Update Org State reserved resources if approved
    const updatedOrgState = { ...data.organization_state };
    if (isApprove) {
      const addedEng = approval.engineering_hours || 24;
      updatedOrgState.available_engineering_hours = Math.max(
        0,
        updatedOrgState.available_engineering_hours - addedEng
      );
    }

    setData(prev => ({
      ...prev,
      approvals: updatedApprovals,
      action_receipts: newReceipts,
      experiments: updatedExperiments,
      organization_state: updatedOrgState,
      governor_status: {
        ...prev.governor_status,
        state: 'Active',
        decision_cycle: isApprove
          ? 'Strategy Authorized & Running'
          : 'Strategy Rejected by Founder',
        last_activity: nowTimestamp,
      },
    }));

    setActiveModal(null);
    setNotification(
      isApprove
        ? `Strategy ${approval.strategy_id} authorized! Action Receipt generated and resources reserved.`
        : `Strategy ${approval.strategy_id} rejected. Governor returned to monitoring.`
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* PAGE HEADER */}
      <PageHeader
        title="Approvals & Governance"
        description="Review and authorize high-impact experimentation strategies exceeding governance thresholds."
        badge={<Badge variant="warning">Governance Engine</Badge>}
      />

      {/* NOTIFICATION TOAST/BANNER */}
      {notification && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. GOVERNANCE POLICY CARD */}
      <Section>
        <ApprovalPolicyCard
          organizationState={data.organization_state}
          goal={data.goal}
        />
      </Section>

      {/* 2. PENDING APPROVAL QUEUE */}
      <Section title={`Pending Approval Queue (${pendingApprovals.length})`}>
        {pendingApprovals.length > 0 ? (
          <PendingApprovalCard
            approval={pendingApprovals[0]}
            strategy={targetStrategy}
            onApprove={handleOpenApproveModal}
            onReject={handleOpenRejectModal}
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
                  <CardTitle style={{ fontSize: '1.0625rem' }}>Queue Clean — All Decisions Authorized</CardTitle>
                  <CardDescription>
                    No critical decisions currently awaiting founder authorization.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="success">0 Pending</Badge>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                All active strategies are within founder thresholds or have already been authorized. The Governor continues monitoring execution.
              </p>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* 3. APPROVAL & AUDIT HISTORY */}
      <Section title="Authorization & Action Audit History">
        <ApprovalHistoryTable
          approvals={data.approvals}
          actionReceipts={data.action_receipts}
        />
      </Section>

      {/* MODAL */}
      {activeModal && (
        <ApprovalConfirmModal
          approval={activeModal.approval}
          mode={activeModal.mode}
          onClose={() => setActiveModal(null)}
          onConfirm={handleConfirmDecision}
        />
      )}
    </div>
  );
};

export default Approvals;
