import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck } from 'lucide-react';

export const Approvals: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Actions requiring founder approval."
        badge={<Badge variant="warning">Governance</Badge>}
      />

      <Card padding="lg">
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-warning-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-warning)',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.0625rem' }}>Approval Queue</CardTitle>
              <CardDescription>Actions requiring founder approval.</CardDescription>
            </div>
          </div>
          <Badge variant="default">0 Pending</Badge>
        </CardHeader>
        <CardContent>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            No critical decisions awaiting founder authorization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Approvals;
