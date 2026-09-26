import React from 'react';

/**
 * Experiment Governor logo: a shield (governance, founder approval) holding a
 * lab flask (experiments). Drawn in the same stroke style as the lucide icons
 * used across the app; colour comes from `currentColor`.
 */
export const BrandMark: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M10.5 7.5h3" strokeWidth={1.75} />
    <path d="M11 7.5v3l-2.4 4.3a1 1 0 0 0 .87 1.5h5.06a1 1 0 0 0 .87-1.5L13 10.5v-3" strokeWidth={1.75} />
    <path d="M9.7 13.4h4.6" strokeWidth={1.5} />
  </svg>
);
