import type { Product } from './types.ts';

/** H2: product limits for each top-rated section. */
export const HOME_TOP_RATED_LIMIT = 5;
export const CATEGORY_TOP_RATED_LIMIT = 3;

/** Higher rating first, then more reviews. Unrated products go last. Stable for ties. */
function byRatingDesc(a: Product, b: Product): number {
  const rateDiff = (b.rating?.rate ?? -1) - (a.rating?.rate ?? -1);
  if (rateDiff !== 0) return rateDiff;
  return (b.rating?.count ?? 0) - (a.rating?.count ?? 0);
}

/**
 * H1/H2: one top-rated rule for home and category pages.
 * The owner's picks that are in the pool come first, in configured order;
 * then the highest-rated remaining products, up to the limit. Never repeats a product.
 */
export function selectTopRated(
  pool: readonly Product[],
  featuredIds: readonly string[],
  limit: number,
): Product[] {
  const byId = new Map(pool.map((product) => [product.id, product]));
  const picks: Product[] = [];
  for (const id of new Set(featuredIds)) {
    const product = byId.get(id);
    if (product) picks.push(product);
  }

  const pickedIds = new Set(picks.map((product) => product.id));
  const rest = pool.filter((product) => !pickedIds.has(product.id)).sort(byRatingDesc);

  return [...picks, ...rest].slice(0, limit);
}
