import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './http/errors.ts';

/**
 * Builds the Express app. Dependencies (repository, email sender) are added as
 * parameters when they exist, so tests can pass fakes; see src/index.ts.
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  // E7: small request size limit. An enquiry is a few short fields.
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
