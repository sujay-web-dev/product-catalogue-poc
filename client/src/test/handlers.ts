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

export const allProducts: Product[] = [jacket, belt, beanie, shorts, ring];

/**
 * Search over the fixture titles. Deliberately simple: the real matching rule
 * (S2) is tested on the server; here we only need predictable results.
 * Returns the list of search terms received, to check what the page sent.
 */
export function mockSearch(products = allProducts) {
  const terms: string[] = [];
  server.use(
    http.get('/api/search', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q') ?? '';
      terms.push(q);
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const matches = products.filter((p) => words.every((w) => p.title.toLowerCase().includes(w)));
      return HttpResponse.json({ products: matches });
    }),
  );
  return terms;
}

/** Single products by ID; unknown IDs get the API's 404. */
export function mockProducts(products = allProducts) {
  server.use(
    http.get('/api/products/:id', ({ params }) => {
      // Leave /api/products/featured to mockFeatured, as the real API routes it first.
      // Returning nothing passes the request on to the next matching handler.
      if (params.id === 'featured') return undefined;
      const product = products.find((p) => p.id === params.id);
      return product ? HttpResponse.json({ product }) : apiError(404, 'NOT_FOUND', 'Product not found');
    }),
  );
}

/**
 * POST /api/enquiries. Answers with each response in turn (the last one repeats)
 * and returns the bodies received, to check exactly what the form sent.
 */
export function mockEnquiry(...responses: Array<() => Response>) {
  const bodies: unknown[] = [];
  const queue = responses.length > 0 ? responses : [() => HttpResponse.json({ status: 'sent' }, { status: 201 })];
  server.use(
    http.post('/api/enquiries', async ({ request }) => {
      bodies.push(await request.json());
      const respond = queue.length > 1 ? queue.shift() : queue[0];
      return respond ? respond() : HttpResponse.json({ status: 'sent' }, { status: 201 });
    }),
  );
  return bodies;
}

/** The home page loads featured products. */
export function mockFeatured(products = featuredProducts) {
  server.use(http.get('/api/products/featured', () => HttpResponse.json({ products })));
}
