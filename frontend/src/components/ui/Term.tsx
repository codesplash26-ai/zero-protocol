import React from 'react';
import { GLOSSARY, type GlossaryKey } from '../../lib/glossary';

/** Dotted-underline term with a tooltip; focusable so keyboard users can read it too. */
export const Term: React.FC<{ k: GlossaryKey; children: React.ReactNode }> = ({ k, children }) => (
  <span
    tabIndex={0}
    title={GLOSSARY[k]}
    aria-label={`${typeof children === 'string' ? children : ''} — ${GLOSSARY[k]}`}
    style={{ textDecoration: 'underline dotted', textUnderlineOffset: '3px', cursor: 'help' }}
  >
    {children}
  </span>
);
