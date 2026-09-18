import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LayoutDashboard, Activity, Shield, Cpu } from 'lucide-react';

export const Overview: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Startup state and current decision overview."
        badge={<Badge variant="default">PulseBoard Workspace</Badge>}
      />

      <Card padding="lg">
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-accent-blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent-blue)',
              }}
            >
              <LayoutDashboard size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.0625rem' }}>System Workspace Initialized</CardTitle>
              <CardDescription>
                Startup state and current decision overview.
              </CardDescription>
            </div>
          </div>
          <Badge variant="teal" size="md">
            Active
          </Badge>
        </CardHeader>

        <CardContent style={{ marginTop: '1.25rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                <Cpu size={14} style={{ color: 'var(--color-governor-teal)' }} />
                <span>GOVERNANCE ENGINE</span>
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.25rem' }}>
                Zero Protocol Active
              </div>
            </div>

            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                <Shield size={14} style={{ color: 'var(--color-accent-blue)' }} />
                <span>WORKSPACE MODE</span>
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.25rem' }}>
                Founder Decision Control
              </div>
            </div>

            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                <Activity size={14} style={{ color: 'var(--color-success)' }} />
                <span>FOUNDATION STATE</span>
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.25rem' }}>
                System Ready
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
