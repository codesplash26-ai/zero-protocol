import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hoverable = false,
  className = '',
  style,
  ...props
}) => {
  const paddingMap = {
    none: '0',
    sm: '1rem',
    md: '1.25rem',
    lg: '1.5rem',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    padding: paddingMap[padding],
    transition: hoverable ? 'all 0.15s ease-in-out' : 'none',
    ...style,
  };

  return (
    <div
      className={`eg-card ${hoverable ? 'hoverable' : ''} ${className}`}
      style={cardStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <div
    className={`eg-card-header ${className}`}
    style={{
      marginBottom: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <h3
    className={`eg-card-title ${className}`}
    style={{
      fontSize: '1rem',
      fontWeight: 600,
      color: 'var(--color-text-main)',
      letterSpacing: '-0.01em',
      margin: 0,
      ...style,
    }}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <p
    className={`eg-card-description ${className}`}
    style={{
      fontSize: '0.875rem',
      color: 'var(--color-text-secondary)',
      margin: '0.25rem 0 0 0',
      ...style,
    }}
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <div className={`eg-card-content ${className}`} style={style} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <div
    className={`eg-card-footer ${className}`}
    style={{
      marginTop: '1.25rem',
      paddingTop: '0.875rem',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '0.5rem',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);
