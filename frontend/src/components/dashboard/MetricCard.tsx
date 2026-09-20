import React from 'react';
import { Card } from '../ui/Card';

export interface MetricCardProps {
  label: string;
  primaryValue: string;
  secondaryValue: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  primaryValue,
  secondaryValue,
  icon,
  iconBgColor = 'var(--color-accent-blue-light)',
  iconColor = 'var(--color-accent-blue)',
}) => {
  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
            {label}
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-text-main)',
              letterSpacing: '-0.02em',
              marginTop: '0.25rem',
              lineHeight: 1.2,
            }}
          >
            {primaryValue}
          </div>
        </div>

        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: iconBgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
          fontWeight: 500,
        }}
      >
        {secondaryValue}
      </div>
    </Card>
  );
};
