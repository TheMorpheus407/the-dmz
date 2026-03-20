import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';
import type {
  PartyStatus,
  Difficulty,
  PartyRole,
  DeclaredRole,
} from '../../db/schema/multiplayer/index.js';

export interface CachedPartyMember {
  partyMemberId: string;
  playerId: string;
  role: PartyRole;
  readyStatus: boolean;
  declaredRole: DeclaredRole | null;
}

export interface CachedParty {
  partyId: string;
  tenantId: string;
  leaderId: string;
  status: PartyStatus;
  difficulty: Difficulty;
  members: CachedPartyMember[];
  inviteCodeExpiresAt: number | null;
  updatedAt: number;
}

export interface PartyCacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletions: number;
  errors: number;
  totalLatencyMs: number;
}

const PARTY_CACHE_TTL = 1800;

const PARTY_CACHE_METRICS: PartyCacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletions: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getPartyCacheMetrics = (): Readonly<PartyCacheMetrics> =>
  Object.freeze({ ...PARTY_CACHE_METRICS });

export const resetPartyCacheMetrics = (): void => {
  PARTY_CACHE_METRICS.hits = 0;
  PARTY_CACHE_METRICS.misses = 0;
  PARTY_CACHE_METRICS.sets = 0;
  PARTY_CACHE_METRICS.deletions = 0;
  PARTY_CACHE_METRICS.errors = 0;
  PARTY_CACHE_METRICS.totalLatencyMs = 0;
};

export const buildPartyCacheKey = (tenantId: string, partyId: string): string => {
  return tenantScopedKey(KEY_CATEGORIES.PARTY, `party:${partyId}`, tenantId, {
    ttlSeconds: PARTY_CACHE_TTL,
  });
};

export const getCachedParty = async (
  config: AppConfig,
  tenantId: string,
  partyId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedParty | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    PARTY_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildPartyCacheKey(tenantId, partyId);

    if (!validateTenantKey(key, tenantId)) {
      PARTY_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedParty;
      const latency = performance.now() - startTime;
      PARTY_CACHE_METRICS.hits++;
      PARTY_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    PARTY_CACHE_METRICS.misses++;
    return null;
  } catch {
    PARTY_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedParty = async (
  config: AppConfig,
  tenantId: string,
  partyId: string,
  party: CachedParty,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildPartyCacheKey(tenantId, partyId);

    if (!validateTenantKey(key, tenantId)) {
      PARTY_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedParty = {
      partyId: party.partyId,
      tenantId: party.tenantId,
      leaderId: party.leaderId,
      status: party.status,
      difficulty: party.difficulty,
      members: party.members,
      inviteCodeExpiresAt: party.inviteCodeExpiresAt,
      updatedAt: party.updatedAt,
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(cachedData), PARTY_CACHE_TTL);
    PARTY_CACHE_METRICS.sets++;
  } catch {
    PARTY_CACHE_METRICS.errors++;
  }
};

export const deleteCachedParty = async (
  config: AppConfig,
  tenantId: string,
  partyId: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();
    const key = buildPartyCacheKey(tenantId, partyId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      PARTY_CACHE_METRICS.deletions++;
    }
  } catch {
    PARTY_CACHE_METRICS.errors++;
  }
};

export const isPartyCacheHealthy = async (config: AppConfig): Promise<boolean> => {
  const client = getRedisClient(config);
  if (!client) {
    return false;
  }

  try {
    await client.connect();
    await client.ping();
    return true;
  } catch {
    return false;
  }
};
