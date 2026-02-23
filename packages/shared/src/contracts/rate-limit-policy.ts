import { z } from 'zod';

export const RateLimitCategory = {
  AUTH: 'auth',
  PROTECTED_WRITE: 'protected-write',
  PROTECTED_READ: 'protected-read',
  PUBLIC_READ: 'public-read',
  INFRA_PROBE: 'infra-probe',
} as const;

export type RateLimitCategory = (typeof RateLimitCategory)[keyof typeof RateLimitCategory];

export const rateLimitCategorySchema = z.enum([
  RateLimitCategory.AUTH,
  RateLimitCategory.PROTECTED_WRITE,
  RateLimitCategory.PROTECTED_READ,
  RateLimitCategory.PUBLIC_READ,
  RateLimitCategory.INFRA_PROBE,
]);

export const bucketKeySchema = z.enum(['ip', 'tenant', 'user']);

export type BucketKey = z.infer<typeof bucketKeySchema>;

export const rateLimitPolicyEntrySchema = z.object({
  route: z.string().describe('Route path pattern (exact or prefix)'),
  method: z.string().optional().describe('HTTP method filter'),
  category: rateLimitCategorySchema,
  max: z.number().int().positive().describe('Maximum requests per window'),
  windowMs: z.number().int().positive().describe('Time window in milliseconds'),
  exempt: z.boolean().describe('Whether this route is exempt from rate limiting'),
  bucketKey: bucketKeySchema.describe('Key type for rate limit bucket isolation'),
  rationale: z.string().describe('Why this policy was chosen'),
});

export type RateLimitPolicyEntry = z.infer<typeof rateLimitPolicyEntrySchema>;

export const exemptRouteSchema = z.object({
  path: z.string().describe('Exempt route path'),
  rationale: z.string().describe('Why this route is exempt from rate limiting'),
});

export type ExemptRoute = z.infer<typeof exemptRouteSchema>;

export const rateLimitPolicyManifestSchema = z.object({
  version: z.string().describe('Policy version'),
  categories: z.record(
    rateLimitCategorySchema,
    z.object({
      description: z.string(),
      bucketKey: bucketKeySchema,
      defaultMax: z.number().int().positive(),
      defaultWindowMs: z.number().int().positive(),
    }),
  ),
  routes: z.array(rateLimitPolicyEntrySchema).describe('Rate limit policies for routes'),
  exemptRoutes: z.array(exemptRouteSchema).describe('Explicitly exempt routes'),
  headerContract: z.object({
    requiredHeaders: z.array(z.string()).describe('Required rate limit headers'),
    requiredOn429: z.array(z.string()).describe('Required headers on 429 responses'),
    optionalHeaders: z.array(z.string()).describe('Optional rate limit headers'),
  }),
  errorContract: z.object({
    errorCode: z.string().describe('Error code for rate limit exceeded'),
    requiredDetails: z.array(z.string()).describe('Required fields in error details'),
    requiredHeaders: z.array(z.string()).describe('Required response headers'),
  }),
});

export type RateLimitPolicyManifest = z.infer<typeof rateLimitPolicyManifestSchema>;

export type M1RateLimitPolicyManifest = RateLimitPolicyManifest;

const M1_RATE_LIMIT_CATEGORIES = {
  [RateLimitCategory.AUTH]: {
    description: 'Authentication endpoints (login, register, refresh)',
    bucketKey: 'ip' as BucketKey,
    defaultMax: 10,
    defaultWindowMs: 60_000,
  },
  [RateLimitCategory.PROTECTED_WRITE]: {
    description: 'Protected write operations (profile updates, admin writes)',
    bucketKey: 'tenant' as BucketKey,
    defaultMax: 50,
    defaultWindowMs: 60_000,
  },
  [RateLimitCategory.PROTECTED_READ]: {
    description: 'Protected read operations (user data, sessions)',
    bucketKey: 'tenant' as BucketKey,
    defaultMax: 100,
    defaultWindowMs: 60_000,
  },
  [RateLimitCategory.PUBLIC_READ]: {
    description: 'Public read-only endpoints',
    bucketKey: 'ip' as BucketKey,
    defaultMax: 200,
    defaultWindowMs: 60_000,
  },
  [RateLimitCategory.INFRA_PROBE]: {
    description: 'Infrastructure health and readiness probes',
    bucketKey: 'ip' as BucketKey,
    defaultMax: 1000,
    defaultWindowMs: 60_000,
  },
} as const;

