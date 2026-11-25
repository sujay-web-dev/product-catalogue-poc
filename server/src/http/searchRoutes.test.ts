import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { expectSourceUnavailable } from '../testing/expectSourceUnavailable.ts';
import { createTestApp } from '../testing/testApp.ts';

type ProductBody = { id: string };
const ids = (products: ProductBody[]) => products.map((product) => product.id);

const search = (q: string) => request(createTestApp()).get('/api/search').query({ q });

describe('GET /api/search', () => {
  it('returns only matching products, in source order (S1)', async () => {
    const res = await search('jacket');

    expect(res.status).toBe(200);
    expect(ids(res.body.products)).toEqual(['1', '6']);
  });

  it('excludes products that do not match every word (S2)', async () => {
    expect(ids((await search('men jacket')).body.products)).toEqual(['1']);
    expect(ids((await search('men')).body.products)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('ignores case and surrounding spaces', async () => {
    expect(ids((await search('  WATERPROOF  ')).body.products)).toEqual(['6']);
  });

  it('returns an empty list, not an error, when nothing matches', async () => {
    const res = await search('submarine');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [] });
  });

  it('treats regex characters as plain text', async () => {
    const res = await search('(.*[');

    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
  });

  it('accepts a term of exactly 100 characters', async () => {
    expect((await search('a'.repeat(100))).status).toBe(200);
  });

  describe('rejects with 400 (S3)', () => {
    const expected = {
      error: { code: 'VALIDATION_ERROR', message: 'Enter a search term of 1 to 100 characters' },
    };

    it.each([
      ['an empty term', ''],
      ['a whitespace-only term', '   '],
      ['a term over 100 characters', 'a'.repeat(101)],
    ])('%s', async (_name, q) => {
      const res = await search(q);

      expect(res.status).toBe(400);
      expect(res.body).toEqual(expected);
    });

    it('a missing term', async () => {
      const res = await request(createTestApp()).get('/api/search');

      expect(res.status).toBe(400);
      expect(res.body).toEqual(expected);
    });

    it('a repeated term (?q=a&q=b)', async () => {
      const res = await request(createTestApp()).get('/api/search?q=men&q=jacket');

      expect(res.status).toBe(400);
    });
  });

  it('returns 503 when the product source is down', async () => {
    await expectSourceUnavailable('/api/search?q=jacket');
  });
});
