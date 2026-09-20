import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AuditRecord } from '../../mock/pulseboard';
import { FileText, X, Copy, Check, Code } from 'lucide-react';

export interface AuditRecordDetailDrawerProps {
  record: AuditRecord | null;
  onClose: () => void;
}

export const AuditRecordDetailDrawer: React.FC<AuditRecordDetailDrawerProps> = ({
  record,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewTab, setViewTab] = useState<'STRUCTURED' | 'JSON'>('STRUCTURED');

  if (!record) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          height: '100vh',
          backgroundColor: 'var(--color-bg-card)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* DRAWER HEADER */}
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
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent-purple)',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CardTitle style={{ fontSize: '1.125rem' }}>Audit Ledger Record {record.id}</CardTitle>
                <Badge variant="teal">State v{record.state_version}</Badge>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Decision ID: {record.decision_id} • Goal ID: {record.goal_id}
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

        {/* TAB TOGGLE TOOLBAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-card)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => setViewTab('STRUCTURED')}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: viewTab === 'STRUCTURED' ? 'var(--color-accent-purple)' : 'var(--color-border)',
                backgroundColor: viewTab === 'STRUCTURED' ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-bg-subtle)',
                color: viewTab === 'STRUCTURED' ? 'var(--color-accent-purple)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Structured Audit View
            </button>
            <button
              onClick={() => setViewTab('JSON')}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: viewTab === 'JSON' ? 'var(--color-accent-purple)' : 'var(--color-border)',
                backgroundColor: viewTab === 'JSON' ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-bg-subtle)',
                color: viewTab === 'JSON' ? 'var(--color-accent-purple)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <Code size={14} />
              Contract JSON
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyJson}
            icon={copied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
          >
            {copied ? 'Copied Payload' : 'Copy JSON'}
          </Button>
        </div>

        {/* DRAWER CONTENT */}
        <CardContent style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {viewTab === 'STRUCTURED' ? (
            <>
              {/* Title & Summary */}
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {record.title}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', lineHeight: 1.5 }}>
                  {record.summary}
                </div>
              </div>

              {/* Shared Data Contract v1 Field Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  Contract Field Ledger (AuditRecord)
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>decision_id</div>
                    <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{record.decision_id}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>goal_id</div>
                    <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{record.goal_id}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>state_version</div>
                    <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{record.state_version}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>optimization_status</div>
                    <strong style={{ color: 'var(--color-success)', fontFamily: 'monospace' }}>{record.optimization_status}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>recommended_strategy_id</div>
                    <strong style={{ color: 'var(--color-accent-blue)', fontFamily: 'monospace' }}>{record.recommended_strategy_id}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>approval_id</div>
                    <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{record.approval_id || 'null'}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>action_receipt_id</div>
                    <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{record.action_receipt_id || 'null'}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>event_ids</div>
                    <strong style={{ color: record.event_ids.length > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                      {record.event_ids.length > 0 ? JSON.stringify(record.event_ids) : '[]'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Candidate Strategies List */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                  candidate_strategy_ids
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {record.candidate_strategy_ids.map(stratId => (
                    <span
                      key={stratId}
                      style={{
                        padding: '0.25rem 0.625rem',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {stratId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tool Calls List */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                  tool_calls Execution Sequence
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {record.tool_calls.map((tool, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.375rem 0.625rem',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>Step {idx + 1}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* JSON RAW PAYLOAD VIEWER */
            <pre
              style={{
                margin: 0,
                padding: '1rem',
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'var(--color-text-primary)',
                overflowX: 'auto',
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(record, null, 2)}
            </pre>
          )}
        </CardContent>
      </div>
    </div>
  );
};
