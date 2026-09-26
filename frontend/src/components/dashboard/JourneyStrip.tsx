import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { JOURNEY_STAGES, type JourneyPosition } from '../../lib/journey';

/** Goal → Recommendation → Approval → Action → Event → Replan, current stage highlighted. */
export const JourneyStrip: React.FC<{ position: JourneyPosition }> = ({ position }) => (
  <div
    className="eg-journey"
    aria-label="Governor loop progress"
    style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}
  >
    <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem', margin: 0, padding: 0, listStyle: 'none' }}>
      {JOURNEY_STAGES.map((stage, index) => {
        const done = index < position.current;
        const current = index === position.current;
        return (
          <li key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              aria-current={current ? 'step' : undefined}
              className={current ? 'eg-journey-current' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.3125rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: current ? 700 : 600,
                color: current ? '#FFFFFF' : done ? 'var(--color-governor-teal)' : 'var(--color-text-muted)',
                backgroundColor: current
                  ? 'var(--color-accent-blue)'
                  : done
                    ? 'var(--color-governor-teal-light)'
                    : 'var(--color-bg)',
                border: current || done ? '1px solid transparent' : '1px solid var(--color-border)',
              }}
            >
              {done ? <Check size={13} /> : <span style={{ opacity: 0.8 }}>{index + 1}</span>}
              {stage}
            </span>
            {index < JOURNEY_STAGES.length - 1 && (
              <span aria-hidden style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                →
              </span>
            )}
          </li>
        );
      })}
      <li aria-hidden title="The loop repeats after every replan" style={{ display: 'flex', color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
        <RotateCcw size={14} />
      </li>
    </ol>
    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
      <strong style={{ color: 'var(--color-text-primary)' }}>You are here: {JOURNEY_STAGES[position.current]}.</strong>{' '}
      {position.caption}
    </div>
    <style>{`
      .eg-journey-current { box-shadow: 0 0 0 3px rgba(59,130,246,0.22); }
    `}</style>
  </div>
);
