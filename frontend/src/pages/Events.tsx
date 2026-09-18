import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Zap } from 'lucide-react';

export const Events: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Events"
        description="Material events and replanning."
        badge={<Badge variant="teal">Event Stream</Badge>}
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
              <Zap size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: '1.0625rem' }}>Material Events & Replanning</CardTitle>
              <CardDescription>Material events and replanning.</CardDescription>
            </div>
          </div>
          <Badge variant="default">Listening</Badge>
        </CardHeader>
        <CardContent>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            System event listener active for runtime trigger monitoring.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Events;
