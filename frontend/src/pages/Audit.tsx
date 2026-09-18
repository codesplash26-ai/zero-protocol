import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FileText } from 'lucide-react';

export const Audit: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Decision history and system activity."
        badge={<Badge variant="info">Immutable Audit</Badge>}
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
              <FileText size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.0625rem' }}>System Audit Log</CardTitle>
              <CardDescription>Decision history and system activity.</CardDescription>
            </div>
          </div>
          <Badge variant="default">Clean</Badge>
        </CardHeader>
        <CardContent>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            System decision trail ledger initialized.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Audit;
