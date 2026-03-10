import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EmailPoolService } from '../email-pool.service.js';

import type { RedisRateLimitClient } from '../../../../shared/database/redis.js';
import type { AppConfig } from '../../../../config.js';

const createMockRedisClient = (): RedisRateLimitClient => {
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {};

  const createMockFn = (defaultValue?: unknown) => {
    const fn = vi.fn();
    if (defaultValue !== undefined) {
      fn.mockResolvedValue(defaultValue);
    }
    mocks[fn.name] = fn;
    return fn;
  };

  return {
    status: 'ready',
    connect: createMockFn(),
    ping: createMockFn('PONG'),
    incrementRateLimitKey: createMockFn(),
    incrementHourlyQuotaKey: createMockFn(),
    getValue: createMockFn(null),
    setValue: createMockFn(undefined),
    deleteKey: createMockFn(undefined),
    getKeys: createMockFn([]),
    lpush: createMockFn(1),
    rpop: createMockFn(null),
    lrange: createMockFn([]),
    llen: createMockFn(0),
    zadd: createMockFn(1),
    zpopmax: createMockFn(null),
    zrange: createMockFn([]),
    zscore: createMockFn(null),
    zcard: createMockFn(0),
    zrem: createMockFn(0),
    quit: createMockFn(undefined),
    disconnect: createMockFn(),
  };
};

