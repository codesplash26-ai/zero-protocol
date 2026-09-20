import React from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AuditRecord } from '../../mock/pulseboard';
import { FileText, Cpu, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';

export interface AuditRecordItemProps {
  record: AuditRecord;
  onInspect: (record: AuditRecord) => void;
}

const formatToolCallName = (tool: string) => {
  const toolNameMap: Record<string, string> = {
    load_context: 'Load State & Constraints',
    interpret_goal: 'Interpret Goal',
    plan_evidence: 'Assess Evidence',
    generate_strategies: 'Synthesize Strategies',
    optimize_cpsat: 'Optimize Portfolio',
    generate_recommendation: 'Formulate Recommendation',
    check_approval: 'Evaluate Approval Rules',
    handle_event: 'Ingest Event Trigger',
    evaluate_materiality: 'Evaluate Materiality Impact',
    issue_action_receipt: 'Issue Action Receipt',
  };
  return toolNameMap[tool] || tool.replace(/_/g, ' ');
};

export const AuditRecordItem: React.FC<AuditRecordItemProps> = ({
  record,
  onInspect,
}) => {
  const getOptStatusBadge = (status: AuditRecord['optimization_status']) => {
    switch (status) {
      case 'OPTIMAL':
        return <Badge variant="success"><CheckCircle2 size={12} style={{ marginRight: '4px' }} />OPTIMAL</Badge>;
      case 'FEASIBLE':
        return <Badge variant="info">FEASIBLE</Badge>;
      case 'INFEASIBLE':
        return <Badge variant="danger"><AlertTriangle size={12} style={{ marginRight: '4px' }} />INFEASIBLE</Badge>;
      case 'UNKNOWN':
      default:
        return <Badge variant="default">UNKNOWN</Badge>;
    }
  };

  return (
    <Card padding="md" style={{ borderLeft: '4px solid var(--color-accent-purple)', backgroundColor: 'var(--color-bg-card)' }}>
      <CardHeader style={{ marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
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
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                  {record.id}
                </span>
                <Badge variant="teal" size="sm">State v{record.state_version}</Badge>
                {getOptStatusBadge(record.optimization_status)}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {record.timestamp}
                </span>
              </div>

              <CardTitle style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
                {record.title || `Audit Record ${record.id}`}
              </CardTitle>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onInspect(record)}
            icon={<ExternalLink size={14} />}
          >
            Inspect Full Trace
          </Button>
        </div>
      </CardHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.8125rem' }}>
        {/* Summary Description */}
        <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {record.summary}
        </div>

        {/* Connected Entities Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.625rem',
            padding: '0.75rem',
            backgroundColor: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Decision & Goal
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
              {record.decision_id} • {record.goal_id}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Recommended Strategy
            </span>
            <span style={{ fontWeight: 700, color: 'var(--color-accent-blue)', fontFamily: 'monospace' }}>
              {record.recommended_strategy_id}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Approval & Receipt
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
              {record.approval_id || 'None'} / {record.action_receipt_id || 'None'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Associated Events
            </span>
            <span style={{ fontWeight: 600, color: record.event_ids.length > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              {record.event_ids.length > 0 ? record.event_ids.join(', ') : 'None (Baseline)'}
            </span>
          </div>
        </div>

        {/* Execution Tool Calls Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Cpu size={14} style={{ color: 'var(--color-accent-purple)' }} />
            Execution Step Sequence ({record.tool_calls.length})
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
            {record.tool_calls.map((tool, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ArrowRight size={12} style={{ color: 'var(--color-text-muted)' }} />}
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    backgroundColor: 'var(--color-bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                  title={`Internal call: ${tool}`}
                >
                  {formatToolCallName(tool)}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
