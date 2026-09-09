import { z } from 'zod';

/**
 * The environment is validated once, at boot, and the process refuses to start
 * if it is wrong. A missing secret discovered at 3am under load is a much worse
 * error message than this one.
 *
 * Two settings are deliberately provider-agnostic while the client decides
 * (docs/01-PRD.md §9): EMAIL_PROVIDER and the hosting target. Nothing managed
 * is assumed anywhere in this file.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  API_PREFIX: z.string().default('api/v1'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  APP_TZ: z.string().default('Asia/Kolkata'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'use at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'use at least 16 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),

  /**
   * Docker-free development: leave REDIS_URL unset and the queue runs in
   * process. BullMQ takes over the moment a URL is present, with no code change.
   */
  REDIS_URL: z.string().optional(),
  QUEUE_DRIVER: z.enum(['memory', 'bullmq']).default('memory'),

  /** `local` writes to LOCAL_STORAGE_DIR; `s3` needs the S3_* block. */
  STORAGE_DRIVER: z.enum(['local', 's3', 'memory']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./var/files'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  /** PROVIDER NOT YET DECIDED — `console` writes .eml files you can open. */
  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  EMAIL_FROM: z.string().default('UCF Tracker <no-reply@example.gov>'),
  EMAIL_OUTBOX_DIR: z.string().default('./var/mail'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(['console', 'gupshup']).default('console'),
  GUPSHUP_API_KEY: z.string().optional(),
  GUPSHUP_SOURCE: z.string().optional(),
  GUPSHUP_APP_NAME: z.string().optional(),
  WEBHOOK_HMAC_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Environment is not valid:\n${lines.join('\n')}\n\nSee .env.example.`);
  }
  const env = parsed.data;

  // Cross-field checks the schema cannot express on its own.
  if (env.STORAGE_DRIVER === 's3' && !env.S3_BUCKET) {
    throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET (and the rest of the S3_ block).');
  }
  if (env.EMAIL_PROVIDER === 'smtp' && !env.SMTP_HOST) {
    throw new Error('EMAIL_PROVIDER=smtp requires SMTP_HOST.');
  }
  if (env.QUEUE_DRIVER === 'bullmq' && !env.REDIS_URL) {
    throw new Error('QUEUE_DRIVER=bullmq requires REDIS_URL.');
  }
  if (env.NODE_ENV === 'production') {
    if (env.EMAIL_PROVIDER === 'console') {
      throw new Error('EMAIL_PROVIDER=console is a development-only sink.');
    }
    if (env.QUEUE_DRIVER === 'memory') {
      throw new Error(
        'QUEUE_DRIVER=memory loses queued messages on restart. Use bullmq in production.',
      );
    }
  }
  return env;
}