describe('EmailPoolService', () => {
  let service: EmailPoolService;
  let mockRedis: RedisRateLimitClient;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    const config = {} as AppConfig;
    service = new EmailPoolService(config);
    mockRedis = createMockRedisClient();

    vi.spyOn(
      service as unknown as { getRedis: () => Promise<RedisRateLimitClient> },
      'getRedis',
    ).mockResolvedValue(mockRedis);
  });

  describe('addEmail', () => {
    it('should add an email to the pool', async () => {
      await service.addEmail(tenantId, {
        emailId: 'email-001',
        templateId: 'template-001',
        difficulty: 1,
        quality: 0.9,
        intent: 'legitimate',
        attackType: 'phishing',
        faction: 'sovereign-compact',
      });

      expect(mockRedis.lpush).toHaveBeenCalled();
      expect(mockRedis.zadd).toHaveBeenCalled();
    });
  });

  describe('popEmail', () => {
    it('should return null when pool is empty', async () => {
      const result = await service.popEmail(tenantId);

      expect(result).toBeNull();
    });

    it('should pop email from specified difficulty tier', async () => {
      const mockEmail = {
        emailId: 'email-001',
        templateId: 'template-001',
        difficulty: 1,
        quality: 0.9,
        intent: 'legitimate' as const,
        createdAt: new Date().toISOString(),
      };

      mockRedis.llen = vi.fn().mockResolvedValue(1);
      mockRedis.zpopmax = vi.fn().mockResolvedValue({
        member: 'email-001',
        score: 0.9,
      });
      mockRedis.rpop = vi.fn().mockResolvedValue(JSON.stringify(mockEmail));
      mockRedis.zrem = vi.fn().mockResolvedValue(1);
      mockRedis.setValue = vi.fn().mockResolvedValue(undefined);

      const result = await service.popEmail(tenantId, 1);

      expect(result).not.toBeNull();
      expect(result?.email.emailId).toBe('email-001');
      expect(result?.selectionMethod).toBe('weighted');
    });

    it('should return null when specified tier is empty', async () => {
      mockRedis.llen = vi.fn().mockResolvedValue(0);

      const result = await service.popEmail(tenantId, 1);

      expect(result).toBeNull();
    });

    it('should try all tiers when no difficulty specified', async () => {
      const mockEmail = {
        emailId: 'email-002',
        templateId: 'template-002',
        difficulty: 2,
        quality: 0.8,
        intent: 'malicious' as const,
        createdAt: new Date().toISOString(),
      };

      let callCount = 0;
      mockRedis.llen = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve(0);
        }
        return Promise.resolve(1);
      });

      mockRedis.zpopmax = vi.fn().mockResolvedValue({
        member: 'email-002',
        score: 0.8,
      });
      mockRedis.rpop = vi.fn().mockResolvedValue(JSON.stringify(mockEmail));
      mockRedis.zrem = vi.fn().mockResolvedValue(1);
      mockRedis.setValue = vi.fn().mockResolvedValue(undefined);

      const result = await service.popEmail(tenantId);

      expect(result).not.toBeNull();
      expect(result?.email.difficulty).toBe(2);
    });
  });

  describe('getPoolHealth', () => {
    it('should return health for all difficulty tiers', async () => {
      mockRedis.llen = vi.fn().mockResolvedValue(30);

      const health = await service.getPoolHealth(tenantId);

      expect(health).toHaveLength(5);

      for (const tierHealth of health) {
        expect(tierHealth.currentCount).toBe(30);
        expect(tierHealth.targetSize).toBe(40);
        // 30 > 8 (low watermark), so isLow should be false
        expect(tierHealth.isLow).toBe(false);
        // 30 <= 32 (high watermark), so needsRefill should be false
        expect(tierHealth.needsRefill).toBe(false);
      }
    });

    it('should mark pool as low when below watermark', async () => {
      mockRedis.llen = vi.fn().mockResolvedValue(5);

      const health = await service.getPoolHealth(tenantId);

      const firstTier = health[0];
      expect(firstTier).toBeDefined();
      expect(firstTier!.isLow).toBe(true);
      expect(firstTier!.needsRefill).toBe(true);
    });

    it('should mark pool as not low when above watermark', async () => {
      mockRedis.llen = vi.fn().mockResolvedValue(35);

      const health = await service.getPoolHealth(tenantId);

      const firstTier = health[0];
      expect(firstTier).toBeDefined();
      expect(firstTier!.isLow).toBe(false);
      expect(firstTier!.needsRefill).toBe(false);
    });
  });

  describe('getPoolMetrics', () => {
    it('should return total pool size and tier metrics', async () => {
      mockRedis.llen = vi.fn().mockResolvedValue(10);

      const metrics = await service.getPoolMetrics(tenantId);

      expect(metrics.totalPoolSize).toBe(50);
      expect(metrics.tierMetrics).toHaveLength(5);
    });
  });

  describe('checkLowWatermark', () => {
    it('should return low watermark status for each tier', async () => {
      mockRedis.llen = vi.fn().mockImplementation((key: string) => {
        if (key.includes('difficulty:1')) {
          return Promise.resolve(5);
        }
        return Promise.resolve(40);
      });

      const lowWatermarks = await service.checkLowWatermark(tenantId);

      expect(lowWatermarks.get(1)).toBe(true);
      expect(lowWatermarks.get(2)).toBe(false);
    });
  });

  describe('clearPool', () => {
    it('should delete all pool keys', async () => {
      mockRedis.deleteKey = vi.fn().mockResolvedValue(1);

      await service.clearPool(tenantId);

      expect(mockRedis.deleteKey).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit event when email is selected', async () => {
      const eventHandler = vi.fn();
      service.subscribe(eventHandler);

      const mockEmail = {
        emailId: 'email-001',
        templateId: 'template-001',
        difficulty: 1,
        quality: 0.9,
        intent: 'legitimate' as const,
        createdAt: new Date().toISOString(),
      };

      mockRedis.llen = vi.fn().mockResolvedValue(1);
      mockRedis.zpopmax = vi.fn().mockResolvedValue({
        member: 'email-001',
        score: 0.9,
      });
      mockRedis.rpop = vi.fn().mockResolvedValue(JSON.stringify(mockEmail));
      mockRedis.zrem = vi.fn().mockResolvedValue(1);
      mockRedis.setValue = vi.fn().mockResolvedValue(undefined);

      await service.popEmail(tenantId, 1);

      expect(eventHandler).toHaveBeenCalled();
    });
  });
});
