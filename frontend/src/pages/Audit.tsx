import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { LifecycleTraceGraph } from '../components/audit/LifecycleTraceGraph';
import { AuditRecordItem } from '../components/audit/AuditRecordItem';
import { AuditRecordDetailDrawer } from '../components/audit/AuditRecordDetailDrawer';
import { pulseboardMockData, type AuditRecord } from '../mock/pulseboard';
import { Filter, Search } from 'lucide-react';

export const Audit: React.FC = () => {
  const [data] = useState(pulseboardMockData);
  const [activeRecord, setActiveRecord] = useState<AuditRecord | null>(null);
  const [filterVersion, setFilterVersion] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredRecords = data.audit_records.filter(rec => {
    if (filterVersion !== 'ALL' && rec.state_version !== Number(filterVersion)) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.decision_id.toLowerCase().includes(q) ||
        rec.recommended_strategy_id.toLowerCase().includes(q) ||
        (rec.title || '').toLowerCase().includes(q) ||
        (rec.summary || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* PAGE HEADER */}
      <PageHeader
        title="Audit Trail & Governance Ledger"
        description="Traceable audit ledger connecting goals, CP-SAT optimization, approvals, action receipts, and runtime replanning events."
        badge={<Badge variant="info">Immutable Audit Ledger</Badge>}
      />

      {/* 1. END-TO-END LIFECYCLE TRACE GRAPH */}
      <Section>
        <LifecycleTraceGraph />
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

            {[
              { id: 'ALL', label: 'All Versions' },
              { id: '1', label: 'State v1 (Baseline)' },
              { id: '2', label: 'State v2 (Replanned)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterVersion(tab.id)}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor: filterVersion === tab.id ? 'var(--color-accent-purple)' : 'var(--color-border)',
                  backgroundColor: filterVersion === tab.id ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-bg-card)',
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
              backgroundColor: 'var(--color-bg-card)',
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
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '0.8125rem',
                color: 'var(--color-text-primary)',
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
                No audit records match the current filter.
              </p>
            </Card>
          ) : (
            filteredRecords.map(record => (
              <AuditRecordItem
                key={record.id}
                record={record}
                onInspect={rec => setActiveRecord(rec)}
              />
            ))
          )}
        </div>
      </Section>

      {/* DETAIL DRAWER */}
      {activeRecord && (
        <AuditRecordDetailDrawer
          record={activeRecord}
          onClose={() => setActiveRecord(null)}
        />
      )}
    </div>
  );
};

export default Audit;
