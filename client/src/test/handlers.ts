import { http, HttpResponse } from 'msw';
import type { Product } from '../api';
import { beanie, belt, categories, jacket, ring, shorts } from './fixtures';
import { server } from './server';

/** The API's error shape, for failure tests. */
export function apiError(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

/** The header loads categories on every page. */
export function mockCategories(list = categories) {
  server.use(http.get('/api/categories', () => HttpResponse.json({ categories: list })));
}

export const featuredProducts: Product[] = [beanie, jacket, ring, belt, shorts];

/** The home page loads featured products. */
export function mockFeatured(products = featuredProducts) {
  server.use(http.get('/api/products/featured', () => HttpResponse.json({ products })));
}
