import type { ProductRepository } from '../domain/ports.ts';
import { CATEGORY_TOP_RATED_LIMIT, HOME_TOP_RATED_LIMIT, selectTopRated } from '../domain/topRated.ts';
import type { Category, Product } from '../domain/types.ts';

export type CategoryPage = {
  category: Category;
  topRated: Product[];
  additional: Product[];
};

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

  async listCategories(): Promise<Category[]> {
    return this.products.listCategories();
  }

  /** Undefined when no category has this slug (C2). */
  async getCategoryPage(slug: string): Promise<CategoryPage | undefined> {
    const category = (await this.products.listCategories()).find((c) => c.slug === slug);
    if (!category) return undefined;

    const pool = (await this.products.listProducts()).filter((p) => p.category.slug === slug);
    // H2: same rule as the home page, 3 per category.
    const topRated = selectTopRated(pool, this.featuredIds, CATEGORY_TOP_RATED_LIMIT);
    // C1: every other product in the category, in source order, no pagination.
    const topIds = new Set(topRated.map((p) => p.id));
    const additional = pool.filter((p) => !topIds.has(p.id));

    return { category, topRated, additional };
  }
}
