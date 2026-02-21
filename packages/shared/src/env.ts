import { z } from 'zod';

export const nodeEnvValues = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof nodeEnvValues)[number];

export const logLevelValues = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;
export type LogLevel = (typeof logLevelValues)[number];

export const coepPolicyValues = ['require-corp', 'credentialless'] as const;
export type CoepPolicy = (typeof coepPolicyValues)[number];

const booleanFromString = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}, z.boolean());

/**
 * Zod schema for backend (Fastify) environment variables.
 *
 * Validated at application construction time so the server fails fast
 * with actionable error messages when required variables are missing.
 */
export const backendEnvSchema = z
  .object({
    NODE_ENV: z.enum(nodeEnvValues).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    // Optional alias for PORT. When set, takes precedence over PORT in loadConfig().
    // Empty strings are treated as unset (mapped to undefined via preprocess).
    API_PORT: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.coerce
        .number()
        .int()
        .positive({ message: 'API_PORT must be a positive integer' })
        .optional(),
    ),
    API_HOST: z.string().min(1).default('0.0.0.0'),
    API_VERSION: z.string().min(1).default('0.0.0'),
    MAX_BODY_SIZE: z.coerce.number().int().positive().default(1_048_576),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    DATABASE_URL: z.string().min(1).default('postgres://localhost:5432/the_dmz'),
    DATABASE_POOL_MIN: z.coerce.number().int().positive().optional(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().optional(),
    DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().int().positive().optional(),
    DATABASE_POOL_CONNECT_TIMEOUT: z.coerce.number().int().positive().optional(),
    DATABASE_SSL: booleanFromString.optional(),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
    LOG_LEVEL: z.enum(logLevelValues).default('info'),
    JWT_SECRET: z.string().min(1).default('dev-secret-change-in-production'),
    JWT_EXPIRES_IN: z.string().min(1).default('7d'),
    TOKEN_HASH_SALT: z.string().min(1).default('token-hash-salt-change-in-production'),
    ENABLE_SWAGGER: booleanFromString.optional(),
    CORS_ORIGINS: z.string().min(1).default('http://localhost:5173'),
    CSP_FRAME_ANCESTORS: z.string().min(1).default('none'),
    CSP_CONNECT_SRC: z.string().optional().default(''),
    CSP_IMG_SRC: z.string().optional().default(''),
    COEP_POLICY: z.enum(coepPolicyValues).default('require-corp'),
    TENANT_HEADER_NAME: z.string().min(1).default('x-tenant-id'),
    TENANT_FALLBACK_ENABLED: booleanFromString.optional(),
    TENANT_FALLBACK_SLUG: z.string().min(1).default('default'),
    TENANT_RESOLVER_ENABLED: booleanFromString.optional(),
  })
  .transform((config) => {
    const isProd = config.NODE_ENV === 'production';
    const isDev = config.NODE_ENV === 'development';
    const isTest = config.NODE_ENV === 'test';

    return {
      ...config,
      DATABASE_POOL_MIN: config.DATABASE_POOL_MIN ?? (isProd ? 5 : 2),
      DATABASE_POOL_MAX: config.DATABASE_POOL_MAX ?? (isProd ? 25 : 10),
      DATABASE_POOL_IDLE_TIMEOUT: config.DATABASE_POOL_IDLE_TIMEOUT ?? 10,
      DATABASE_POOL_CONNECT_TIMEOUT: config.DATABASE_POOL_CONNECT_TIMEOUT ?? 30,
      DATABASE_SSL: config.DATABASE_SSL ?? isProd,
      ENABLE_SWAGGER: config.ENABLE_SWAGGER ?? config.NODE_ENV !== 'production',
      CORS_ORIGINS_LIST: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
      TENANT_FALLBACK_ENABLED: (config.TENANT_FALLBACK_ENABLED ?? isDev) || isTest,
      TENANT_RESOLVER_ENABLED: config.TENANT_RESOLVER_ENABLED ?? false,
    };
  })
  .refine(
    (config) => {
      if (config.NODE_ENV !== 'production') return true;
      return !config.JWT_SECRET.startsWith('dev-');
    },
    {
      message: 'JWT_SECRET must be changed from the default value in production',
      path: ['JWT_SECRET'],
    },
  )
  .refine(
    (config) => {
      if (config.NODE_ENV !== 'production') return true;
      return !config.TOKEN_HASH_SALT.startsWith('token-hash');
    },
    {
      message: 'TOKEN_HASH_SALT must be changed from the default value in production',
      path: ['TOKEN_HASH_SALT'],
    },
  );

export type BackendEnv = z.infer<typeof backendEnvSchema>;

/**
 * Zod schema for frontend (SvelteKit) environment variables.
 *
 * Validated when hooks.server.ts loads so the app fails fast with
 * actionable error messages if required variables are misconfigured.
 */
export const frontendEnvSchema = z.object({
  PUBLIC_API_BASE_URL: z.string().min(1).default('/api/v1'),
  PUBLIC_ENVIRONMENT: z.enum(nodeEnvValues).default('development'),
});

export type FrontendEnv = z.infer<typeof frontendEnvSchema>;

/**
 * Parse and validate backend environment variables.
 * Throws with developer-friendly error messages on failure.
 */
export function parseBackendEnv(env: Record<string, string | undefined>): BackendEnv {
  const result = backendEnvSchema.safeParse(env);

  if (!result.success) {
    const formatted = result.error.flatten();
    const details = JSON.stringify(formatted.fieldErrors, null, 2);
    throw new Error(
      `Invalid backend environment configuration:\n${details}\n\nCheck your .env file against .env.example.`,
    );
  }

  return result.data;
}

/**
 * Parse and validate frontend environment variables.
 * Throws with developer-friendly error messages on failure.
 */
export function parseFrontendEnv(env: Record<string, string | undefined>): FrontendEnv {
  const result = frontendEnvSchema.safeParse(env);

  if (!result.success) {
    const formatted = result.error.flatten();
    const details = JSON.stringify(formatted.fieldErrors, null, 2);
    throw new Error(
      `Invalid frontend environment configuration:\n${details}\n\nCheck your .env file against .env.example.`,
    );
  }

  return result.data;
}
