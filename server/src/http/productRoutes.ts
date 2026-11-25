import { Router } from 'express';
import { z } from 'zod';
import type { CatalogueService } from '../services/catalogueService.ts';
import { HttpError } from './errors.ts';
import { validate } from './validate.ts';

// Our IDs are strings (see domain/types.ts); this keeps junk out of lookups and logs.
const productIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export function productRoutes(catalogue: CatalogueService): Router {
  const router = Router();

  // Registered before /:id so "featured" isn't treated as an ID.
  router.get('/featured', async (_req, res) => {
    res.json({ products: await catalogue.getFeatured() });
  });

  router.get('/:id', async (req, res) => {
    const id = validate(productIdSchema, req.params.id, 'Invalid product ID');
    const product = await catalogue.getProduct(id);
    if (!product) throw new HttpError(404, 'NOT_FOUND', 'Product not found'); // P1
    res.json({ product });
  });

  return router;
}
