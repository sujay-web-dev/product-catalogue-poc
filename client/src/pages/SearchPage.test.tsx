import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { jacket } from '../test/fixtures';
import { apiError, mockCategories, mockFeatured, mockSearch } from '../test/handlers';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

beforeEach(() => {
  mockCategories();
});

const resultTitles = () =>
  within(screen.getByRole('list', { name: 'Search results' }))
    .getAllByRole('link')
    .map((tile) => tile.querySelector('.tile__title')?.textContent);

describe('Search page', () => {
  it('shows only products matching the term (acceptance: search)', async () => {
    mockFeatured();
    const terms = mockSearch();
    renderApp('/');

    // GIVEN I have entered a search term in the search bar, WHEN I click the search button …
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'mens');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    // … THEN I only see products that have text matching that search term.
    expect(await screen.findByRole('heading', { level: 1, name: 'Search results for “mens”' })).toBeInTheDocument();
    expect(resultTitles()).toEqual(['Mens Cotton Jacket', 'Mens Leather Belt', 'Mens Wool Beanie', 'Mens Running Shorts']);
    expect(screen.queryByText('Gold Plated Ring')).not.toBeInTheDocument();
    expect(screen.getByText('4 products found')).toBeInTheDocument();
    expect(terms).toEqual(['mens']);
  });

  it('says "1 product found" for a single result', async () => {
    mockSearch();
    renderApp('/search?q=jacket');

    expect(await screen.findByText('1 product found')).toBeInTheDocument();
    expect(resultTitles()).toEqual(['Mens Cotton Jacket']);
  });

  it('says so when nothing matches', async () => {
    mockSearch();
    renderApp('/search?q=submarine');

    expect(
      await screen.findByText('No products match “submarine”. Try a different word, or browse a category.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument();
  });

  it('runs a new search from the results page', async () => {
    const terms = mockSearch();
    renderApp('/search?q=jacket');
    await screen.findByText('1 product found');

    const box = screen.getByRole('searchbox', { name: 'Search products' });
    await userEvent.clear(box);
    await userEvent.type(box, 'belt');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Search results for “belt”' })).toBeInTheDocument();
    expect(await screen.findByText('1 product found')).toBeInTheDocument();
    expect(resultTitles()).toEqual(['Mens Leather Belt']);
    expect(terms).toEqual(['jacket', 'belt']);
  });

  it.each(['/search', '/search?q=', '/search?q=%20%20'])(
    'does not search for an empty term (S3): %s',
    async (path) => {
      const terms = mockSearch();
      renderApp(path);

      expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
      expect(screen.getByText('Enter a search term above to find products.')).toBeInTheDocument();
      expect(terms).toEqual([]);
    },
  );

  it('shows the server’s message for a term that is too long, without a retry button (S3)', async () => {
    server.use(
      http.get('/api/search', () =>
        apiError(400, 'VALIDATION_ERROR', 'Enter a search term of 1 to 100 characters'),
      ),
    );
    renderApp(`/search?q=${'a'.repeat(101)}`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Enter a search term of 1 to 100 characters');
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the server’s message when products are unavailable, and can retry (G2)', async () => {
    let calls = 0;
    server.use(
      http.get('/api/search', () => {
        calls += 1;
        return calls === 1
          ? apiError(503, 'PRODUCT_SOURCE_UNAVAILABLE', 'Products are temporarily unavailable. Please try again shortly.')
          : HttpResponse.json({ products: [jacket] });
      }),
    );
    renderApp('/search?q=jacket');

    const alert = await screen.findByRole('alert');
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('1 product found')).toBeInTheDocument();
  });
});
