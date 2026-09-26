import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { TechnicalDetails } from '../ui/TechnicalDetails';

interface State {
  error: Error | null;
}

/**
 * Shows a friendly message instead of a blank screen when a page fails to render.
 * Keyed by route in the layout, so navigating away recovers.
 */
export class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('Page failed to render:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          maxWidth: '640px',
          margin: '3rem auto',
          padding: '1.75rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <AlertTriangle size={22} style={{ color: 'var(--color-warning)' }} />
          <strong style={{ fontSize: '1.0625rem' }}>This page couldn't be displayed.</strong>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Something unexpected happened while showing this page. Your data is safe: everything is stored by the
          backend. Reload the page, or go back to the Overview.
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.assign('/overview')}>
            Go to Overview
          </Button>
        </div>
        <TechnicalDetails label="Error details">{error.message || String(error)}</TechnicalDetails>
      </div>
    );
  }
}
