import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { EnquiryService } from '../services/enquiryService.ts';
import { HttpError } from './errors.ts';
import { productIdSchema } from './productRoutes.ts';

// E2: name and email required; phone and message optional; every field has a limit.
// E3: only the product ID and contact details are accepted; anything else is dropped.
const enquirySchema = z.object({
  productId: productIdSchema,
  name: z.string().trim().min(1).max(100).regex(/^[^\p{Cc}]*$/u),
  email: z.string().trim().max(254).pipe(z.email()),
  phone: z.string().trim().max(30).regex(/^[0-9 +()-]*$/).optional(),
  message: z.string().trim().max(2000).optional(),
});

/** Names the invalid fields without echoing what was sent. */
function invalidFields(error: z.ZodError): string {
  const fields = [...new Set(error.issues.map((issue) => String(issue.path[0] ?? '')))].filter(Boolean);
  return fields.length > 0 ? `Please check: ${fields.join(', ')}` : 'Invalid enquiry';
}

/** E7: per-client limit on enquiries; the IP comes from nginx via `trust proxy`. */
function enquiryRateLimit() {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new HttpError(429, 'RATE_LIMITED', 'Too many enquiries. Please try again later.'));
    },
  });
}

export function enquiryRoutes(enquiries: EnquiryService): Router {
  const router = Router();

  router.post('/', enquiryRateLimit(), async (req, res) => {
    const parsed = enquirySchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', invalidFields(parsed.error));

    const result = await enquiries.submit(parsed.data);
    if (result === 'unknown-product') {
      throw new HttpError(422, 'UNKNOWN_PRODUCT', 'This product is no longer available'); // E3
    }
    // E5: success only after the email provider accepted the message.
    res.status(201).json({ status: 'sent' });
  });

  return router;
}
