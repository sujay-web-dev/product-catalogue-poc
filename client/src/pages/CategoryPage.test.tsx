import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { jewellery } from '../test/fixtures';
import { apiError, categoryPages, mockCategories, mockCategoryPages, mockFeatured } from '../test/handlers';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

beforeEach(() => {
  mockCategories();
});

const titlesIn = (list: HTMLElement) =>
  within(list)
    .getAllByRole('link')
    .map((tile) => tile.querySelector('.tile__title')?.textContent);

describe('Category page', () => {
  it('shows top rated products, then the rest of the category (acceptance: category page)', async () => {
    mockFeatured();
    mockCategoryPages();
    renderApp('/');

    // GIVEN products organised into categories, WHEN I click a category link …
    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    await userEvent.click(within(nav).getByRole('link', { name: "Men's Clothing" }));

    // … THEN I see top rated products AND additional products in that category.
    expect(await screen.findByRole('heading', { level: 1, name: "Men's Clothing" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Top rated' })).toBeInTheDocument();
    expect(titlesIn(screen.getByRole('list', { name: "Top rated in Men's Clothing" }))).toEqual([
      'Mens Cotton Jacket',
      'Mens Wool Beanie',
      'Mens Leather Belt',
    ]);
    expect(screen.getByRole('heading', { level: 2, name: "More in Men's Clothing" })).toBeInTheDocument();
    expect(titlesIn(screen.getByRole('list', { name: "More in Men's Clothing" }))).toEqual(['Mens Running Shorts']);
  });

  it('hides the "More in" section when the category has no other products', async () => {
    mockCategoryPages();
    renderApp('/categories/jewellery');

    expect(await screen.findByRole('heading', { level: 1, name: 'Jewellery' })).toBeInTheDocument();
    expect(titlesIn(screen.getByRole('list', { name: 'Top rated in Jewellery' }))).toEqual(['Gold Plated Ring']);
    expect(screen.queryByRole('heading', { name: /More in/ })).not.toBeInTheDocument();
  });

  it('loads the new category when switching between category links', async () => {
    mockCategoryPages();
    renderApp('/categories/mens-clothing');
    await screen.findByRole('heading', { level: 1, name: "Men's Clothing" });

    await userEvent.click(screen.getByRole('link', { name: 'Jewellery' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Jewellery' })).toBeInTheDocument();
    expect(screen.queryByText('Mens Cotton Jacket')).not.toBeInTheDocument();
  });

  it('opens a product from the category listing', async () => {
    mockCategoryPages();
    renderApp('/categories/mens-clothing');

    const list = await screen.findByRole('list', { name: "More in Men's Clothing" });
    await userEvent.click(within(list).getByRole('link'));

    expect(screen.getByTestId('location')).toHaveTextContent('/products/4');
  });

  it('shows "Category not found" with a way home for an unknown category (C2)', async () => {
    mockCategoryPages();
    renderApp('/categories/garden');

    expect(await screen.findByRole('heading', { level: 1, name: 'Category not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to featured products' })).toHaveAttribute('href', '/');
  });

  it('shows the server’s message when products are unavailable, and can retry (G2)', async () => {
    let calls = 0;
    server.use(
      http.get('/api/categories/:slug', () => {
        calls += 1;
        return calls === 1
          ? apiError(503, 'PRODUCT_SOURCE_UNAVAILABLE', 'Products are temporarily unavailable. Please try again shortly.')
          : HttpResponse.json(categoryPages.jewellery);
      }),
    );
    renderApp(`/categories/${jewellery.slug}`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Products are temporarily unavailable.');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Jewellery' })).toBeInTheDocument();
  });
});
