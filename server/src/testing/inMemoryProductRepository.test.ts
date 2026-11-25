import { describe, expect, it } from 'vitest';
import { fixtureProducts, InMemoryProductRepository } from './inMemoryProductRepository.ts';

// The fake is used by every API test, so check it behaves like a real repository.
describe('InMemoryProductRepository', () => {
  const repo = new InMemoryProductRepository();

  it('lists every fixture product', async () => {
    expect(await repo.listProducts()).toHaveLength(fixtureProducts.length);
  });

  it('finds a product by ID and returns undefined for an unknown ID', async () => {
    expect((await repo.getProduct('1'))?.title).toBe('Mens Cotton Jacket');
    expect(await repo.getProduct('999')).toBeUndefined();
  });

  it('lists each category once, in first-seen order', async () => {
    expect(await repo.listCategories()).toEqual([
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'womens-clothing', name: "Women's Clothing" },
      { slug: 'jewellery', name: 'Jewellery' },
      { slug: 'electronics', name: 'Electronics' },
    ]);
  });

  it('fixture IDs are unique', () => {
    const ids = fixtureProducts.map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
