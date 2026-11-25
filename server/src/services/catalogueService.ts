import type { ProductRepository } from '../domain/ports.ts';
import { HOME_TOP_RATED_LIMIT, selectTopRated } from '../domain/topRated.ts';
import type { Product } from '../domain/types.ts';

/** Read-only catalogue rules. Depends only on the ProductRepository interface. */
export class CatalogueService {
  private readonly products: ProductRepository;
  private readonly featuredIds: readonly string[];

  constructor(products: ProductRepository, featuredIds: readonly string[]) {
    this.products = products;
    this.featuredIds = featuredIds;
  }

  /** H1/H2: the owner's picks first, then the highest rated, 5 in total. */
  async getFeatured(): Promise<Product[]> {
    const all = await this.products.listProducts();
    return selectTopRated(all, this.featuredIds, HOME_TOP_RATED_LIMIT);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.getProduct(id);
  }
}
