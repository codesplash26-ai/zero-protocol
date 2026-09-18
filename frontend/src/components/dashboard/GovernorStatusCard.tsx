import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { GovernorStatus } from '../../mock/pulseboard';
import { ShieldCheck, Activity, Clock } from 'lucide-react';

export interface GovernorStatusCardProps {
  status: GovernorStatus;
}

export const GovernorStatusCard: React.FC<GovernorStatusCardProps> = ({ status }) => {
  return (
    <Card
      padding="lg"
      style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid #99F6E4',
        boxShadow: '0 2px 8px -2px rgba(15, 118, 110, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'var(--color-governor-teal)',
        }}
      />

      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-governor-teal-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-governor-teal)',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-governor-teal)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              GOVERNOR ENGINE
            </div>
            <CardTitle style={{ fontSize: '1rem', marginTop: '0.125rem' }}>System Status</CardTitle>
          </div>
        </div>

        <Badge variant="teal" size="md">
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-governor-teal)',
            }}
          />
          <span>{status.state}</span>
        </Badge>
      </CardHeader>

      <CardContent style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div
          style={{
            padding: '0.75rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-governor-teal-light)',
            border: '1px solid #CCFBF1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            <Activity size={13} style={{ color: 'var(--color-governor-teal)' }} />
            <span>DECISION CYCLE</span>
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '0.125rem' }}>
            {status.decisionCycle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            paddingTop: '0.375rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
            <span>Last Activity:</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{status.lastActivity}</span>
        </div>
      </CardContent>
    </Card>
  );
};
