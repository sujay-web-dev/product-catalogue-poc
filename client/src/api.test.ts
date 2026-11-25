import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError, getCategoryPage, getFeaturedProducts, getProduct, searchProducts, sendEnquiry } from './api';
import { jacket, mensClothing } from './test/fixtures';
import { apiError } from './test/handlers';
import { server } from './test/server';

describe('api', () => {
  it('unwraps successful responses', async () => {
    server.use(http.get('/api/products/featured', () => HttpResponse.json({ products: [jacket] })));

    expect(await getFeaturedProducts()).toEqual([jacket]);
  });

  it('encodes path parameters and the search term', async () => {
    let productPath = '';
    let categoryPath = '';
    let searchTerm: string | null = null;
    server.use(
      http.get('/api/products/:id', ({ request }) => {
        productPath = new URL(request.url).pathname;
        return HttpResponse.json({ product: jacket });
      }),
      http.get('/api/categories/:slug', ({ request }) => {
        categoryPath = new URL(request.url).pathname;
        return HttpResponse.json({ category: mensClothing, topRated: [], additional: [] });
      }),
      http.get('/api/search', ({ request }) => {
        searchTerm = new URL(request.url).searchParams.get('q');
        return HttpResponse.json({ products: [] });
      }),
    );

    await getProduct('a/b');
    await getCategoryPage('x?y');
    await searchProducts("men's & boys' t-shirts");

    expect(productPath).toBe('/api/products/a%2Fb');
    expect(categoryPath).toBe('/api/categories/x%3Fy');
    expect(searchTerm).toBe("men's & boys' t-shirts");
  });

  it('posts an enquiry as JSON', async () => {
    let received: unknown;
    server.use(
      http.post('/api/enquiries', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ status: 'sent' }, { status: 201 });
      }),
    );

    await sendEnquiry({ productId: '1', name: 'Ada', email: 'ada@example.com' });

    expect(received).toEqual({ productId: '1', name: 'Ada', email: 'ada@example.com' });
  });

  it('turns the API error shape into an ApiError with the server’s message', async () => {
    server.use(http.get('/api/products/:id', () => apiError(404, 'NOT_FOUND', 'Product not found')));

    const error = await getProduct('999').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'Product not found' });
  });

  it('uses a generic message when the error body is not ours, e.g. from a proxy', async () => {
    server.use(http.get('/api/products/featured', () => new HttpResponse('<html>Bad Gateway</html>', { status: 502 })));

    await expect(getFeaturedProducts()).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN',
      message: 'Something went wrong. Please try again.',
    });
  });

  it('reports a network failure as NETWORK_ERROR', async () => {
    server.use(http.get('/api/products/featured', () => HttpResponse.error()));

    await expect(getFeaturedProducts()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
