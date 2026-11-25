import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCategories } from './test/handlers';
import { renderApp } from './test/renderApp';
import { server } from './test/server';

describe('AppRoutes', () => {
  beforeEach(() => {
    mockCategories();
  });

  it.each([
    ['/', 'Featured products'],
    ['/categories/electronics', 'Category'],
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

  it('fails requests that have no handler, so tests never reach the network', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Assert MSW's own error, not just any failure: a real request to a closed
    // port would also reject, which would hide a misconfigured setup.
    await expect(fetch('/api/unhandled')).rejects.toMatchObject({
      cause: { message: expect.stringContaining('[MSW]') },
    });

    vi.restoreAllMocks();
  });
});
