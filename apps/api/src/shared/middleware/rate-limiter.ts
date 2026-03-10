import { createHash } from 'crypto';

import rateLimit, {
  type FastifyRateLimitStoreCtor,
  type RateLimitOptions,
  type RateLimitPluginOptions,
  type errorResponseBuilderContext,
} from '@fastify/rate-limit';

import type { EffectiveQuotaPolicy } from '@the-dmz/shared/contracts';

import { closeRedisClient, getRedisClient, type RedisRateLimitClient } from '../database/redis.js';
import { tenantScopedKey, KEY_CATEGORIES } from '../cache/index.js';

import { AppError, ErrorCodes } from './error-handler.js';

import type { AppConfig } from '../../config.js';
import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    effectiveQuotaPolicy?: EffectiveQuotaPolicy;
  }
}

const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const REDIS_RETRY_COOLDOWN_MS = 5_000;
const MAX_SAFE_TTL = Number.MAX_SAFE_INTEGER;
const MAX_MEMORY_BUCKETS = 5_000;
const RATE_LIMIT_NAMESPACE = 'dmz-rate-limit-';
const RATE_LIMIT_EXEMPT_PATHS = new Set(['/health', '/ready']);

type IncrementResult = {
  current: number;
  ttl: number;
};

type IncrementCallback = (error: Error | null, result?: IncrementResult) => void;

type MemoryBucket = {
  current: number;
  ttl: number;
  iterationStartMs: number;
};

type StoreOptions = {
  continueExceeding?: boolean;
  exponentialBackoff?: boolean;
  groupId?: string;
};

type StoreState = {
  readonly logger: FastifyBaseLogger;
  readonly redis: RedisRateLimitClient | null;
  readonly memoryBuckets: Map<string, MemoryBucket>;
  readonly strictMode: boolean;
  redisAvailable: boolean;
  redisRetryAtMs: number;
  redisFallbackWarningLogged: boolean;
};

export type RateLimitStoreState = StoreState;

const extractTenantIdFromRequest = (request: FastifyRequest): string | undefined => {
  if (request.tenantContext?.tenantId) {
    return request.tenantContext.tenantId;
  }

  if (request.user?.tenantId) {
    return request.user.tenantId;
  }

  if (request.oauthClient?.tenantId) {
    return request.oauthClient.tenantId;
  }

  if (request.preAuthTenantContext?.tenantId) {
    return request.preAuthTenantContext.tenantId;
  }

  const headerTenantId = request.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string') {
    return headerTenantId;
  }

  return undefined;
};

const normalizePositiveInteger = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.trunc(numeric);
};

const calculateRetryAfterSeconds = (context: errorResponseBuilderContext): number =>
  Math.max(0, Math.ceil(context.ttl / 1000));

const buildRateLimitKeyPrefix = (groupId?: string): string =>
  groupId ? `${RATE_LIMIT_NAMESPACE}${groupId}-` : RATE_LIMIT_NAMESPACE;

const getHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' && first.length > 0 ? first : undefined;
  }

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const hashCredentialIdentifier = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 32);

const extractApiKeyId = (credential: string): string | undefined => {
  const separatorIndex = credential.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= credential.length - 1) {
    return undefined;
  }

  return credential.slice(0, separatorIndex);
};

const extractBearerCredential = (request: FastifyRequest): string | undefined => {
  const authorizationHeader = getHeaderValue(request.headers.authorization);
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, credential, ...rest] = authorizationHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !credential || rest.length > 0) {
    return undefined;
  }

  return credential;
};

export const extractCredentialIdentifier = (request: FastifyRequest): string => {
  if (request.apiKeyAuth?.keyId) {
    return `key:${request.apiKeyAuth.keyId}`;
  }

  if (request.oauthClient?.clientId) {
    return `oauth:${request.oauthClient.clientId}`;
  }

  if (request.user?.userId) {
    return `user:${request.user.userId}`;
  }

  const bearerCredential = extractBearerCredential(request);
  const authorizationApiKeyId = bearerCredential ? extractApiKeyId(bearerCredential) : undefined;
  if (authorizationApiKeyId) {
    return `key:${authorizationApiKeyId}`;
  }

  const apiKeyHeader = getHeaderValue(request.headers['x-api-key']);
  if (apiKeyHeader) {
    const apiKeyId = extractApiKeyId(apiKeyHeader);
    if (apiKeyId) {
      return `key:${apiKeyId}`;
    }

    return `key-hash:${hashCredentialIdentifier(apiKeyHeader)}`;
  }

  return `ip:${request.ip}`;
};

