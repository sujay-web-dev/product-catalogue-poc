import express from 'express';
import helmet from 'helmet';
import type { ProductRepository } from './domain/ports.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { productRoutes } from './http/productRoutes.ts';
import { CatalogueService } from './services/catalogueService.ts';

export type AppDeps = {
  productRepository: ProductRepository;
  /** H1: the owner's top-rated picks. */
  featuredIds: readonly string[];
};

/**
 * Builds the Express app from injected dependencies. src/index.ts passes the
 * real adapters; tests pass fakes. Routes and services never pick an adapter.
 */
export function createApp(deps: AppDeps) {
  const catalogue = new CatalogueService(deps.productRepository, deps.featuredIds);
  const app = express();

  app.use(helmet());
  // E7: small request size limit. An enquiry is a few short fields.
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/products', productRoutes(catalogue));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
