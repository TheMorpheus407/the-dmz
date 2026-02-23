export const REDIS_KEYSPACE_VERSION = 'v1';

export const APP_PREFIX = 'dmz';

export const KEY_CATEGORIES = {
  RATE_LIMIT: 'rate-limit',
  SESSION: 'session',
  CACHE: 'cache',
  QUEUE: 'queue',
  STREAMS: 'streams',
} as const;

export type RedisKeyCategory = (typeof KEY_CATEGORIES)[keyof typeof KEY_CATEGORIES];

export const GLOBAL_KEY_ALLOWLIST = new Set<string>([
  `${KEY_CATEGORIES.CACHE}:health`,
  `${KEY_CATEGORIES.CACHE}:metrics`,
]);

export const DEFAULT_TTL_SECONDS: Record<RedisKeyCategory, number> = {
  [KEY_CATEGORIES.RATE_LIMIT]: 60,
  [KEY_CATEGORIES.SESSION]: 3600,
  [KEY_CATEGORIES.CACHE]: 300,
  [KEY_CATEGORIES.QUEUE]: 86400,
  [KEY_CATEGORIES.STREAMS]: 3600,
};

export interface TenantScopedKeyOptions {
  version?: string;
  ttlSeconds?: number;
}

export interface GlobalKeyOptions {
  version?: string;
  ttlSeconds?: number;
}

export const MAX_KEY_LENGTH = 512;

export const KEY_SEGMENT_SEPARATOR = ':';

export const isValidKeyCategory = (category: string): category is RedisKeyCategory =>
  Object.values(KEY_CATEGORIES).includes(category as RedisKeyCategory);

export const getDefaultTTL = (category: RedisKeyCategory): number =>
  DEFAULT_TTL_SECONDS[category] ?? 300;
