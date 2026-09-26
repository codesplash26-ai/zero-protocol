import React from 'react';
import { Loader2, WifiOff, Inbox, AlertCircle } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

export interface LiveDataStateProps {
  kind: 'loading' | 'unavailable' | 'empty' | 'error';
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  compact?: boolean;
}

const DEFAULTS: Record<LiveDataStateProps['kind'], { title: string; message: string }> = {
  loading: { title: 'Loading live data…', message: 'Fetching the latest state from the Experiment Governor.' },
  unavailable: {
    title: 'Live data unavailable',
    message: 'The backend could not be reached, so no organizational state is shown.',
  },
  empty: { title: 'Nothing here yet', message: 'The backend has not recorded anything for this section.' },
  error: { title: 'This section could not be loaded', message: 'The backend returned an error.' },
};

/** Honest placeholder used instead of mock values when live data is missing. */
export const LiveDataState: React.FC<LiveDataStateProps> = ({ kind, title, message, action, compact = false }) => {
  const icon =
    kind === 'loading' ? (
      <Loader2 size={20} className="eg-spin" />
    ) : kind === 'unavailable' ? (
      <WifiOff size={20} />
    ) : kind === 'error' ? (
      <AlertCircle size={20} />
    ) : (
      <Inbox size={20} />
    );
  const tone = kind === 'error' ? 'var(--color-danger)' : 'var(--color-text-muted)';

  return (
    <Card padding={compact ? 'md' : 'lg'}>
      <div
        role={kind === 'loading' ? 'status' : undefined}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '0.5rem',
          padding: compact ? '0.5rem 0' : '1.5rem 0',
        }}
      >
        <div style={{ color: tone }}>{icon}</div>
        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
          {title ?? DEFAULTS[kind].title}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', maxWidth: '520px', lineHeight: 1.5 }}>
          {message ?? DEFAULTS[kind].message}
        </div>
        {action && (
          <div style={{ marginTop: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes eg-spin { to { transform: rotate(360deg); } }
        .eg-spin { animation: eg-spin 1s linear infinite; }
      `}</style>
    </Card>
  );
};