const extractGroupIdFromRoute = (request: FastifyRequest): string | undefined => {
  const routeOptions = request.routeOptions as
    | { config?: { rateLimit?: { groupId?: string } } }
    | undefined;
  const rateLimitConfig = routeOptions?.config?.rateLimit;

  if (typeof rateLimitConfig === 'object' && rateLimitConfig?.groupId) {
    return rateLimitConfig.groupId;
  }

  return undefined;
};

const toStoreOptions = (value: unknown): StoreOptions => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const candidate = value as {
    continueExceeding?: unknown;
    exponentialBackoff?: unknown;
    groupId?: unknown;
  };

  const options: StoreOptions = {};

  if (typeof candidate.continueExceeding === 'boolean') {
    options.continueExceeding = candidate.continueExceeding;
  }

  if (typeof candidate.exponentialBackoff === 'boolean') {
    options.exponentialBackoff = candidate.exponentialBackoff;
  }

  if (typeof candidate.groupId === 'string' && candidate.groupId.length > 0) {
    options.groupId = candidate.groupId;
  }

  return options;
};

const pruneMemoryBuckets = (buckets: Map<string, MemoryBucket>, nowInMs: number): void => {
  for (const [key, bucket] of buckets) {
    if (bucket.iterationStartMs + bucket.ttl <= nowInMs) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_MEMORY_BUCKETS) {
    return;
  }

  const candidates = [...buckets.entries()].sort(
    ([, left], [, right]) => left.iterationStartMs - right.iterationStartMs,
  );

  const removeCount = buckets.size - MAX_MEMORY_BUCKETS;
  for (let index = 0; index < removeCount; index += 1) {
    const key = candidates[index]?.[0];
    if (key) {
      buckets.delete(key);
    }
  }
};

const incrementWithRedis = async (
  redis: RedisRateLimitClient,
  key: string,
  timeWindow: number,
  max: number,
  continueExceeding: boolean,
  exponentialBackoff: boolean,
): Promise<IncrementResult> => {
  await redis.connect();

  return redis.incrementRateLimitKey({
    key,
    timeWindowMs: timeWindow,
    max,
    continueExceeding,
    exponentialBackoff,
  });
};

const incrementWithMemory = (
  buckets: Map<string, MemoryBucket>,
  key: string,
  timeWindow: number,
  max: number,
  continueExceeding: boolean,
  exponentialBackoff: boolean,
): IncrementResult => {
  const nowInMs = Date.now();

  if (!buckets.has(key) && buckets.size >= MAX_MEMORY_BUCKETS) {
    pruneMemoryBuckets(buckets, nowInMs);
  }

  const existing = buckets.get(key);

  if (!existing || existing.iterationStartMs + timeWindow <= nowInMs) {
    const bucket: MemoryBucket = {
      current: 1,
      ttl: timeWindow,
      iterationStartMs: nowInMs,
    };

    buckets.set(key, bucket);

    return {
      current: bucket.current,
      ttl: bucket.ttl,
    };
  }

  let ttl = timeWindow - (nowInMs - existing.iterationStartMs);
  const current = existing.current + 1;
  let iterationStartMs = existing.iterationStartMs;

  if (continueExceeding && current > max) {
    ttl = timeWindow;
    iterationStartMs = nowInMs;
  } else if (exponentialBackoff && current > max) {
    const backoffExponent = current - max - 1;
    const backoffWindow = timeWindow * 2 ** backoffExponent;
    ttl = Number.isSafeInteger(backoffWindow) ? backoffWindow : MAX_SAFE_TTL;
    iterationStartMs = nowInMs;
  }

  const bucket: MemoryBucket = {
    current,
    ttl,
    iterationStartMs,
  };

  buckets.set(key, bucket);

  return {
    current: bucket.current,
    ttl: bucket.ttl,
  };
};

