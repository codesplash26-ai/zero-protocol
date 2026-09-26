import React, { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { useGovernorData } from '../../state/governorContext';

/** Shown above page content while the last /overview request failed. */
export const ConnectionBanner: React.FC = () => {
  const { error, refresh } = useGovernorData();
  const [retrying, setRetrying] = useState(false);

  if (!error) return null;

  const unreachable = error.isNetworkError || error.status === 502 || error.status === 503 || error.status === 504;
  const handleRetry = async () => {
    setRetrying(true);
    await refresh();
    setRetrying(false);
  };

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        padding: '0.625rem 1rem',
        marginBottom: '1rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-danger-bg)',
        border: '1px solid #FECACA',
        color: 'var(--color-danger)',
        fontSize: '0.8125rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <WifiOff size={16} />
        <span>
          <strong style={{ fontWeight: 600 }}>{unreachable ? 'Backend unavailable.' : 'Live data could not be loaded.'}</strong>{' '}
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {unreachable ? 'The Experiment Governor API is not responding' : `${error.code}: ${error.message}`}
            {' — retrying automatically.'}
          </span>
        </span>
      </div>
      <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={handleRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Retry'}
      </Button>
    </div>
  );
};
