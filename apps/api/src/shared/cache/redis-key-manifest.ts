export const REDIS_KEYSPACE_VERSION = 'v1';

export const APP_PREFIX = 'dmz';

export const KEY_CATEGORIES = {
  RATE_LIMIT: 'rate-limit',
  SESSION: 'session',
  CACHE: 'cache',
  QUEUE: 'queue',
  STREAMS: 'streams',
  AUTH_ABUSE: 'auth-abuse',
  ABAC_POLICY: 'abac-policy',
  EMAIL_POOL: 'email-pool',
  CONTENT: 'content',
  AUTH_POLICY: 'auth-policy',
  GAME_STATE: 'game-state',
  PRESENCE: 'presence',
  PARTY: 'party',
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
  [KEY_CATEGORIES.AUTH_ABUSE]: 3600,
  [KEY_CATEGORIES.ABAC_POLICY]: 30,
  [KEY_CATEGORIES.EMAIL_POOL]: 604800,
  [KEY_CATEGORIES.CONTENT]: 3600,
  [KEY_CATEGORIES.AUTH_POLICY]: 300,
  [KEY_CATEGORIES.GAME_STATE]: 1800,
  [KEY_CATEGORIES.PRESENCE]: 90,
  [KEY_CATEGORIES.PARTY]: 1800,
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