const logRedisFallback = (state: StoreState, error: unknown): void => {
  if (state.redisFallbackWarningLogged) {
    return;
  }

  state.redisFallbackWarningLogged = true;
  state.logger.warn({ err: error }, 'Redis unavailable, using in-memory rate limit store');
};

const shouldAttemptRedis = (state: StoreState): boolean => {
  if (!state.redis) {
    return false;
  }

  if (state.redisAvailable) {
    return true;
  }

  return Date.now() >= state.redisRetryAtMs;
};

const markRedisUnavailable = (state: StoreState, error: unknown): void => {
  state.redisAvailable = false;
  state.redisRetryAtMs = Date.now() + REDIS_RETRY_COOLDOWN_MS;
  logRedisFallback(state, error);
};

const markRedisAvailable = (state: StoreState): void => {
  state.redisAvailable = true;
  state.redisRetryAtMs = 0;
  state.redisFallbackWarningLogged = false;
  lastRedisUnavailableErrorMs = 0;
};

export const createRateLimitStore = (state: StoreState): FastifyRateLimitStoreCtor =>
  class RateLimitStore {
    private readonly continueExceeding: boolean;
    private readonly exponentialBackoff: boolean;
    private readonly keyPrefix: string;

    public constructor(options: StoreOptions = {}) {
      this.continueExceeding = options.continueExceeding ?? false;
      this.exponentialBackoff = options.exponentialBackoff ?? false;
      this.keyPrefix = buildRateLimitKeyPrefix(options.groupId);
    }

    public incr(key: string, callback: IncrementCallback, timeWindow = 0, max = 0): void {
      const windowMs = normalizePositiveInteger(timeWindow, DEFAULT_RATE_LIMIT_WINDOW_MS);
      const maxRequests = normalizePositiveInteger(max, DEFAULT_RATE_LIMIT_MAX);
      const namespacedKey = `${this.keyPrefix}${key}`;

      void (async () => {
        if (shouldAttemptRedis(state) && state.redis) {
          try {
            const result = await incrementWithRedis(
              state.redis,
              namespacedKey,
              windowMs,
              maxRequests,
              this.continueExceeding,
              this.exponentialBackoff,
            );

            markRedisAvailable(state);

            return result;
          } catch (error) {
            markRedisUnavailable(state, error);

            if (state.strictMode) {
              state.logger.error(
                { err: error },
                'Redis unavailable in strict mode - rejecting request',
              );
              lastRedisUnavailableErrorMs = Date.now();
              throw new Error(RATE_LIMIT_REDIS_UNAVAILABLE_ERROR);
            }
          }
        }

        if (state.strictMode && state.redis && !state.redisAvailable) {
          lastRedisUnavailableErrorMs = Date.now();
          throw new Error(RATE_LIMIT_REDIS_UNAVAILABLE_ERROR);
        }

        return incrementWithMemory(
          state.memoryBuckets,
          namespacedKey,
          windowMs,
          maxRequests,
          this.continueExceeding,
          this.exponentialBackoff,
        );
      })()
        .then((result) => {
          callback(null, result);
        })
        .catch((error: unknown) => {
          callback(error instanceof Error ? error : new Error('Rate limit store failure'));
        });
    }

    public child(routeOptions: unknown): RateLimitStore {
      return new RateLimitStore(toStoreOptions(routeOptions));
    }
  };

const RATE_LIMIT_REDIS_UNAVAILABLE_ERROR = 'RATE_LIMIT_REDIS_UNAVAILABLE';

let lastRedisUnavailableErrorMs = 0;

const rateLimitErrorResponse = (
  _request: FastifyRequest,
  context: errorResponseBuilderContext,
): AppError => {
  const now = Date.now();
  const isRedisUnavailable = now - lastRedisUnavailableErrorMs < REDIS_RETRY_COOLDOWN_MS * 2;

  if (isRedisUnavailable) {
    return new AppError({
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message: 'Rate limiting service temporarily unavailable. Retry later.',
      statusCode: 503,
      details: {
        retryAfterSeconds: Math.ceil(REDIS_RETRY_COOLDOWN_MS / 1000),
      },
    });
  }

  return new AppError({
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    message: 'Rate limit exceeded. Retry later.',
    statusCode: context.statusCode,
    details: {
      retryAfterSeconds: calculateRetryAfterSeconds(context),
    },
  });
};

