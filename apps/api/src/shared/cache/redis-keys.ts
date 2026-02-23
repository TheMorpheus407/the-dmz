import {
  REDIS_KEYSPACE_VERSION,
  APP_PREFIX,
  GLOBAL_KEY_ALLOWLIST,
  type RedisKeyCategory,
  type TenantScopedKeyOptions,
  type GlobalKeyOptions,
  MAX_KEY_LENGTH,
  KEY_SEGMENT_SEPARATOR,
  isValidKeyCategory,
  getDefaultTTL,
} from './redis-key-manifest.js';

export class InvalidTenantIdError extends Error {
  constructor(message = 'Tenant ID is required for tenant-scoped keys') {
    super(message);
    this.name = 'InvalidTenantIdError';
  }
}

export class InvalidKeyCategoryError extends Error {
  constructor(category: string) {
    super(`Invalid key category: ${category}`);
    this.name = 'InvalidKeyCategoryError';
  }
}

export class GlobalKeyNotAllowedError extends Error {
  constructor(key: string) {
    super(`Global key not in allowlist: ${key}`);
    this.name = 'GlobalKeyNotAllowedError';
  }
}

export class KeyTooLongError extends Error {
  constructor(key: string) {
    super(`Redis key exceeds maximum length of ${MAX_KEY_LENGTH}: ${key}`);
    this.name = 'KeyTooLongError';
  }
}

const buildKeySegments = (
  category: RedisKeyCategory,
  resource: string,
  tenantId?: string,
  version = REDIS_KEYSPACE_VERSION,
): string[] => {
  const segments = [version, APP_PREFIX, category];

  if (tenantId) {
    segments.push(tenantId);
  }

  segments.push(resource);

  return segments;
};

const joinKey = (segments: string[]): string => {
  const key = segments.join(KEY_SEGMENT_SEPARATOR);

  if (key.length > MAX_KEY_LENGTH) {
    throw new KeyTooLongError(key);
  }

  return key;
};

export const validateTenantId = (tenantId: string | undefined): tenantId is string => {
  if (!tenantId || typeof tenantId !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
};

export const tenantScopedKey = (
  category: string,
  resource: string,
  tenantId: string,
  options?: TenantScopedKeyOptions,
): string => {
  if (!isValidKeyCategory(category)) {
    throw new InvalidKeyCategoryError(category);
  }

  if (!validateTenantId(tenantId)) {
    throw new InvalidTenantIdError('Tenant ID must be a valid UUID');
  }

  const version = options?.version ?? REDIS_KEYSPACE_VERSION;
  const segments = buildKeySegments(category, resource, tenantId, version);

  return joinKey(segments);
};

export const globalKey = (
  category: string,
  resource: string,
  options?: GlobalKeyOptions,
): string => {
  if (!isValidKeyCategory(category)) {
    throw new InvalidKeyCategoryError(category);
  }

  const fullKey = `${category}:${resource}`;

  if (!GLOBAL_KEY_ALLOWLIST.has(fullKey)) {
    throw new GlobalKeyNotAllowedError(fullKey);
  }

  const version = options?.version ?? REDIS_KEYSPACE_VERSION;
  const segments = buildKeySegments(category, resource, undefined, version);

  return joinKey(segments);
};

export interface ParsedKey {
  version: string;
  app: string;
  category: RedisKeyCategory;
  tenantId: string | undefined;
  resource: string;
  raw: string;
}

export const parseKey = (key: string): ParsedKey => {
  const segments = key.split(KEY_SEGMENT_SEPARATOR);

  if (segments.length < 4) {
    throw new Error(`Invalid key format: ${key}`);
  }

  const version = segments[0];
  const app = segments[1];
  const category = segments[2];
  const rest = segments.slice(3);

  if (!version || !app) {
    throw new Error(`Invalid key format: ${key}`);
  }

  if (app !== APP_PREFIX) {
    throw new Error(`Invalid app prefix: ${app}`);
  }

  if (!category || !isValidKeyCategory(category)) {
    throw new InvalidKeyCategoryError(category ?? 'unknown');
  }

  const categoryValue = category;
  const lastRestSegment = rest[rest.length - 1];
  const isTenantScoped =
    !lastRestSegment || !GLOBAL_KEY_ALLOWLIST.has(`${categoryValue}:${lastRestSegment}`);

  let tenantId: string | undefined;
  let resource: string;

  if (isTenantScoped && rest.length >= 2) {
    tenantId = rest[0];
    resource = rest.slice(1).join(KEY_SEGMENT_SEPARATOR);
  } else {
    resource = rest.length > 0 ? rest.join(KEY_SEGMENT_SEPARATOR) : 'unknown';
  }

  return {
    version,
    app,
    category: categoryValue,
    tenantId,
    resource,
    raw: key,
  };
};

export const validateTenantKey = (key: string, tenantId: string): boolean => {
  try {
    const parsed = parseKey(key);

    if (parsed.tenantId === undefined) {
      return false;
    }

    return parsed.tenantId === tenantId;
  } catch {
    return false;
  }
};

export const getTTL = (category: RedisKeyCategory, options?: TenantScopedKeyOptions): number => {
  if (options?.ttlSeconds !== undefined) {
    return options.ttlSeconds;
  }

  return getDefaultTTL(category);
};
