/**
 * Central fetch client for the Experiment Governor API.
 *
 * Transport only: base path, JSON, idempotency keys and error parsing. It holds
 * no page logic and never substitutes mock data when a request fails.
 */
import type { ApiErrorBody, ValidationErrorDetail } from '../types/contract';

/** Relative by default so nginx (Docker) and the Vite dev proxy both serve it. */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

export type HttpMethod = 'GET' | 'POST';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  query?: QueryParams;
  /** JSON-serialisable object, or FormData for multipart uploads. */
  body?: unknown;
  /**
   * Reuse the same key when retrying one logical action so the backend replays
   * the original response instead of applying it twice. Generated when omitted.
   */
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Defaults to DEFAULT_TIMEOUT_MS; raise it for large file uploads. */
  timeoutMs?: number;
}

/** Governor runs are asynchronous, so no API call should legitimately take longer. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Codes the backend uses when the request was based on stale organization state. */
const STALE_STATE_CODES = new Set(['STATE_VERSION_CONFLICT', 'APPROVAL_INVALIDATED']);

export class ApiError extends Error {
  /** HTTP status, or 0 when the backend could not be reached or timed out. */
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(status: number, code: string, message: string, details: unknown = null, requestId: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  /** The UI acted on an old state_version: refetch, then let the user retry. */
  get isStateVersionConflict(): boolean {
    return this.status === 409 && STALE_STATE_CODES.has(this.code);
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  /** Field errors for 422 VALIDATION_ERROR responses; empty otherwise. */
  get validationErrors(): ValidationErrorDetail[] {
    return this.isValidationError && Array.isArray(this.details) ? (this.details as ValidationErrorDetail[]) : [];
  }
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // randomUUID needs a secure context; plain-http LAN access falls back here.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body; // the browser sets the multipart boundary header
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (method !== 'GET') {
    headers['Idempotency-Key'] = options.idempotencyKey ?? newIdempotencyKey();
  }

  // One controller carries both the caller's cancellation and our timeout, so
  // a stopped backend surfaces quickly instead of after the proxy's own timeout.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener('abort', forwardAbort);
  if (options.signal?.aborted) controller.abort();

  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers, body, signal: controller.signal });
    payload = await readJson(response);
  } catch (error) {
    if (timedOut) {
      throw new ApiError(0, 'TIMEOUT', 'The Experiment Governor API did not respond in time.');
    }
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'The Experiment Governor API could not be reached.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forwardAbort);
  }

  if (response.ok) {
    if (payload === undefined) {
      throw new ApiError(response.status, 'INVALID_JSON', 'The API returned a response that is not valid JSON.');
    }
    return payload as T;
  }

  const requestId = response.headers.get('X-Request-ID');
  if (isErrorBody(payload)) {
    const { code, message, details, request_id } = payload.error;
    throw new ApiError(response.status, code, message, details ?? null, request_id ?? requestId);
  }
  throw new ApiError(
    response.status,
    `HTTP_${response.status}`,
    `The API request failed with HTTP ${response.status}.`,
    null,
    requestId,
  );
}

export const get = <T>(path: string, query?: QueryParams, signal?: AbortSignal): Promise<T> =>
  request<T>('GET', path, { query, signal });

export const post = <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'body'> = {}): Promise<T> =>
  request<T>('POST', path, { ...options, body });
