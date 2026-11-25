import { createApp, type AppDeps } from '../app.ts';
import { InMemoryProductRepository } from './inMemoryProductRepository.ts';

/** The real app wired with fakes; override any dependency per test. */
export function createTestApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    productRepository: new InMemoryProductRepository(),
    featuredIds: [],
    ...overrides,
  });
}
