import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FailingProductRepository } from '../testing/inMemoryProductRepository.ts';
import { createTestApp } from '../testing/testApp.ts';

type ProductBody = { id: string; title: string };
const ids = (products: ProductBody[]) => products.map((product) => product.id);

afterEach(() => {
  vi.restoreAllMocks();
});

/** G2: a source outage becomes a friendly 503 with no internal details. */
async function expectSourceUnavailable(path: string) {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const app = createTestApp({ productRepository: new FailingProductRepository() });

  const res = await request(app).get(path);

  expect(res.status).toBe(503);
  expect(res.body).toEqual({
    error: {
      code: 'PRODUCT_SOURCE_UNAVAILABLE',
      message: 'Products are temporarily unavailable. Please try again shortly.',
    },
  });
}

// Fixture ratings, highest first: 1=4.7, 8=4.6, 7=4.5, 4=4.1, 3=3.9, 6=3.8 …
describe('GET /api/products/featured', () => {
  it('returns the owner’s picks first, in configured order (H1)', async () => {
    const app = createTestApp({ featuredIds: ['2', '11', '9', '5', '6'] });

    const res = await request(app).get('/api/products/featured');

    expect(res.status).toBe(200);
    expect(ids(res.body.products)).toEqual(['2', '11', '9', '5', '6']);
  });

  it('fills missing picks with the highest-rated products, always 5 (H2)', async () => {
    const app = createTestApp({ featuredIds: ['2', 'removed-from-source'] });

    const res = await request(app).get('/api/products/featured');

    expect(ids(res.body.products)).toEqual(['2', '1', '8', '7', '4']);
  });

  it('returns full product details in our own shape', async () => {
    const app = createTestApp({ featuredIds: ['1'] });

    const res = await request(app).get('/api/products/featured');

    expect(res.body.products[0]).toEqual({
      id: '1',
      title: 'Mens Cotton Jacket',
      description: 'A warm cotton jacket for spring and autumn.',
      price: 55.99,
      imageUrl: 'https://images.example.com/1.jpg',
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      rating: { rate: 4.7, count: 500 },
    });
  });

  it('returns 503 when the product source is down', async () => {
    await expectSourceUnavailable('/api/products/featured');
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product', async () => {
    const res = await request(createTestApp()).get('/api/products/6');

    expect(res.status).toBe(200);
    expect(res.body.product.title).toBe("Women's Rain Jacket");
  });

  it('returns 404 for an unknown ID (P1)', async () => {
    const res = await request(createTestApp()).get('/api/products/999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  });

  it.each([
    ['a space', 'a%20b'],
    ['a dot', '1.5'],
    ['an over-long ID', 'x'.repeat(65)],
  ])('returns 400 for an ID with %s, without echoing it', async (_name, id) => {
    const res = await request(createTestApp()).get(`/api/products/${id}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'Invalid product ID' } });
  });

  it('returns 503 when the product source is down', async () => {
    await expectSourceUnavailable('/api/products/1');
  });
});
