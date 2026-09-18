import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Compass } from 'lucide-react';

export const Decision: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Decision"
        description="Founder decision workspace."
        badge={<Badge variant="teal">Decision Engine</Badge>}
      />

      <Card padding="lg">
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-governor-teal-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-governor-teal)',
              }}
            >
              <Compass size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.0625rem' }}>Decision Intelligence Workspace</CardTitle>
              <CardDescription>Founder decision workspace.</CardDescription>
            </div>
          </div>
          <Badge variant="default">Idle</Badge>
        </CardHeader>
        <CardContent>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            System ready to run governor analysis and recommendation routines.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Decision;
