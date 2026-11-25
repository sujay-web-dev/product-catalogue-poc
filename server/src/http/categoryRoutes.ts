import { Router } from 'express';
import { z } from 'zod';
import type { CatalogueService } from '../services/catalogueService.ts';
import { HttpError } from './errors.ts';
import { validate } from './validate.ts';

// C2: our slugs are lowercase words joined by hyphens, e.g. "mens-clothing".
const slugSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);

export function categoryRoutes(catalogue: CatalogueService): Router {
  const router = Router();

  // C3: the header's category links.
  router.get('/', async (_req, res) => {
    res.json({ categories: await catalogue.listCategories() });
  });

  router.get('/:slug', async (req, res) => {
    const slug = validate(slugSchema, req.params.slug, 'Invalid category');
    const page = await catalogue.getCategoryPage(slug);
    if (!page) throw new HttpError(404, 'NOT_FOUND', 'Category not found');
    res.json(page);
  });

  return router;
}
