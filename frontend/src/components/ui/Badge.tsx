import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  style,
  ...props
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: '#F1F5F9',
      color: '#334155',
      border: '1px solid #E2E8F0',
    },
    success: {
      backgroundColor: 'var(--color-success-bg)',
      color: 'var(--color-success)',
      border: '1px solid #BBF7D0',
    },
    warning: {
      backgroundColor: 'var(--color-warning-bg)',
      color: 'var(--color-warning)',
      border: '1px solid #FDE68A',
    },
    danger: {
      backgroundColor: 'var(--color-danger-bg)',
      color: 'var(--color-danger)',
      border: '1px solid #FECACA',
    },
    info: {
      backgroundColor: 'var(--color-accent-blue-light)',
      color: 'var(--color-accent-blue)',
      border: '1px solid #BFDBFE',
    },
    teal: {
      backgroundColor: 'var(--color-governor-teal-light)',
      color: 'var(--color-governor-teal)',
      border: '1px solid #99F6E4',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '0.125rem 0.5rem',
      fontSize: '0.75rem',
    },
    md: {
      padding: '0.25rem 0.625rem',
      fontSize: '0.8125rem',
    },
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontWeight: 600,
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span className={`eg-badge ${className}`} style={badgeStyle} {...props}>
      {children}
    </span>
  );
};
