import { describe, expect, it } from 'vitest';
import { loadFeaturedIds, parseFeatured } from './featured.ts';

describe('featured config (H1)', () => {
  it('loads the committed featured.json', () => {
    expect(loadFeaturedIds()).toHaveLength(5);
  });

  it('rejects a malformed file', () => {
    expect(() => parseFeatured({ productIds: [] })).toThrow();
    expect(() => parseFeatured({ productIds: [3] })).toThrow();
    expect(() => parseFeatured(['3'])).toThrow();
  });
});
