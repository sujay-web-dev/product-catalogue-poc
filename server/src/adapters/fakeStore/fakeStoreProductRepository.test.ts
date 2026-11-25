import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductSourceError } from '../../domain/errors.ts';
import { FakeStoreProductRepository, type FakeStoreOptions } from './fakeStoreProductRepository.ts';

// Shaped like the live API's response (checked 24 Nov).
const backpack = {
  id: 1,
  title: 'Fjallraven - Foldsack No. 1 Backpack',
  price: 109.95,
  description: 'Your perfect pack for everyday use.',
  category: "men's clothing",
  image: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png',
  rating: { rate: 3.9, count: 120 },
};
const ring = {
  id: 7,
  title: 'White Gold Plated Princess',
  price: 9.99,
  description: 'Classic created wedding engagement ring.',
  category: 'jewelery',
  image: 'https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_.jpg',
  rating: { rate: 3, count: 400 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function setup(responses: Array<Response | Error>, options: Partial<FakeStoreOptions> = {}) {
  const fetchFn = vi.fn<typeof fetch>(async () => {
    const next = responses.shift();
    if (!next) throw new Error('No more stubbed responses');
    if (next instanceof Error) throw next;
    return next;
  });
  let time = 0;
  const clock = { advance: (ms: number) => (time += ms) };
  const repo = new FakeStoreProductRepository({
    baseUrl: 'https://store.test/',
    fetchFn,
    now: () => time,
    cacheTtlMs: 1_000,
    retryAfterMs: 100,
    ...options,
  });
  return { repo, fetchFn, clock };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FakeStoreProductRepository', () => {
  it('calls GET /products once and maps products into our model', async () => {
    const { repo, fetchFn } = setup([json([backpack, ring])]);

    const products = await repo.listProducts();

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://store.test/products');
    expect(products[0]).toEqual({
      id: '1',
      title: 'Fjallraven - Foldsack No. 1 Backpack',
      description: 'Your perfect pack for everyday use.',
      price: 109.95,
      imageUrl: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png',
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      rating: { rate: 3.9, count: 120 },
    });
    // Source field names don't leak through.
    expect(products[0]).not.toHaveProperty('image');
  });

  it('accepts a product without a rating (not in the OpenAPI spec)', async () => {
    const { rating: _rating, ...unrated } = backpack;
    const { repo } = setup([json([unrated])]);

    const [product] = await repo.listProducts();

    expect(product).toBeDefined();
    expect(product).not.toHaveProperty('rating');
  });

  it('skips malformed products and keeps the rest', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { repo } = setup([json([backpack, { id: 'x', title: 42 }, ring])]);

    expect((await repo.listProducts()).map((p) => p.id)).toEqual(['1', '7']);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('skipped 1'));
  });

  it('finds a product by ID from the catalogue, and returns undefined for an unknown ID', async () => {
    const { repo, fetchFn } = setup([json([backpack, ring])]);

    expect((await repo.getProduct('7'))?.title).toBe('White Gold Plated Princess');
    expect(await repo.getProduct('999')).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('lists our categories, not the source strings (C2)', async () => {
    const { repo } = setup([json([backpack, ring])]);

    expect(await repo.listCategories()).toEqual([
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'jewellery', name: 'Jewellery' },
    ]);
  });

  describe('caching (S1)', () => {
    it('serves the cached catalogue until it expires, then refetches', async () => {
      const { repo, fetchFn, clock } = setup([json([backpack]), json([backpack, ring])]);

      await repo.listProducts();
      clock.advance(999);
      expect(await repo.listProducts()).toHaveLength(1);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      clock.advance(1);
      expect(await repo.listProducts()).toHaveLength(2);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('shares one request between concurrent callers', async () => {
      const { repo, fetchFn } = setup([json([backpack])]);

      await Promise.all([repo.listProducts(), repo.getProduct('1'), repo.listCategories()]);

      expect(fetchFn).toHaveBeenCalledOnce();
    });
  });

  describe('when Fake Store fails (G2)', () => {
    it.each([
      ['HTTP 500', () => json({ error: 'boom' }, 500)],
      ['a body that is not JSON', () => new Response('<html>oops</html>', { status: 200 })],
      ['an empty body', () => new Response('', { status: 200 })],
      ['JSON that is not a list', () => json({ products: [] })],
      ['a network error', () => new TypeError('fetch failed')],
    ])('throws ProductSourceError on %s', async (_name, makeResponse) => {
      const { repo } = setup([makeResponse()]);

      await expect(repo.listProducts()).rejects.toBeInstanceOf(ProductSourceError);
    });

    it('gives up after the timeout', async () => {
      const hangingFetch: typeof fetch = (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        });
      const repo = new FakeStoreProductRepository({
        baseUrl: 'https://store.test',
        fetchFn: hangingFetch,
        timeoutMs: 20,
      });

      await expect(repo.listProducts()).rejects.toBeInstanceOf(ProductSourceError);
    });

    it('keeps serving the old catalogue if a refresh fails, and retries later', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { repo, fetchFn, clock } = setup([
        json([backpack]),
        new TypeError('fetch failed'),
        json([backpack, ring]),
      ]);

      await repo.listProducts();
      clock.advance(1_000);
      expect(await repo.listProducts()).toHaveLength(1); // refresh failed: stale copy

      clock.advance(50);
      await repo.listProducts();
      expect(fetchFn).toHaveBeenCalledTimes(2); // waits retryAfterMs before trying again

      clock.advance(50);
      expect(await repo.listProducts()).toHaveLength(2);
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('can try again after a failure with no cache', async () => {
      const { repo } = setup([new TypeError('fetch failed'), json([backpack])]);

      await expect(repo.listProducts()).rejects.toBeInstanceOf(ProductSourceError);
      expect(await repo.listProducts()).toHaveLength(1);
    });
  });
});
