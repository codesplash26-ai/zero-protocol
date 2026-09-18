import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FlaskConical } from 'lucide-react';

export const Experiments: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Experiments"
        description="Candidate experiments and experiment details."
        badge={<Badge variant="info">Registry</Badge>}
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
              <FlaskConical size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.0625rem' }}>Experiment Registry</CardTitle>
              <CardDescription>Candidate experiments and experiment details.</CardDescription>
            </div>
          </div>
          <Badge variant="default">Ready</Badge>
        </CardHeader>
        <CardContent>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Candidate experiments repository initialized.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Experiments;
