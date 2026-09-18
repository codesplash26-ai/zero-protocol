import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  ariaLabel: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  ariaLabel,
  variant = 'ghost',
  size = 'md',
  className = '',
  style,
  disabled,
  ...props
}) => {
  const sizeMap = {
    sm: { width: '28px', height: '28px', fontSize: '0.875rem' },
    md: { width: '36px', height: '36px', fontSize: '1rem' },
    lg: { width: '44px', height: '44px', fontSize: '1.25rem' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-main)',
      border: '1px solid var(--color-border)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1px solid transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-main)',
      border: '1px solid var(--color-border)',
    },
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease-in-out',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    ...sizeMap[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button
      type="button"
      className={`eg-icon-button ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={buttonStyle}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};
