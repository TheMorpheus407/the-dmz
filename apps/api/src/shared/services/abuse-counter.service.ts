import { m1AuthAbusePolicyManifest, AuthAbuseLevel } from '@the-dmz/shared/contracts';

import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';
import { tenantScopedKey, validateTenantId, KEY_CATEGORIES, getTTL } from '../cache/index.js';

import type { AppConfig } from '../../config.js';

export interface AbuseCounterResult {
  level: AuthAbuseLevel;
  failureCount: number;
  windowExpiresAt: Date;
  retryAfterSeconds?: number;
}

export interface AbuseCounterOptions {
  tenantId?: string;
  email?: string;
  ip?: string;
  category: 'login' | 'refresh' | 'register' | 'password_reset' | 'password_change';
}

const ABUSE_LEVEL_TO_THRESHOLD_INDEX: Record<AuthAbuseLevel, number> = {
  [AuthAbuseLevel.NORMAL]: -1,
  [AuthAbuseLevel.COOLDOWN]: 0,
  [AuthAbuseLevel.LOCKED]: 1,
  [AuthAbuseLevel.CHALLENGE_REQUIRED]: 2,
  [AuthAbuseLevel.IP_BLOCKED]: 3,
};

const getAbuseLevelFromFailureCount = (failureCount: number): AuthAbuseLevel => {
  const thresholds = m1AuthAbusePolicyManifest.thresholds;

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (failureCount >= thresholds[i]!.failures) {
      const level = Object.values(AuthAbuseLevel)[i + 1];
      if (level) {
        return level;
      }
    }
  }

  return AuthAbuseLevel.NORMAL;
};

const buildAbuseCounterKey = (
  tenantId: string | undefined,
  identifier: string,
  identifierType: 'email' | 'ip',
  category: string,
): string => {
  if (!tenantId || !validateTenantId(tenantId)) {
    return `${KEY_CATEGORIES.AUTH_ABUSE}:unauthenticated:${identifierType}:${identifier}:${category}`;
  }

  return tenantScopedKey(
    KEY_CATEGORIES.AUTH_ABUSE,
    `${identifierType}:${identifier}:${category}`,
    tenantId,
    { ttlSeconds: getTTL(KEY_CATEGORIES.AUTH_ABUSE) },
  );
};

export class AuthAbuseCounterService {
  private redis: RedisRateLimitClient | null;

  constructor(config: AppConfig) {
    this.redis = getRedisClient(config);
  }

  async incrementAndEvaluate(options: AbuseCounterOptions): Promise<AbuseCounterResult | null> {
    const { tenantId, email, ip, category } = options;

    if (!m1AuthAbusePolicyManifest.enabled) {
      return null;
    }

    const now = Date.now();
    const results: { key: string; count: number; ttl: number }[] = [];

    if (email && m1AuthAbusePolicyManifest.scope.email) {
      const emailKey = buildAbuseCounterKey(tenantId, email, 'email', category);
      const emailResult = await this.incrementKey(
        emailKey,
        m1AuthAbusePolicyManifest.thresholds[3]!.windowMs,
      );
      if (emailResult) {
        results.push({ key: emailKey, count: emailResult.current, ttl: emailResult.ttl });
      }
    }

    if (ip && m1AuthAbusePolicyManifest.scope.ip) {
      const ipKey = buildAbuseCounterKey(tenantId, ip, 'ip', category);
      const ipResult = await this.incrementKey(
        ipKey,
        m1AuthAbusePolicyManifest.thresholds[3]!.windowMs,
      );
      if (ipResult) {
        results.push({ key: ipKey, count: ipResult.current, ttl: ipResult.ttl });
      }
    }

    const maxCount = results.reduce((max, r) => Math.max(max, r.count), 0);
    const maxResult = results.find((r) => r.count === maxCount);

    if (!maxResult) {
      return {
        level: AuthAbuseLevel.NORMAL,
        failureCount: 0,
        windowExpiresAt: new Date(now),
      };
    }

    const level = getAbuseLevelFromFailureCount(maxCount);
    const thresholdIndex = ABUSE_LEVEL_TO_THRESHOLD_INDEX[level];
    const threshold = m1AuthAbusePolicyManifest.thresholds[thresholdIndex];

    if (!threshold) {
      return {
        level: AuthAbuseLevel.NORMAL,
        failureCount: maxCount,
        windowExpiresAt: new Date(now),
      };
    }

    const windowExpiresAt = new Date(now + threshold.windowMs);

    const result: AbuseCounterResult = {
      level,
      failureCount: maxCount,
      windowExpiresAt,
    };

    if (threshold.retryAfterSeconds) {
      result.retryAfterSeconds = threshold.retryAfterSeconds;
    }

    return result;
  }

