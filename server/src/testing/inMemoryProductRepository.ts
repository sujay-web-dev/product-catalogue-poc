import { uniqueCategories } from '../domain/categories.ts';
import { ProductSourceError } from '../domain/errors.ts';
import type { ProductRepository } from '../domain/ports.ts';
import type { Category, Product } from '../domain/types.ts';
import fixture from './products.json' with { type: 'json' };

/** The JSON fixture, typed. The assignment fails to compile if it drifts from Product. */
export const fixtureProducts: Product[] = fixture;

/** Test double for ProductRepository; never touches the network. */
export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Product[];

  constructor(products: Product[] = fixtureProducts) {
    this.products = products;
  }

  async listProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.find((product) => product.id === id);
  }

  async listCategories(): Promise<Category[]> {
    return uniqueCategories(this.products);
  }
}

/** A repository whose source is down, for testing upstream failures (G2). */
export class FailingProductRepository implements ProductRepository {
  private fail(): never {
    throw new ProductSourceError('Product source unavailable');
  }

  async listProducts(): Promise<Product[]> {
    return this.fail();
  }

  async getProduct(): Promise<Product | undefined> {
    return this.fail();
  }

  async listCategories(): Promise<Category[]> {
    return this.fail();
  }
}
