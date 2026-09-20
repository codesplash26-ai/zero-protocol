import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Target, GitBranch, ShieldCheck, FileCheck, Zap, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

export const LifecycleTraceGraph: React.FC = () => {
  const steps = [
    {
      title: '1. Goal & Decision',
      subtitle: 'GOAL-001 • DEC-001',
      desc: 'Define 4-week growth goal & constraints',
      icon: <Target size={16} />,
      color: 'var(--color-accent-blue)',
      bg: 'var(--color-accent-blue-light)',
    },
    {
      title: '2. Strategy Optimization',
      subtitle: 'Automated Evaluation',
      desc: 'Synthesize candidate strategies under constraints',
      icon: <GitBranch size={16} />,
      color: 'var(--color-accent-purple)',
      bg: 'rgba(139, 92, 246, 0.15)',
    },
    {
      title: '3. Approval Routing',
      subtitle: 'APR-001 Threshold',
      desc: 'Founder authorization check ($2,000 threshold)',
      icon: <ShieldCheck size={16} />,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
    },
    {
      title: '4. Action Execution',
      subtitle: 'ACT-001 Receipt',
      desc: 'Reserve budget & eng hours in state',
      icon: <FileCheck size={16} />,
      color: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
    },
    {
      title: '5. Event Ingestion',
      subtitle: 'EVENT-001 Trigger',
      desc: 'Runtime vendor delay or telemetry stream',
      icon: <Zap size={16} />,
      color: 'var(--color-governor-teal)',
      bg: 'var(--color-governor-teal-light)',
    },
    {
      title: '6. Materiality Check',
      subtitle: 'Materiality Assessment',
      desc: 'Evaluate capacity & strategy feasibility',
      icon: <AlertTriangle size={16} />,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
    },
    {
      title: '7. Observe-Adapt Re-Plan',
      subtitle: 'State v2 Re-Plan',
      desc: 'Synthesize adapted strategy & route',
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
          <Badge variant="info">Immutable Trace Chain</Badge>
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

                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: step.color, fontFamily: 'monospace' }}>
                  {step.subtitle}
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
