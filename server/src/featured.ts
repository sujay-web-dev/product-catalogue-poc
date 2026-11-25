import { z } from 'zod';
import raw from './featured.json' with { type: 'json' };

// H1: the owner's top-rated picks, as product IDs, in display order.
const featuredSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1),
});

/** Validates the featured config. Throws on a malformed file (fail fast at startup). */
export function parseFeatured(value: unknown): string[] {
  return featuredSchema.parse(value).productIds;
}

export function loadFeaturedIds(): string[] {
  return parseFeatured(raw);
}
