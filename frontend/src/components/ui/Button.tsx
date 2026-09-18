import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'teal' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease-in-out',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.8125rem' },
    md: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
    lg: { padding: '0.625rem 1.25rem', fontSize: '1rem' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-accent-blue)',
      color: '#FFFFFF',
      borderColor: 'var(--color-accent-blue)',
    },
    secondary: {
      backgroundColor: 'var(--color-primary)',
      color: '#FFFFFF',
      borderColor: 'var(--color-primary)',
    },
    teal: {
      backgroundColor: 'var(--color-governor-teal)',
      color: '#FFFFFF',
      borderColor: 'var(--color-governor-teal)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-main)',
      borderColor: 'var(--color-border)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: 'var(--color-danger)',
      color: '#FFFFFF',
      borderColor: 'var(--color-danger)',
    },
  };

  const style = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  return (
    <button
      className={`eg-button ${className}`}
      style={style}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="eg-button-icon">{icon}</span>}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'right' && <span className="eg-button-icon">{icon}</span>}
    </button>
  );
};
