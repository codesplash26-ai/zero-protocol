import { ApiError } from '../api/client';

/** One founder-readable sentence for a failed API call. */
export function describeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (error.code === 'TIMEOUT') return 'The backend took too long to respond. Please try again in a moment.';
  if (error.isNetworkError) return 'The backend is not responding. Check the connection and try again.';
  if (error.isStateVersionConflict) {
    return 'The organization state changed while you were working. The latest data has been reloaded — review it and try again.';
  }
  if (error.isValidationError) {
    const fields = error.validationErrors
      .map((detail) =>
        detail.location
          .filter((part) => part !== 'body' && typeof part === 'string')
          .join(' ')
          .replace(/_/g, ' '),
      )
      .filter(Boolean);
    return fields.length ? `Please check these fields: ${fields.join(', ')}.` : 'Some of the values entered are not valid. Please check the form and try again.';
  }
  // Server faults and non-JSON replies (e.g. a proxy error page) carry no founder-readable message.
  if (error.status >= 500 || error.code.startsWith('HTTP_') || error.code === 'INVALID_JSON') {
    return 'The server ran into a problem handling this request. Please try again in a moment.';
  }
  // Backend 4xx messages are written for people (e.g. "Experiment B was not found.").
  return error.message;
}
