import type { Product } from './api';

// P1: the source has no currency, so prices are shown in AUD.
const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

export function formatPrice(price: number): string {
  return aud.format(price);
}

/** "4.7 out of 5 (500 reviews)", or undefined for an unrated product (G4). */
export function describeRating(rating: Product['rating']): string | undefined {
  if (!rating) return undefined;
  const reviews = rating.count === 1 ? '1 review' : `${rating.count} reviews`;
  return `${rating.rate.toFixed(1)} out of 5 (${reviews})`;
}
