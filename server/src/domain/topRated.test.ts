import { describe, expect, it } from 'vitest';
import { fixtureProducts } from '../testing/inMemoryProductRepository.ts';
import { selectTopRated } from './topRated.ts';
import type { Product } from './types.ts';

const ids = (products: Product[]) => products.map((product) => product.id);

function product(id: string, rating?: { rate: number; count: number }): Product {
  return {
    id,
    title: `Product ${id}`,
    description: '',
    price: 1,
    imageUrl: `https://images.example.com/${id}.jpg`,
    category: { slug: 'misc', name: 'Misc' },
    ...(rating ? { rating } : {}),
  };
}

// Fixture ratings: 1=4.7, 8=4.6, 7=4.5, 4=4.1, 3=3.9, 6=3.8, 5=3.3, 10=3.3, 9=3.0, 11=2.9, 2=2.1
describe('selectTopRated', () => {
  it('shows the owner’s picks first, in configured order, even when rated lower (H1)', () => {
    const result = selectTopRated(fixtureProducts, ['2', '11', '9', '5', '6'], 5);

    expect(ids(result)).toEqual(['2', '11', '9', '5', '6']);
  });

  it('fills remaining places with the highest-rated other products (H2)', () => {
    const result = selectTopRated(fixtureProducts, ['2'], 5);

    expect(ids(result)).toEqual(['2', '1', '8', '7', '4']);
  });

  it('skips picks that are not in the pool, e.g. removed from the source or in another category', () => {
    const mensClothing = fixtureProducts.filter((p) => p.category.slug === 'mens-clothing');

    const result = selectTopRated(mensClothing, ['999', '8', '5'], 3);

    // 999 does not exist and 8 is jewellery; 5 is a pick, then 1 (4.7) and 4 (4.1).
    expect(ids(result)).toEqual(['5', '1', '4']);
  });

  it('never repeats a product, even if it is picked twice or is also top rated', () => {
    const result = selectTopRated(fixtureProducts, ['1', '1', '8'], 4);

    expect(ids(result)).toEqual(['1', '8', '7', '4']);
  });

  it('cuts the owner’s picks at the limit', () => {
    expect(ids(selectTopRated(fixtureProducts, ['2', '3', '4', '5'], 2))).toEqual(['2', '3']);
  });

  it('returns everything when the pool is smaller than the limit', () => {
    const pool = [product('a', { rate: 1, count: 1 }), product('b', { rate: 2, count: 1 })];

    expect(ids(selectTopRated(pool, [], 5))).toEqual(['b', 'a']);
  });

  it('breaks rating ties by review count, then keeps source order', () => {
    const pool = [
      product('a', { rate: 4, count: 10 }),
      product('b', { rate: 4, count: 50 }),
      product('c', { rate: 4, count: 10 }),
    ];

    expect(ids(selectTopRated(pool, [], 3))).toEqual(['b', 'a', 'c']);
  });

  it('ranks unrated products last', () => {
    const pool = [product('unrated'), product('low', { rate: 0.5, count: 1 })];

    expect(ids(selectTopRated(pool, [], 2))).toEqual(['low', 'unrated']);
  });

  it('returns nothing for an empty pool and does not reorder its input', () => {
    const pool = [product('a', { rate: 1, count: 1 }), product('b', { rate: 5, count: 1 })];

    expect(selectTopRated([], ['1'], 5)).toEqual([]);
    selectTopRated(pool, [], 2);
    expect(ids(pool)).toEqual(['a', 'b']);
  });
});
