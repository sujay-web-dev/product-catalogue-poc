import { Router } from 'express';
import { z } from 'zod';
import { MAX_QUERY_LENGTH } from '../domain/search.ts';
import type { CatalogueService } from '../services/catalogueService.ts';
import { validate } from './validate.ts';

// S3: an empty term doesn't search; long terms are rejected. A repeated ?q= is an
// array, not a string, so it fails here too.
const querySchema = z.object({
  q: z.string().trim().min(1).max(MAX_QUERY_LENGTH),
});

export function searchRoutes(catalogue: CatalogueService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { q } = validate(
      querySchema,
      req.query,
      `Enter a search term of 1 to ${MAX_QUERY_LENGTH} characters`,
    );
    res.json({ products: await catalogue.search(q) });
  });

  return router;
}
