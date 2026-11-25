import { http, HttpResponse } from 'msw';
import { categories } from './fixtures';
import { server } from './server';

/** The API's error shape, for failure tests. */
export function apiError(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

/** The header loads categories on every page. */
export function mockCategories(list = categories) {
  server.use(http.get('/api/categories', () => HttpResponse.json({ categories: list })));
}
