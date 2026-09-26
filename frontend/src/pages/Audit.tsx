import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { LiveDataState } from '../components/ui/LiveDataState';
import { LifecycleTraceGraph } from '../components/audit/LifecycleTraceGraph';
import { AuditRecordItem } from '../components/audit/AuditRecordItem';
import { AuditRecordDetailDrawer } from '../components/audit/AuditRecordDetailDrawer';
import type { AuditEntry } from '../components/audit/auditEntry';
import { useGovernorData } from '../state/governorContext';
import { useApiResource } from '../hooks/useApiResource';
import { api } from '../api/endpoints';
import { describeApiError } from '../lib/apiErrors';
import { Filter, Search } from 'lucide-react';

/**
 * The decision trace, with each record's title/summary taken from the
 * organization audit feed (same record IDs); the trace endpoint omits them.
 */
async function loadTrace(decisionId: string): Promise<AuditEntry[]> {
  const [trace, activity] = await Promise.all([api.getDecisionTrace(decisionId, 500), api.listAudit({ limit: 200 })]);
  const byId = new Map(activity.items.map((item) => [item.id, item]));
  return trace.items.map((record) => ({
    ...record,
    title: byId.get(record.id)?.title ?? null,
    summary: byId.get(record.id)?.summary ?? null,
  }));
}

export const Audit: React.FC = () => {
  const { overview, decisionId, refreshedAt, isLoading, error, refresh } = useGovernorData();
  const trace = useApiResource(decisionId ? `trace:${decisionId}` : null, () => loadTrace(decisionId!), refreshedAt);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [filterVersion, setFilterVersion] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const records = trace.data ?? [];
  const versions = [...new Set(records.map((rec) => rec.state_version))].sort((a, b) => a - b);
  const activeRecord = records.find((rec) => rec.id === activeRecordId) ?? null;

  const filteredRecords = records.filter((rec) => {
    if (filterVersion !== 'ALL' && rec.state_version !== Number(filterVersion)) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [
      rec.id,
      rec.decision_id,
      rec.recommended_strategy_id,
      rec.approval_id,
      rec.action_receipt_id,
      rec.title,
      rec.summary,
      ...rec.event_ids,
      ...rec.tool_calls,
    ].some((value) => (value ?? '').toLowerCase().includes(q));
  });

  const header = (
    <PageHeader
      title="Audit Trail & Governance Ledger"
      description="Traceable audit ledger connecting goals, CP-SAT optimization, approvals, action receipts, and runtime replanning events."
      badge={<Badge variant="info">{decisionId ? `Decision ${decisionId}` : 'Immutable Audit Ledger'}</Badge>}
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

      {!decisionId ? (
        <LiveDataState
          kind="empty"
          title="No decision trace yet"
          message="The audit trail follows the current Governor decision. Run the Governor on the Decision page to start one."
        />
      ) : trace.isLoading ? (
        <LiveDataState kind="loading" title="Loading decision trace…" />
      ) : trace.error && !trace.data ? (
        <LiveDataState
          kind="error"
          title="The decision trace could not be loaded"
          message={describeApiError(trace.error)}
          action={{ label: 'Retry', onClick: trace.reload }}
        />
      ) : (
        <>
          {/* 1. END-TO-END LIFECYCLE TRACE GRAPH */}
          <Section>
            <LifecycleTraceGraph trace={records} />
          </Section>

          {/* 2. SYSTEM AUDIT RECORDS & FILTER TOOLBAR */}
          <Section title={`System Audit Trail Records (${filteredRecords.length})`}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              {/* Version Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <Filter size={14} />
                  Filter State Version:
                </div>

                {[{ id: 'ALL', label: 'All Versions' }, ...versions.map((v) => ({ id: String(v), label: `State v${v}` }))].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterVersion(tab.id)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: filterVersion === tab.id ? 'var(--color-accent-purple)' : 'var(--color-border)',
                      backgroundColor: filterVersion === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-card)',
                      color: filterVersion === tab.id ? 'var(--color-accent-purple)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  width: '100%',
                  maxWidth: '280px',
                }}
              >
                <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search audit records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-main)',
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Audit Records List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredRecords.length === 0 ? (
                <Card padding="md">
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                    {records.length === 0 ? 'The backend has not recorded any trace entries for this decision.' : 'No audit records match the current filter.'}
                  </p>
                </Card>
              ) : (
                filteredRecords.map((record) => (
                  <AuditRecordItem key={record.id} record={record} onInspect={(rec) => setActiveRecordId(rec.id)} />
                ))
              )}
            </div>
          </Section>
        </>
      )}

      {/* DETAIL DRAWER */}
      {activeRecord && <AuditRecordDetailDrawer record={activeRecord} onClose={() => setActiveRecordId(null)} />}
    </div>
  );
};

export default Audit;
