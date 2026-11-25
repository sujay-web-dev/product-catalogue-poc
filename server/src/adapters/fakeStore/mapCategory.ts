import type { Category } from '../../domain/types.ts';

// C2: source category strings that need more than the general rule below.
const OVERRIDES: Record<string, Category> = {
  // Fake Store's spelling; we show the Australian spelling to match AUD prices (P1).
  jewelery: { slug: 'jewellery', name: 'Jewellery' },
};

/**
 * C2: turns a Fake Store category string into our own { slug, name }.
 * "men's clothing" becomes { slug: "mens-clothing", name: "Men's Clothing" }.
 */
export function mapCategory(source: string): Category {
  const key = source.trim().toLowerCase();
  const override = OVERRIDES[key];
  if (override) return override;

  const slug = key
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const name = key.replace(/(^|\s)(\S)/g, (_match, space: string, letter: string) => space + letter.toUpperCase());
  return { slug, name };
}
