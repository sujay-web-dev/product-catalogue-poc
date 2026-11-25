import { useEffect, useState, type DependencyList } from 'react';
import { ApiError } from './api';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; data: T };

/**
 * Runs `load` when `deps` change and tracks loading, error and data.
 * Results from an older run are ignored, so fast navigation can't show stale data.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ status: 'loading' });
    load().then(
      (data) => current && setState({ status: 'success', data }),
      (error: unknown) =>
        current &&
        setState({
          status: 'error',
          error: error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Something went wrong.'),
        }),
    );
    return () => {
      current = false;
    };
    // `load` is a new function on every render; `deps` says when to rerun it.
  }, [...deps, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
