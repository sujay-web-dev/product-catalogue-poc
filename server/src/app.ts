import express from 'express';
import helmet from 'helmet';
import type { EmailAddresses } from './domain/enquiry.ts';
import type { EmailSender, ProductRepository } from './domain/ports.ts';
import { categoryRoutes } from './http/categoryRoutes.ts';
import { enquiryRoutes } from './http/enquiryRoutes.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { productRoutes } from './http/productRoutes.ts';
import { requestLogger } from './http/requestLogger.ts';
import { searchRoutes } from './http/searchRoutes.ts';
import { CatalogueService } from './services/catalogueService.ts';
import { EnquiryService } from './services/enquiryService.ts';

export type AppDeps = {
  productRepository: ProductRepository;
  emailSender: EmailSender;
  emailAddresses: EmailAddresses;
  /** H1: the owner's top-rated picks. */
  featuredIds: readonly string[];
  /** One log line per request. Off in tests to keep their output readable. */
  logRequests?: boolean;
};

/**
 * Builds the Express app from injected dependencies. src/index.ts passes the
 * real adapters; tests pass fakes. Routes and services never pick an adapter.
 */
export function createApp(deps: AppDeps) {
  const catalogue = new CatalogueService(deps.productRepository, deps.featuredIds);
  const enquiries = new EnquiryService(deps.productRepository, deps.emailSender, deps.emailAddresses);
  const app = express();

  // E7: one proxy (nginx in Docker, Vite in dev) sits in front of the API, so the
  // client IP for rate limiting comes from its X-Forwarded-For header.
  app.set('trust proxy', 1);
  if (deps.logRequests) app.use(requestLogger);
  app.use(helmet());
  // E7: small request size limit. An enquiry is a few short fields.
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/products', productRoutes(catalogue));
  app.use('/api/categories', categoryRoutes(catalogue));
  app.use('/api/search', searchRoutes(catalogue));
  app.use('/api/enquiries', enquiryRoutes(enquiries));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