export const m1RateLimitPolicyManifest: M1RateLimitPolicyManifest = {
  version: '1.0.0',
  categories: M1_RATE_LIMIT_CATEGORIES,
  routes: [
    {
      route: '/auth/register',
      method: 'POST',
      category: RateLimitCategory.AUTH,
      max: 5,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'ip',
      rationale: 'Stricter limit to prevent registration abuse',
    },
    {
      route: '/auth/login',
      method: 'POST',
      category: RateLimitCategory.AUTH,
      max: 10,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'ip',
      rationale: 'Moderate limit balancing UX vs abuse prevention',
    },
    {
      route: '/auth/refresh',
      method: 'POST',
      category: RateLimitCategory.AUTH,
      max: 20,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'ip',
      rationale: 'Higher limit for legitimate token refresh cycles',
    },
    {
      route: '/auth/logout',
      method: 'DELETE',
      category: RateLimitCategory.PROTECTED_WRITE,
      max: 30,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'Protected write operation',
    },
    {
      route: '/auth/me',
      method: 'GET',
      category: RateLimitCategory.PROTECTED_READ,
      max: 100,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'Standard protected read endpoint',
    },
    {
      route: '/auth/profile',
      method: 'PATCH',
      category: RateLimitCategory.PROTECTED_WRITE,
      max: 20,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'Protected write for profile updates',
    },
    {
      route: '/health/authenticated',
      method: 'GET',
      category: RateLimitCategory.PROTECTED_READ,
      max: 100,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'Protected health check endpoint',
    },
    {
      route: '/auth/admin/users',
      method: 'GET',
      category: RateLimitCategory.PROTECTED_READ,
      max: 50,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'Admin read operation with higher scrutiny',
    },
    {
      route: '/auth/mfa/status',
      method: 'GET',
      category: RateLimitCategory.PROTECTED_READ,
      max: 50,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'MFA status check endpoint',
    },
    {
      route: '/auth/mfa/webauthn/credentials',
      method: 'GET',
      category: RateLimitCategory.PROTECTED_READ,
      max: 30,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'WebAuthn credentials listing',
    },
    {
      route: '/game/session',
      method: 'POST',
      category: RateLimitCategory.PROTECTED_WRITE,
      max: 20,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'Game session creation',
    },
    {
      route: '/game/session',
      method: 'GET',
      category: RateLimitCategory.PROTECTED_READ,
      max: 50,
      windowMs: 60_000,
      exempt: false,
      bucketKey: 'tenant',
      rationale: 'Game session retrieval',
    },
  ],
  exemptRoutes: [
    {
      path: '/health',
      rationale: 'Kubernetes liveness probe - must never be throttled',
    },
    {
      path: '/ready',
      rationale: 'Kubernetes readiness probe - must never be throttled',
    },
    {
      path: '/docs',
      rationale: 'OpenAPI documentation - public read-only resource',
    },
    {
      path: '/api/v1/docs',
      rationale: 'OpenAPI documentation - public read-only resource',
    },
    {
      path: '/swagger',
      rationale: 'Swagger UI - public read-only resource',
    },
    {
      path: '/api/v1/swagger',
      rationale: 'Swagger UI - public read-only resource',
    },
  ],
  headerContract: {
    requiredHeaders: ['x-ratelimit-limit', 'x-ratelimit-remaining'],
    requiredOn429: [
      'retry-after',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ],
    optionalHeaders: ['x-ratelimit-reset'],
  },
  errorContract: {
    errorCode: 'RATE_LIMIT_EXCEEDED',
    requiredDetails: ['retryAfterSeconds'],
    requiredHeaders: ['retry-after'],
  },
} as const;

export type M1RateLimitPolicy = typeof m1RateLimitPolicyManifest;

export const REQUIRED_RATE_LIMIT_HEADERS = ['x-ratelimit-limit', 'x-ratelimit-remaining'] as const;

export const REQUIRED_429_HEADERS = [
  'retry-after',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
] as const;

export const OPTIONAL_RATE_LIMIT_HEADERS = ['x-ratelimit-reset'] as const;

export const RATE_LIMIT_EXCEEDED_ERROR_CODE = 'RATE_LIMIT_EXCEEDED';

export const REQUIRED_ERROR_DETAILS = ['retryAfterSeconds'] as const;
