import { http, HttpResponse } from 'msw';
import type { CategoryPage, Product } from '../api';
import { beanie, belt, categories, jacket, jewellery, mensClothing, ring, shorts } from './fixtures';
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

export const categoryPages: Record<string, CategoryPage> = {
  'mens-clothing': { category: mensClothing, topRated: [jacket, beanie, belt], additional: [shorts] },
  jewellery: { category: jewellery, topRated: [ring], additional: [] },
};

/** Category pages by slug; unknown slugs get the API's 404. */
export function mockCategoryPages(pages = categoryPages) {
  server.use(
    http.get('/api/categories/:slug', ({ params }) => {
      const page = pages[String(params.slug)];
      return page ? HttpResponse.json(page) : apiError(404, 'NOT_FOUND', 'Category not found');
    }),
  );
}

/** The home page loads featured products. */
export function mockFeatured(products = featuredProducts) {
  server.use(http.get('/api/products/featured', () => HttpResponse.json({ products })));
}
