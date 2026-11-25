import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCategories, mockFeatured } from './test/handlers';
import { renderApp } from './test/renderApp';
import { server } from './test/server';
import { unhandledRequests } from './test/setup';

describe('AppRoutes', () => {
  beforeEach(() => {
    mockCategories();
    mockFeatured();
  });

  // Real pages that load data have their own tests in src/pages/.
  it.each([
    ['/', 'Featured products'],
    ['/search?q=shirt', 'Search results'],
    ['/products/1', 'Product'],
    ['/products/1/enquire', 'Enquire'],
    ['/no-such-page', 'Page not found'],
  ])('renders %s', async (path, heading) => {
    renderApp(path);

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Product Catalogue' })).toHaveAttribute('href', '/');
    await screen.findByRole('navigation', { name: 'Categories' });
  });
});

describe('test setup', () => {
  it('MSW intercepts relative /api requests', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })));

    const res = await fetch('/api/health');

    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('blocks requests that have no handler and records them, so the test fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await fetch('/api/unhandled');

    // MSW's own answer, not a real server's: the request never left the test.
    expect(res.status).toBe(500);
    expect(res.statusText).toBe('Unhandled Exception');
    // Normally setup.ts fails the test for this; clear it because it is expected here.
    expect(unhandledRequests.splice(0)).toEqual(['GET /api/unhandled']);

    vi.restoreAllMocks();
  });
});
