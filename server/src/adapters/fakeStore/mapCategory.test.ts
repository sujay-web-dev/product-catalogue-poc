import { describe, expect, it } from 'vitest';
import { mapCategory } from './mapCategory.ts';

describe('mapCategory (C2)', () => {
  it.each([
    ["men's clothing", { slug: 'mens-clothing', name: "Men's Clothing" }],
    ["women's clothing", { slug: 'womens-clothing', name: "Women's Clothing" }],
    ['electronics', { slug: 'electronics', name: 'Electronics' }],
    ['jewelery', { slug: 'jewellery', name: 'Jewellery' }],
    ['  Home & Garden ', { slug: 'home-garden', name: 'Home & Garden' }],
  ])('maps %j', (source, expected) => {
    expect(mapCategory(source)).toEqual(expected);
  });
});
