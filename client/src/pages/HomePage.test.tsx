import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { jacket, ring } from '../test/fixtures';
import { apiError, featuredProducts, mockCategories, mockFeatured, mockProducts } from '../test/handlers';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

beforeEach(() => {
  mockCategories();
});

async function featuredTiles() {
  const grid = await screen.findByRole('list', { name: 'Featured products' });
  return within(grid).getAllByRole('link');
}

describe('Home page', () => {
  it('shows the 5 featured products in the order the API returns them (H1)', async () => {
    mockFeatured();
    renderApp('/');

    const tiles = await featuredTiles();

    expect(tiles).toHaveLength(5);
    expect(tiles.map((tile) => tile.querySelector('.tile__title')?.textContent)).toEqual(
      featuredProducts.map((product) => product.title),
    );
  });

  it('shows each product’s price in AUD and its rating', async () => {
    mockFeatured([jacket]);
    renderApp('/');

    const [tile] = await featuredTiles();

    expect(tile).toHaveTextContent('Mens Cotton Jacket');
    expect(tile).toHaveTextContent('$55.99');
    expect(tile).toHaveTextContent('4.7 out of 5 (100 reviews)');
    expect(tile?.querySelector('img')).toHaveAttribute('src', 'https://images.example.com/1.jpg');
  });

  it('shows no rating for an unrated product (G4)', async () => {
    mockFeatured([ring]);
    renderApp('/');

    const [tile] = await featuredTiles();

    expect(tile).toHaveTextContent('$9.99');
    expect(tile).not.toHaveTextContent('out of 5');
  });

  it('opens the product page when a tile is clicked', async () => {
    mockFeatured([jacket]);
    mockProducts();
    renderApp('/');

    await userEvent.click((await featuredTiles())[0] as HTMLElement);

    expect(screen.getByTestId('location')).toHaveTextContent('/products/1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
  });

  it('shows a loading message while products load', async () => {
    mockFeatured();
    renderApp('/');

    expect(screen.getByRole('status')).toHaveTextContent('Loading featured products…');
    await featuredTiles();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the server’s message when products are unavailable, and can retry (G2)', async () => {
    let calls = 0;
    server.use(
      http.get('/api/products/featured', () => {
        calls += 1;
        return calls === 1
          ? apiError(503, 'PRODUCT_SOURCE_UNAVAILABLE', 'Products are temporarily unavailable. Please try again shortly.')
          : HttpResponse.json({ products: [jacket] });
      }),
    );
    renderApp('/');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Products are temporarily unavailable. Please try again shortly.');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await featuredTiles()).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says so when there are no featured products', async () => {
    mockFeatured([]);
    renderApp('/');

    expect(await screen.findByText('No featured products right now.')).toBeInTheDocument();
  });
});
