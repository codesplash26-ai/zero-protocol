import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Approval, ActionReceipt } from '../../mock/pulseboard';
import { ShieldCheck, CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export interface ApprovalHistoryTableProps {
  approvals: Approval[];
  actionReceipts: ActionReceipt[];
}

export const ApprovalHistoryTable: React.FC<ApprovalHistoryTableProps> = ({
  approvals,
  actionReceipts,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const historyItems = approvals.filter(a => a.decision !== 'PENDING');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <Card padding="md">
      <CardHeader style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-accent-blue)' }} />
            <CardTitle style={{ fontSize: '1rem' }}>Governance & Authorization Audit History</CardTitle>
          </div>
          <Badge variant="default">{historyItems.length} Past Authorization Logs</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {historyItems.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', padding: '1rem 0' }}>
            No past approval records logged.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ padding: '0.625rem 0.75rem' }}>Approval ID</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>Decision / Strategy</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>Resource Allocation</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>Threshold</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>Decision</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>Decided At</th>
                  <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.map(item => {
                  const receipt = actionReceipts.find(r => r.strategy_id === item.strategy_id);
                  const isExpanded = expandedId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: isExpanded ? 'var(--color-bg-subtle)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {item.id}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.strategy_id}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {item.decision_id}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            ${item.cost_usd?.toLocaleString()} USD
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {item.engineering_hours}h Eng Capacity
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          ${item.threshold_usd.toLocaleString()} USD
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {item.decision === 'APPROVED' ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm">
                              <XCircle size={12} style={{ marginRight: '4px' }} />
                              Rejected
                            </Badge>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.decided_at || item.requested_at}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(item.id)}
                            icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          >
                            {isExpanded ? 'Hide Details' : 'View Receipt'}
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded Action Receipt Details */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                          <td colSpan={7} style={{ padding: '1rem' }}>
                            <div
                              style={{
                                padding: '0.875rem',
                                backgroundColor: 'var(--color-bg-card)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.8125rem' }}>
                                  <FileText size={16} style={{ color: 'var(--color-accent-blue)' }} />
                                  Action Receipt Breakdown ({receipt?.id || 'ACT-RECEIPT'})
                                </div>
                                <Badge variant="success" size="sm">
                                  {receipt?.status || 'SUCCESS'}
                                </Badge>
                              </div>

                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                <strong>Authorization Reason: </strong>{item.reason}
                              </div>

                              {receipt && (
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                    gap: '0.5rem',
                                    marginTop: '0.5rem',
                                    paddingTop: '0.5rem',
                                    borderTop: '1px dotted var(--color-border)',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  <div>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Status Transition: </span>
                                    <strong>{receipt.previous_status} → {receipt.new_status}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Budget Reserved: </span>
                                    <strong>${receipt.budget_reserved_usd.toLocaleString()} USD</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Eng Hours Reserved: </span>
                                    <strong>{receipt.engineering_reserved_hours} Hours</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Executed At: </span>
                                    <strong>{receipt.executed_at}</strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
