import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { server } from './server';

/** Requests with no handler in the current test; checked after each test. */
export const unhandledRequests: string[] = [];

function describeFrame(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'request' in data && data.request instanceof Request) {
    return `${data.request.method} ${new URL(data.request.url).pathname}`;
  }
  return 'unknown request';
}

// Any request without a handler fails (so tests never touch the network) and is
// recorded. The app catches the failed fetch and shows an error state, so without
// the check below such a test could still pass.
beforeAll(() =>
  server.listen({
    onUnhandledFrame({ frame }) {
      const request = describeFrame(frame.data);
      unhandledRequests.push(request);
      // Throwing is what blocks the request: MSW's defaults.error() only prints,
      // and the request would then reach the real network.
      throw new Error(`[MSW] No handler for ${request}`);
    },
  }),
);
afterEach(() => {
  cleanup();
  server.resetHandlers();
  const unhandled = unhandledRequests.splice(0);
  expect(unhandled, 'requests without an MSW handler').toEqual([]);
});
afterAll(() => server.close());
