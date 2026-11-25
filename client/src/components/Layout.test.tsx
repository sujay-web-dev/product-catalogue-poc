import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockCategories } from '../test/handlers';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

describe('Layout header (C3)', () => {
  it('links to every category from the API, using our slugs', async () => {
    mockCategories();
    renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    expect(within(nav).getByRole('link', { name: "Men's Clothing" })).toHaveAttribute('href', '/categories/mens-clothing');
    expect(within(nav).getByRole('link', { name: 'Jewellery' })).toHaveAttribute('href', '/categories/jewellery');
  });

  it('marks the current category link as active', async () => {
    mockCategories();
    renderApp('/categories/jewellery');

    expect(await screen.findByRole('link', { name: 'Jewellery' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: "Men's Clothing" })).not.toHaveAttribute('aria-current');
  });

  it('searches with the trimmed term when the Search button is clicked', async () => {
    mockCategories();
    renderApp('/');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), '  men jacket ');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=men+jacket');
    expect(screen.getByRole('heading', { level: 1, name: 'Search results' })).toBeInTheDocument();
  });

  it('does not search for an empty term (S3)', async () => {
    mockCategories();
    renderApp('/');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('shows the current term in the search box on the results page', async () => {
    mockCategories();
    renderApp('/search?q=belt');

    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('belt');
  });

  it('keeps search and the home link working when categories fail to load', async () => {
    let requested = false;
    server.use(
      http.get('/api/categories', () => {
        requested = true;
        return HttpResponse.json({ error: { code: 'X', message: 'down' } }, { status: 503 });
      }),
    );
    renderApp('/');

    await vi.waitFor(() => expect(requested).toBe(true));
    expect(screen.queryByRole('navigation', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Product Catalogue' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toBeInTheDocument();
  });
});
