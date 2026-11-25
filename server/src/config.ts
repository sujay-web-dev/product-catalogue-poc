import { z } from 'zod';

// Every variable here is listed in .env.example.
const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FAKE_STORE_BASE_URL: z.url().default('https://fakestoreapi.com'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  EMAIL_FROM: z.email(),
  SALES_INBOX_EMAIL: z.email(),
});

export type Config = z.infer<typeof envSchema>;

/** Validates the environment once at startup and fails fast if it is wrong. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Name the bad variables only; never echo their values.
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(
      `Invalid environment configuration: ${names.join(', ')}. ` +
        'For local development, copy .env.example to .env in the repo root.',
    );
  }
  return result.data;
}
