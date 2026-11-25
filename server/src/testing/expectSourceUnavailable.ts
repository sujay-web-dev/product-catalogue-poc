import request from 'supertest';
import { expect, vi } from 'vitest';
import { FailingProductRepository } from './inMemoryProductRepository.ts';
import { createTestApp } from './testApp.ts';

/** G2: a source outage becomes a friendly 503 with no internal details. */
export async function expectSourceUnavailable(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const app = createTestApp({ productRepository: new FailingProductRepository() });

  const res = await request(app).get(path);

  expect(res.status).toBe(503);
  expect(res.body).toEqual({
    error: {
      code: 'PRODUCT_SOURCE_UNAVAILABLE',
      message: 'Products are temporarily unavailable. Please try again shortly.',
    },
  });
  warn.mockRestore();
}
