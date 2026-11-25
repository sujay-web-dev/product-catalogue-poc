// The only code that knows fakestoreapi.com, its field names and its category
// strings (C2). Everything above this file sees our own Product type.
import { z } from 'zod';
import { uniqueCategories } from '../../domain/categories.ts';
import { ProductSourceError } from '../../domain/errors.ts';
import type { ProductRepository } from '../../domain/ports.ts';
import type { Category, Product } from '../../domain/types.ts';
import { mapCategory } from './mapCategory.ts';

// Fake Store's product shape, checked against the live API on 24 Nov.
// `rating` is optional: the API returns it, but its OpenAPI spec doesn't document it.
const fakeStoreProductSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string().min(1),
  image: z.url(),
  rating: z.object({ rate: z.number(), count: z.number().int() }).optional(),
});

type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;

function toProduct(source: FakeStoreProduct): Product {
  return {
    id: String(source.id),
    title: source.title,
    description: source.description,
    price: source.price,
    imageUrl: source.image, // P2
    category: mapCategory(source.category),
    ...(source.rating ? { rating: source.rating } : {}),
  };
}

export type FakeStoreOptions = {
  baseUrl: string;
  /** G2: give up on a slow source after this long. */
  timeoutMs?: number;
  /** S1: how long the catalogue is cached. */
  cacheTtlMs?: number;
  /** After a failed refresh, keep serving the old catalogue this long before retrying. */
  retryAfterMs?: number;
  fetchFn?: typeof fetch;
  now?: () => number;
};

/**
 * S1/G2: loads the whole catalogue with one documented call (GET /products) and
 * caches it. Categories and single products come from that list, so we don't rely
 * on GET /products/:id, which answers an unknown ID with 200 and an empty body.
 */
export class FakeStoreProductRepository implements ProductRepository {
  private readonly productsUrl: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly retryAfterMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;

  private cache: { products: Product[]; expiresAt: number } | undefined;
  private inFlight: Promise<Product[]> | undefined;

  constructor(options: FakeStoreOptions) {
    this.productsUrl = `${options.baseUrl.replace(/\/+$/, '')}/products`;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60_000;
    this.retryAfterMs = options.retryAfterMs ?? 30_000;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async listProducts(): Promise<Product[]> {
    if (this.cache && this.now() < this.cache.expiresAt) return this.cache.products;

    // Concurrent requests share one fetch instead of each calling Fake Store.
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return (await this.listProducts()).find((product) => product.id === id);
  }

  async listCategories(): Promise<Category[]> {
    return uniqueCategories(await this.listProducts());
  }

  private async refresh(): Promise<Product[]> {
    try {
      const products = await this.fetchProducts();
      this.cache = { products, expiresAt: this.now() + this.cacheTtlMs };
      return products;
    } catch (err) {
      // G2: if we have an older catalogue, serving it beats an error page.
      if (this.cache) {
        console.warn(`Fake Store refresh failed; serving cached catalogue: ${String(err)}`);
        this.cache.expiresAt = this.now() + this.retryAfterMs;
        return this.cache.products;
      }
      throw err;
    }
  }

  private async fetchProducts(): Promise<Product[]> {
    let response: Response;
    try {
      response = await this.fetchFn(this.productsUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      throw new ProductSourceError('Fake Store request failed or timed out', { cause });
    }
    if (!response.ok) {
      throw new ProductSourceError(`Fake Store responded with HTTP ${response.status}`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw new ProductSourceError('Fake Store returned a body that is not JSON', { cause });
    }
    if (!Array.isArray(body)) {
      throw new ProductSourceError('Fake Store returned something other than a product list');
    }

    // One malformed product shouldn't take the whole catalogue down; skip it and say so.
    const products: Product[] = [];
    for (const item of body) {
      const parsed = fakeStoreProductSchema.safeParse(item);
      if (parsed.success) products.push(toProduct(parsed.data));
    }
    const skipped = body.length - products.length;
    if (skipped > 0) console.warn(`Fake Store: skipped ${skipped} malformed product(s)`);
    return products;
  }
}
