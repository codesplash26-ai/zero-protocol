import React from 'react';

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  action,
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <section
      className={`eg-section ${className}`}
      style={{
        marginBottom: '2rem',
        ...style,
      }}
      {...props}
    >
      {(title || description || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-main)',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '0.125rem',
                }}
              >
                {description}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};
