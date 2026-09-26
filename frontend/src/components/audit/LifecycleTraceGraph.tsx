import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { AuditEntry } from './auditEntry';
import { Target, GitBranch, ShieldCheck, FileCheck, Zap, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

const unique = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => !!value))];
const hasTitle = (entry: AuditEntry, pattern: RegExp) => pattern.test(entry.title ?? '');

export interface LifecycleTraceGraphProps {
  /** Decision trace from GET /audit/{decision_id}, oldest first. */
  trace: AuditEntry[];
}

/** Stage-by-stage view of the decision trace; stages the trace has not reached are dimmed. */
export const LifecycleTraceGraph: React.FC<LifecycleTraceGraphProps> = ({ trace }) => {
  const first = trace[0];
  const solver = trace.find((entry) => entry.optimization_status !== null);
  const approvals = unique(trace.map((entry) => entry.approval_id));
  const receipts = unique(trace.map((entry) => entry.action_receipt_id));
  const events = unique(trace.flatMap((entry) => entry.event_ids));
  const materiality = trace.filter(
    (entry) => entry.tool_calls.includes('calculate_materiality') || hasTitle(entry, /materiality/i),
  );
  const replans = trace.filter((entry) => hasTitle(entry, /replan/i));
  const list = (ids: string[]) => (ids.length > 2 ? `${ids.slice(0, 2).join(', ')} +${ids.length - 2}` : ids.join(', '));

  const steps = [
    {
      title: '1. Goal & Decision',
      subtitle: first ? `${first.goal_id} • ${first.decision_id}` : null,
      desc: 'Founder goal and the decision being governed',
      icon: <Target size={16} />,
      color: 'var(--color-accent-blue)',
      bg: 'var(--color-accent-blue-light)',
    },
    {
      title: '2. Strategy Optimization',
      subtitle: solver ? `CP-SAT ${solver.optimization_status} • v${solver.state_version}` : null,
      desc: 'Candidate strategies evaluated under constraints',
      icon: <GitBranch size={16} />,
      color: 'var(--color-accent-purple)',
      bg: 'rgba(139, 92, 246, 0.15)',
    },
    {
      title: '3. Approval Routing',
      subtitle: approvals.length ? list(approvals) : null,
      desc: 'Founder authorization policy check',
      icon: <ShieldCheck size={16} />,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
    },
    {
      title: '4. Action Execution',
      subtitle: receipts.length ? list(receipts) : null,
      desc: 'Controlled action reserves budget & hours',
      icon: <FileCheck size={16} />,
      color: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
    },
    {
      title: '5. Event Ingestion',
      subtitle: events.length ? list(events) : null,
      desc: 'Organization events applied to state',
      icon: <Zap size={16} />,
      color: 'var(--color-governor-teal)',
      bg: 'var(--color-governor-teal-light)',
    },
    {
      title: '6. Materiality Check',
      subtitle: materiality.length ? `${materiality.length} evaluation${materiality.length > 1 ? 's' : ''}` : null,
      desc: 'Deterministic materiality of each event',
      icon: <AlertTriangle size={16} />,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
    },
    {
      title: '7. Observe-Adapt Re-Plan',
      subtitle: replans.length ? `State v${replans[replans.length - 1].state_version} Re-Plan` : null,
      desc: 'Governor re-evaluates after a material change',
      icon: <RefreshCw size={16} />,
      color: 'var(--color-accent-blue)',
      bg: 'var(--color-accent-blue-light)',
    },
  ];

  return (
    <Card padding="md" style={{ borderLeft: '4px solid var(--color-accent-blue)' }}>
      <CardHeader style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitBranch size={18} style={{ color: 'var(--color-accent-blue)' }} />
            <CardTitle style={{ fontSize: '0.9375rem' }}>End-to-End Decision Lifecycle Traceability</CardTitle>
          </div>
          <Badge variant="info">{trace.length} Trace Records</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
          }}
        >
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  <ArrowRight size={14} />
                </div>
              )}
              <div
                style={{
                  minWidth: '150px',
                  opacity: step.subtitle ? 1 : 0.5,
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: step.bg,
                      color: step.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {step.title}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: step.subtitle ? step.color : 'var(--color-text-muted)',
                    fontFamily: 'monospace',
                  }}
                >
                  {step.subtitle ?? 'Not reached yet'}
                </div>

                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                  {step.desc}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