  async checkAbuseLevel(options: AbuseCounterOptions): Promise<AbuseCounterResult | null> {
    const { tenantId, email, ip, category } = options;

    if (!m1AuthAbusePolicyManifest.enabled) {
      return null;
    }

    const results: { count: number; ttl: number }[] = [];

    if (email && m1AuthAbusePolicyManifest.scope.email) {
      const emailKey = buildAbuseCounterKey(tenantId, email, 'email', category);
      const count = await this.getCount(emailKey);
      if (count > 0) {
        results.push({ count, ttl: 0 });
      }
    }

    if (ip && m1AuthAbusePolicyManifest.scope.ip) {
      const ipKey = buildAbuseCounterKey(tenantId, ip, 'ip', category);
      const count = await this.getCount(ipKey);
      if (count > 0) {
        results.push({ count, ttl: 0 });
      }
    }

    const maxCount = results.reduce((max, r) => Math.max(max, r.count), 0);

    if (maxCount === 0) {
      return {
        level: AuthAbuseLevel.NORMAL,
        failureCount: 0,
        windowExpiresAt: new Date(),
      };
    }

    const level = getAbuseLevelFromFailureCount(maxCount);
    const thresholdIndex = ABUSE_LEVEL_TO_THRESHOLD_INDEX[level];
    const threshold = m1AuthAbusePolicyManifest.thresholds[thresholdIndex];

    if (!threshold) {
      return {
        level: AuthAbuseLevel.NORMAL,
        failureCount: maxCount,
        windowExpiresAt: new Date(),
      };
    }

    const result: AbuseCounterResult = {
      level,
      failureCount: maxCount,
      windowExpiresAt: new Date(Date.now() + threshold.windowMs),
    };

    if (threshold.retryAfterSeconds) {
      result.retryAfterSeconds = threshold.retryAfterSeconds;
    }

    return result;
  }

  async resetCounters(_options: AbuseCounterOptions): Promise<void> {
    // Counters expire naturally via TTL - no manual reset needed
    // On successful auth, the counter will be considered "reset" on next check
  }

  private async incrementKey(
    key: string,
    windowMs: number,
  ): Promise<{ current: number; ttl: number } | null> {
    if (!this.redis) {
      return null;
    }

    try {
      await this.redis.connect();
      const threshold3 = m1AuthAbusePolicyManifest.thresholds[3];
      const result = await this.redis.incrementRateLimitKey({
        key,
        timeWindowMs: windowMs,
        max: threshold3?.failures ?? 10,
        continueExceeding: true,
        exponentialBackoff: false,
      });

      return {
        current: result.current,
        ttl: result.ttl,
      };
    } catch {
      return null;
    }
  }

  private async getCount(key: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      await this.redis.connect();
      const result = await this.redis.incrementRateLimitKey({
        key,
        timeWindowMs: 0,
        max: 0,
        continueExceeding: false,
        exponentialBackoff: false,
      });

      return result.current;
    } catch {
      return 0;
    }
  }
}

let abuseCounterServiceInstance: AuthAbuseCounterService | null = null;

export const getAbuseCounterService = (config: AppConfig): AuthAbuseCounterService => {
  if (!abuseCounterServiceInstance) {
    abuseCounterServiceInstance = new AuthAbuseCounterService(config);
  }

  return abuseCounterServiceInstance;
};
