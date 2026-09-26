import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export interface ApiResource<T> {
  /** Data for the current key; the previous key's data is never shown. */
  data: T | null;
  error: ApiError | null;
  /** True until the first response for the current key. */
  isLoading: boolean;
  reload: () => void;
}

interface State<T> {
  key: string | null;
  data: T | null;
  error: ApiError | null;
}

/**
 * Read-only page data fetched from the backend. `key` identifies what is
 * loaded (null = nothing to load); `version` is a primitive bumped by callers
 * (usually the provider's refreshedAt) to refetch the same key after a refresh.
 * Keeps the previous response on screen while a same-key refetch runs.
 */
export function useApiResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  version?: string | number,
): ApiResource<T> {
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: null });
  const [reloadCount, setReloadCount] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setState({ key, data, error: null });
      },
      (caught: unknown) => {
        if (cancelled) return;
        const error =
          caught instanceof ApiError ? caught : new ApiError(0, 'NETWORK_ERROR', 'The data could not be loaded.');
        setState((previous) => ({ key, data: previous.key === key ? previous.data : null, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, version, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const current = key !== null && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    isLoading: key !== null && !current,
    reload,
  };
}
