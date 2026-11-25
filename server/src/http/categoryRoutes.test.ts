import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { expectSourceUnavailable } from '../testing/expectSourceUnavailable.ts';
import { createTestApp } from '../testing/testApp.ts';

type ProductBody = { id: string };
const ids = (products: ProductBody[]) => products.map((product) => product.id);

describe('GET /api/categories', () => {
  it('lists our categories as { slug, name } (C2, C3)', async () => {
    const res = await request(createTestApp()).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      categories: [
        { slug: 'mens-clothing', name: "Men's Clothing" },
        { slug: 'womens-clothing', name: "Women's Clothing" },
        { slug: 'jewellery', name: 'Jewellery' },
        { slug: 'electronics', name: 'Electronics' },
      ],
    });
  });

  it('returns 503 when the product source is down', async () => {
    await expectSourceUnavailable('/api/categories');
  });
});

// Men's clothing in the fixture: 1 (4.7), 2 (2.1), 3 (3.9), 4 (4.1), 5 (3.3).
describe('GET /api/categories/:slug', () => {
  it('returns the 3 highest rated, then the rest of the category in source order (H2, C1)', async () => {
    const res = await request(createTestApp()).get('/api/categories/mens-clothing');

    expect(res.status).toBe(200);
    expect(res.body.category).toEqual({ slug: 'mens-clothing', name: "Men's Clothing" });
    expect(ids(res.body.topRated)).toEqual(['1', '4', '3']);
    expect(ids(res.body.additional)).toEqual(['2', '5']);
  });

  it('puts the owner’s picks in this category first, ignoring picks from other categories (H2)', async () => {
    const app = createTestApp({ featuredIds: ['8', '5'] }); // 8 is jewellery

    const res = await request(app).get('/api/categories/mens-clothing');

    expect(ids(res.body.topRated)).toEqual(['5', '1', '4']);
    expect(ids(res.body.additional)).toEqual(['2', '3']);
  });

  it('shows every category product exactly once, and only that category', async () => {
    const res = await request(createTestApp()).get('/api/categories/electronics');

    const all = [...ids(res.body.topRated), ...ids(res.body.additional)];
    expect(all.sort()).toEqual(['10', '11']);
  });

  it('returns an empty additional list for a small category', async () => {
    const res = await request(createTestApp()).get('/api/categories/womens-clothing');

    expect(ids(res.body.topRated)).toEqual(['7', '6']);
    expect(res.body.additional).toEqual([]);
  });

  it('returns 404 for an unknown slug (C2)', async () => {
    const res = await request(createTestApp()).get('/api/categories/garden');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
  });

  it('does not accept the source’s raw category strings (C2)', async () => {
    const res = await request(createTestApp()).get(`/api/categories/${encodeURIComponent("men's clothing")}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category' } });
  });

  it('returns 400 for an over-long slug', async () => {
    const res = await request(createTestApp()).get(`/api/categories/${'a'.repeat(65)}`);

    expect(res.status).toBe(400);
  });

  it('returns 503 when the product source is down', async () => {
    await expectSourceUnavailable('/api/categories/mens-clothing');
  });
});
