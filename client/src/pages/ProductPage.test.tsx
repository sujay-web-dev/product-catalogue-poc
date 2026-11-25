import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { jacket } from '../test/fixtures';
import { apiError, mockCategories, mockFeatured, mockProducts } from '../test/handlers';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

beforeEach(() => {
  mockCategories();
});

describe('Product page', () => {
  it('opens from a product tile and shows the product details (acceptance: product page, P1)', async () => {
    mockFeatured([jacket]);
    mockProducts();
    renderApp('/');

    // GIVEN I am browsing products, WHEN I click on a product tile …
    const grid = await screen.findByRole('list', { name: 'Featured products' });
    await userEvent.click(within(grid).getByRole('link'));

    // … THEN I see the product details page.
    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/products/1');
    expect(screen.getByRole('img', { name: 'Mens Cotton Jacket' })).toHaveAttribute(
      'src',
      'https://images.example.com/1.jpg',
    );
    expect(screen.getByText('$55.99')).toBeInTheDocument();
    expect(screen.getByText('Description of Mens Cotton Jacket.')).toBeInTheDocument();
    expect(screen.getByText('★ 4.7 out of 5 (100 reviews)')).toBeInTheDocument();
    // Scoped to the product: the header also links to this category.
    expect(within(screen.getByRole('article')).getByRole('link', { name: "Men's Clothing" })).toHaveAttribute(
      'href',
      '/categories/mens-clothing',
    );
  });

  it('links Enquire to the product’s enquiry page (E1)', async () => {
    mockProducts();
    renderApp('/products/1');

    const enquire = await screen.findByRole('link', { name: 'Enquire' });

    expect(enquire).toHaveAttribute('href', '/products/1/enquire');
  });

  it('hides the rating for an unrated product (G4)', async () => {
    mockProducts();
    renderApp('/products/5');

    expect(await screen.findByRole('heading', { level: 1, name: 'Gold Plated Ring' })).toBeInTheDocument();
    expect(screen.queryByText('Rating')).not.toBeInTheDocument();
    expect(screen.queryByText(/out of 5/)).not.toBeInTheDocument();
  });

  it('shows "Product not found" with a way home for an unknown ID (P1)', async () => {
    mockProducts();
    renderApp('/products/999');

    expect(await screen.findByRole('heading', { level: 1, name: 'Product not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to featured products' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Enquire' })).not.toBeInTheDocument();
  });

  it('shows the server’s message when products are unavailable, and can retry (G2)', async () => {
    let calls = 0;
    server.use(
      http.get('/api/products/:id', () => {
        calls += 1;
        return calls === 1
          ? apiError(503, 'PRODUCT_SOURCE_UNAVAILABLE', 'Products are temporarily unavailable. Please try again shortly.')
          : HttpResponse.json({ product: jacket });
      }),
    );
    renderApp('/products/1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Products are temporarily unavailable.');
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
  });
});
