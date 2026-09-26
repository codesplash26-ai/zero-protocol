/** Small presentation helpers for API values (ISO timestamps, integers). */

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** 2500 -> "$2,500" */
export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

/**
 * Signed engineering delta as the contract defines it: positive is capacity
 * gained, negative is capacity lost. 18 -> "+18h", -12 -> "−12h", 0 -> "0h".
 */
export function formatSignedHours(delta: number): string {
  if (delta > 0) return `+${delta}h`;
  if (delta < 0) return `−${Math.abs(delta)}h`;
  return '0h';
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** ISO timestamp -> "Just now", "5 minutes ago", "yesterday"; older than a week -> date. */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 45) return 'Just now';
  if (Math.abs(seconds) >= 7 * 86_400) return formatDateTime(iso);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormatter.format(Math.round(seconds / size), unit);
    }
  }
  return relativeFormatter.format(Math.round(seconds / 60), 'minute');
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** ISO timestamp -> "Sep 26, 1:58 PM" in the viewer's time zone. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}