const setRateLimitResetAsEpochSeconds = (app: FastifyInstance): void => {
  app.addHook('onSend', async (_request, reply, payload) => {
    const resetHeader = reply.getHeader('x-ratelimit-reset');

    if (typeof resetHeader === 'number' || typeof resetHeader === 'string') {
      const ttlSeconds = Number(resetHeader);
      if (Number.isFinite(ttlSeconds) && ttlSeconds >= 0) {
        const resetEpochSeconds = Math.floor(Date.now() / 1000) + Math.trunc(ttlSeconds);
        reply.header('x-ratelimit-reset', resetEpochSeconds);
      }
    }

    if (!reply.getHeader('x-ratelimit-store')) {
      const storeType = rateLimiterState?.redisAvailable ? 'redis' : 'memory';
      reply.header('x-ratelimit-store', storeType);
    }

    return payload;
  });
};

let rateLimiterState: StoreState | null = null;

const generateHourlyQuotaKey = (request: FastifyRequest): string => {
  const groupId = extractGroupIdFromRoute(request);
  const tenantId = extractTenantIdFromRequest(request);
  const key = extractCredentialIdentifier(request);

  if (!tenantId) {
    const prefix = buildRateLimitKeyPrefix(groupId);
    return `${KEY_CATEGORIES.RATE_LIMIT}:${prefix}${key}:unauthenticated`;
  }

  const prefix = buildRateLimitKeyPrefix(groupId);
  return tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, `${prefix}${key}`, tenantId);
};

const setQuotaHeaders = (app: FastifyInstance): void => {
  app.addHook('onSend', async (request, reply, payload) => {
    const effectivePolicy = request.effectiveQuotaPolicy;
    if (!effectivePolicy) {
      return payload;
    }

    const remaining = reply.getHeader('x-ratelimit-remaining');
    const remainingNum = Number(remaining);
    const remainingValue = Number.isNaN(remainingNum) ? 0 : remainingNum;

    const hourlyKey = generateHourlyQuotaKey(request);
    let hourlyRemaining = effectivePolicy.requestsPerHour;

    if (rateLimiterState?.redis) {
      try {
        const result = await rateLimiterState.redis.incrementHourlyQuotaKey(
          hourlyKey,
          effectivePolicy.requestsPerHour,
        );
        hourlyRemaining = result.remaining;
      } catch {
        hourlyRemaining = effectivePolicy.requestsPerHour;
      }
    } else if (rateLimiterState?.memoryBuckets.size) {
      const existing = rateLimiterState.memoryBuckets.get(hourlyKey);
      if (existing) {
        hourlyRemaining = Math.max(0, effectivePolicy.requestsPerHour - existing.current);
      }
    }

    reply.header('x-quota-limit-minute', effectivePolicy.requestsPerMinute);
    reply.header('x-quota-remaining-minute', remainingValue);
    reply.header('x-quota-limit-hour', effectivePolicy.requestsPerHour);
    reply.header('x-quota-remaining-hour', hourlyRemaining);

    return payload;
  });
};

const extractPathname = (request: FastifyRequest): string => {
  const source = request.raw.url ?? request.url;
  const trimmed = source.split('?')[0];

  return trimmed || '/';
};

const isRateLimitExemptPath = (request: FastifyRequest): boolean =>
  RATE_LIMIT_EXEMPT_PATHS.has(extractPathname(request));

