import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Collapsed-by-default area for IDs and solver data, so plain language leads.
 * Hidden entirely in presentation mode (`.eg-tech`).
 */
export const TechnicalDetails: React.FC<{ children: React.ReactNode; label?: string }> = ({
  children,
  label = 'Technical details',
}) => (
  <details className="eg-tech" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
    <summary
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        cursor: 'pointer',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        listStyle: 'none',
        userSelect: 'none',
      }}
    >
      <ChevronRight size={14} className="eg-tech-chevron" />
      {label}
    </summary>
    <div
      style={{
        marginTop: '0.5rem',
        padding: '0.75rem 0.875rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg)',
        border: '1px dashed var(--color-border)',
        lineHeight: 1.6,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </div>
    <style>{`
      .eg-tech summary::-webkit-details-marker { display: none; }
      .eg-tech[open] .eg-tech-chevron { transform: rotate(90deg); }
      .eg-tech-chevron { transition: transform 0.15s ease; }
    `}</style>
  </details>
);
