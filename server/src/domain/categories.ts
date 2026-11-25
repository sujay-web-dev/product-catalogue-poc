import type { Category, Product } from './types.ts';

/** Each category once, in the order it first appears among the products. */
export function uniqueCategories(products: readonly Product[]): Category[] {
  const bySlug = new Map<string, Category>();
  for (const { category } of products) {
    if (!bySlug.has(category.slug)) bySlug.set(category.slug, category);
  }
  return [...bySlug.values()];
}
