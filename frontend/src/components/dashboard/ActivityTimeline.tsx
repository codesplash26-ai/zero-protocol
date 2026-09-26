import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { AuditActivity } from '../../types/contract';
import { formatRelativeTime, formatDateTime } from '../../lib/format';
import { History, GitCommit } from 'lucide-react';

export interface ActivityTimelineProps {
  /** Most recent audit entries from GET /overview, newest first. */
  activities: AuditActivity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
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
            <History size={18} />
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
              DECISION LOG
            </div>
            <CardTitle style={{ fontSize: '1.0625rem', marginTop: '0.125rem' }}>
              Recent Activity
            </CardTitle>
          </div>
        </div>

        <Badge variant="default">Latest {activities.length} audit entries</Badge>
      </CardHeader>

      <CardContent style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {activities.length === 0 && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
              No Governor activity has been recorded yet.
            </div>
          )}
          {activities.map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.875rem',
                paddingBottom: '0.875rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono, monospace)',
                  backgroundColor: 'var(--color-bg)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}
                title={formatDateTime(act.created_at)}
              >
                {formatRelativeTime(act.created_at)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <GitCommit size={14} style={{ color: 'var(--color-governor-teal)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {act.title}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                  {act.summary}
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.375rem' }}>· state v{act.state_version}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
