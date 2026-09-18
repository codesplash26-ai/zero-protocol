import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
}) => {
  return (
    <div
      className="eg-page-header"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--color-text-main)',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              marginTop: '0.375rem',
            }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
