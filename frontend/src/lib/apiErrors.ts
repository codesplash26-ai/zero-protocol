import { ApiError } from '../api/client';

/** One founder-readable sentence for a failed API call. */
export function describeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (error.isNetworkError) return 'The backend is not responding. Check the connection and try again.';
  if (error.isStateVersionConflict) {
    return 'The organization state changed while you were working. The latest data has been reloaded — review it and try again.';
  }
  if (error.isValidationError) {
    const fields = error.validationErrors
      .map((detail) => detail.location.filter((part) => part !== 'body').join('.'))
      .filter(Boolean);
    return fields.length ? `Please check: ${fields.join(', ')}.` : error.message;
  }
  if (error.status === 404) return `Not found: ${error.message}`;
  return error.message;
}
