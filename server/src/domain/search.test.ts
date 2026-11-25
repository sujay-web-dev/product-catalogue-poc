import { describe, expect, it } from 'vitest';
import { fixtureProducts } from '../testing/inMemoryProductRepository.ts';
import { matchesQuery, tokenize } from './search.ts';

/** IDs of fixture products matching the query. */
const search = (query: string) =>
  fixtureProducts.filter((product) => matchesQuery(product, query)).map((product) => product.id);

describe('tokenize', () => {
  it('lowercases and splits on anything that is not a letter or digit', () => {
    expect(tokenize("  Men's  T-Shirt, 2TB! ")).toEqual(['men', 's', 't', 'shirt', '2tb']);
  });
});

describe('matchesQuery (S2)', () => {
  it('matches the start of a title word, ignoring case and surrounding spaces', () => {
    expect(search('  JACK ')).toEqual(['1', '6']);
  });

  it('searches the description and the category name', () => {
    expect(search('waterproof')).toEqual(['6']);
    expect(search('electronics')).toEqual(['10', '11']);
  });

  it('requires every word to match', () => {
    expect(search('jacket men')).toEqual(['1']);
    expect(search('jacket electronics')).toEqual([]);
  });

  it('"men" matches men’s products but not "Women\'s"', () => {
    const results = search('men');

    expect(results).toEqual(['1', '2', '3', '4', '5']);
    expect(results).not.toContain('6');
    expect(results).not.toContain('7');
  });

  it('only matches the start of a word, not the middle', () => {
    expect(search('acket')).toEqual([]);
  });

  it('matches hyphenated and apostrophe words the same way the product text is split', () => {
    expect(search('t-shirt')).toEqual(['2']);
    expect(search("women's top")).toEqual(['7']);
  });

  it('treats regex characters as plain text', () => {
    expect(() => search('(.*[')).not.toThrow();
    expect(search('.*')).toEqual([]);
  });

  it('matches nothing for an empty or punctuation-only query', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
    expect(search('!!!')).toEqual([]);
  });
});