const buildRateLimitPluginOptions = (
  config: AppConfig,
  logger: FastifyBaseLogger,
): RateLimitPluginOptions => {
  const redis = getRedisClient(config);
  const strictMode = config.RATE_LIMIT_STRICT_MODE ?? false;
  const state: StoreState = {
    logger,
    redis,
    memoryBuckets: new Map<string, MemoryBucket>(),
    strictMode,
    redisAvailable: redis !== null,
    redisRetryAtMs: 0,
    redisFallbackWarningLogged: false,
  };

  rateLimiterState = state;

  if (!redis && config.NODE_ENV !== 'test') {
    logger.warn('Redis unavailable, using in-memory rate limit store');
  } else if (strictMode && redis) {
    logger.info(
      'Rate limiter strict mode enabled - requests will be rejected when Redis is unavailable',
    );
  }

  const rateLimitKeyGenerator = (request: FastifyRequest): string => {
    const groupId = extractGroupIdFromRoute(request);
    const tenantId = extractTenantIdFromRequest(request);
    const key = extractCredentialIdentifier(request);

    if (!tenantId) {
      const prefix = buildRateLimitKeyPrefix(groupId);
      return `${KEY_CATEGORIES.RATE_LIMIT}:${prefix}${key}:unauthenticated`;
    }

    const prefix = buildRateLimitKeyPrefix(groupId);
    return tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, `${prefix}${key}`, tenantId);
  };

  const rateLimitMaxGenerator = (request: FastifyRequest): number => {
    const effectivePolicy = request.effectiveQuotaPolicy;
    if (effectivePolicy) {
      return Math.min(effectivePolicy.requestsPerMinute, config.RATE_LIMIT_MAX);
    }
    return config.RATE_LIMIT_MAX;
  };

  const rateLimitTimeWindowGenerator = (request: FastifyRequest): number => {
    const effectivePolicy = request.effectiveQuotaPolicy;
    if (effectivePolicy) {
      return config.RATE_LIMIT_WINDOW_MS;
    }
    return config.RATE_LIMIT_WINDOW_MS;
  };

  return {
    global: true,
    hook: 'onRequest',
    keyGenerator: rateLimitKeyGenerator,
    max: rateLimitMaxGenerator,
    timeWindow: rateLimitTimeWindowGenerator,
    allowList: (request) => isRateLimitExemptPath(request),
    store: createRateLimitStore(state),
    errorResponseBuilder: rateLimitErrorResponse,
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  };
};

let rateLimiterHelperCounter = 0;

const nextRateLimiterHelperScopeId = (): string => {
  rateLimiterHelperCounter += 1;
  return `route-scope-${rateLimiterHelperCounter}`;
};

const createRouteScopedRateLimitOptions = (options?: RateLimitOptions): RateLimitOptions => {
  const scopeId = options?.groupId ?? nextRateLimiterHelperScopeId();

  if (!options) {
    return { groupId: scopeId };
  }

  return {
    ...options,
    groupId: options.groupId ?? scopeId,
  };
};

const createGlobalRateLimitOptions = (options?: RateLimitOptions): RateLimitOptions =>
  options ?? {};

const createDeferredRateLimiter = (
  options: RateLimitOptions | undefined,
  scope: 'route' | 'global',
): preHandlerAsyncHookHandler => {
  const rateLimitOptions =
    scope === 'route'
      ? createRouteScopedRateLimitOptions(options)
      : createGlobalRateLimitOptions(options);
  let limiter: ReturnType<FastifyInstance['rateLimit']> | null = null;

  return async function deferredRateLimiter(this: FastifyInstance, request, reply) {
    if (!limiter) {
      limiter = request.server.rateLimit(rateLimitOptions);
    }

    await limiter.call(this, request, reply);
  };
};

/**
 * Route-level helper for custom limits.
 *
 * Example:
 * `config: { rateLimit: false }, preHandler: [rateLimiter({ max: 10, timeWindow: '1 minute' })]`
 */
export const rateLimiter = (options?: RateLimitOptions): preHandlerAsyncHookHandler =>
  createDeferredRateLimiter(options, 'route');

export const globalRateLimiter = (options?: RateLimitOptions): preHandlerAsyncHookHandler =>
  createDeferredRateLimiter(options, 'global');

export const registerRateLimiter = (app: FastifyInstance, config: AppConfig): void => {
  const options = buildRateLimitPluginOptions(config, app.log);

  app.register(rateLimit, options);
  setRateLimitResetAsEpochSeconds(app);
  setQuotaHeaders(app);

  app.addHook('onClose', async () => {
    await closeRedisClient();
  });
};
