import type { ApiError } from '../api';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="status">
      {label}
    </p>
  );
}

/** G2: a friendly message instead of a broken page, with a way to try again. */
export function ErrorMessage({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="error">
      <p>{error.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
