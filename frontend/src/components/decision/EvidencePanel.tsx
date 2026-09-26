import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { EvidenceItem } from '../../types/contract';
import { formatDateTime } from '../../lib/format';
import { FileCheck, ShieldCheck } from 'lucide-react';

export interface EvidencePanelProps {
  evidence: EvidenceItem[];
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  return (
    <Card padding="lg">
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-accent-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-blue)',
            }}
          >
            <FileCheck size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              DECISION EVIDENCE
            </div>
            <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
              Empirical Signals & Constraints
            </CardTitle>
          </div>
        </div>

        <Badge variant="teal">{evidence.length} Evidence Items</Badge>
      </CardHeader>

      <CardContent style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {evidence.length === 0 && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              No evidence has been recorded for this goal.
            </div>
          )}
          {evidence.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-accent-blue)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {item.source} (ID: {item.id})
                </span>

                <Badge variant={item.quality === 'HIGH' ? 'teal' : 'default'} size="sm">
                  <ShieldCheck size={12} />
                  <span>Quality: {item.quality}</span>
                </Badge>
              </div>

              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.4 }}>
                "{item.content}"
              </div>

              {item.relevance && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
                  <strong>Relevance:</strong> {item.relevance}
                </div>
              )}
              {(item.retrieved_at || item.freshness || item.trust_level) && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {[
                    item.retrieved_at && `Retrieved ${formatDateTime(item.retrieved_at)}`,
                    item.freshness && `Freshness: ${item.freshness}`,
                    item.trust_level && `Trust: ${item.trust_level}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
              {item.conflicts.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                  <strong>Conflicts:</strong> {item.conflicts.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
