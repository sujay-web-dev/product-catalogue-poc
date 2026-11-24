import type { Product } from './types.ts';

/** Max search term length (S3). */
export const MAX_QUERY_LENGTH = 100;

// A fixed pattern, never built from user input (S2).
const NON_WORD = /[^\p{L}\p{N}]+/u;

/** Lowercase words. "Men's T-Shirt" becomes ["men", "s", "t", "shirt"]. */
export function tokenize(text: string): string[] {
  return text.toLowerCase().split(NON_WORD).filter(Boolean);
}

/**
 * S2: case-insensitive; searches title, description and category name.
 * Every query word must match the start of a word in the product text, so
 * "men" matches "Mens Cotton Jacket" but not "Women's Clothing".
 * A query with no words matches nothing.
 */
export function matchesQuery(product: Product, query: string): boolean {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return false;

  const productWords = tokenize(
    `${product.title} ${product.description} ${product.category.name}`,
  );
  return queryWords.every((queryWord) =>
    productWords.some((word) => word.startsWith(queryWord)),
  );
}
