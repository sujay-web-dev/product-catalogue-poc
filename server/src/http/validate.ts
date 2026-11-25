import type { z } from 'zod';
import { HttpError } from './errors.ts';

/**
 * Parses request input with zod. On failure throws a 400 with a fixed,
 * client-safe message; the rejected input is never echoed back.
 */
export function validate<T extends z.ZodType>(schema: T, value: unknown, message: string): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, 'VALIDATION_ERROR', message);
  return result.data;
}
