import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { PseudonymizationService } from '../pseudonymization.service.js';

describe('PseudonymizationService', () => {
  let service: PseudonymizationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new PseudonymizationService('test-encryption-key');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createPseudonymousId', () => {
    it('should create a new pseudonymous ID', async () => {
      const result = await service.createPseudonymousId('user-123', 'tenant-456');

      expect(result.success).toBe(true);
      expect(result.pseudonymousId).toBeDefined();
      expect(result.pseudonymousId).not.toBe('user-123');
    });

    it('should return cached ID for same user', async () => {
      const result1 = await service.createPseudonymousId('user-123', 'tenant-456');
      const result2 = await service.createPseudonymousId('user-123', 'tenant-456');

      expect(result1.pseudonymousId).toBe(result2.pseudonymousId);
    });
  });

  describe('reversePseudonymousId', () => {
    it('should return cached original ID', async () => {
      const createResult = await service.createPseudonymousId('user-123', 'tenant-456');
      const result = await service.reversePseudonymousId(createResult.pseudonymousId!);

      expect(result.success).toBe(true);
      expect(result.originalUserId).toBe('user-123');
    });

    it('should fail for unknown pseudonymous ID', async () => {
      const result = await service.reversePseudonymousId('unknown-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('anonymizeUserId', () => {
    it('should create consistent anonymized ID', async () => {
      const anon1 = await service.anonymizeUserId('user-123');
      const anon2 = await service.anonymizeUserId('user-123');

      expect(anon1).toBe(anon2);
      expect(anon1.substring(0, 5)).toBe('anon_');
    });

    it('should create different IDs for different users', async () => {
      const anon1 = await service.anonymizeUserId('user-123');
      const anon2 = await service.anonymizeUserId('user-456');

      expect(anon1).not.toBe(anon2);
    });
  });

  describe('getPseudonymousIdOrFallback', () => {
    it('should return pseudonymous ID if available', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');
      const result = service.getPseudonymousIdOrFallback('user-123');

      expect(result).not.toBe('user-123');
    });

    it('should return original ID as fallback', () => {
      const result = service.getPseudonymousIdOrFallback('unknown-user');

      expect(result).toBe('unknown-user');
    });
  });

  describe('hasPseudonymMapping', () => {
    it('should return true for mapped user', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');

      expect(service.hasPseudonymMapping('user-123')).toBe(true);
    });

    it('should return false for unmapped user', () => {
      expect(service.hasPseudonymMapping('unknown-user')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached mappings', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');
      service.clearCache();

      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('sanitizeEventForAnalytics', () => {
    it('should remove user ID', () => {
      const event: Record<string, unknown> = {
        userId: 'user-123',
        email: 'test@example.com',
        payload: { data: 'test' },
      };

      const sanitized = service.sanitizeEventForAnalytics(event);

      expect(sanitized['userId']).toBeUndefined();
    });

    it('should remove email from payload', () => {
      const event: Record<string, unknown> = {
        payload: {
          email: 'test@example.com',
          emailContent: 'sensitive content',
        },
      };

      const sanitized = service.sanitizeEventForAnalytics(event);
      const payload = sanitized['payload'] as Record<string, unknown>;

      expect(payload['email']).toBeUndefined();
      expect(payload['emailContent']).toBeUndefined();
    });
  });

  describe('isSafeForAnalyticsStorage', () => {
    it('should return true for safe payload', () => {
      const payload = { eventName: 'test', data: 'value' };

      expect(service.isSafeForAnalyticsStorage(payload)).toBe(true);
    });

    it('should return false for payload with password', () => {
      const payload = { eventName: 'test', password: 'secret' };

      expect(service.isSafeForAnalyticsStorage(payload)).toBe(false);
    });

    it('should return false for payload with token', () => {
      const payload = { eventName: 'test', token: 'abc123' };

      expect(service.isSafeForAnalyticsStorage(payload)).toBe(false);
    });
  });

  describe('TTL eviction', () => {
    const TTL_MS = 60 * 60 * 1000;

    it('should evict mappingCache entry after TTL expires', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');

      vi.advanceTimersByTime(TTL_MS + 1);

      const hasMapping = service.hasPseudonymMapping('user-123');
      expect(hasMapping).toBe(false);
    });

    it('should evict reverseCache entry after TTL expires', async () => {
      const createResult = await service.createPseudonymousId('user-123', 'tenant-456');

      vi.advanceTimersByTime(TTL_MS + 1);

      const reverseResult = await service.reversePseudonymousId(createResult.pseudonymousId!);
      expect(reverseResult.success).toBe(false);
    });

    it('should not evict entry before TTL expires', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');

      vi.advanceTimersByTime(TTL_MS - 1);

      const hasMapping = service.hasPseudonymMapping('user-123');
      expect(hasMapping).toBe(true);
    });

    it('should create new mapping after TTL expiration', async () => {
      const result1 = await service.createPseudonymousId('user-123', 'tenant-456');

      vi.advanceTimersByTime(TTL_MS + 1);

      const result2 = await service.createPseudonymousId('user-123', 'tenant-456');

      expect(result2.pseudonymousId).not.toBe(result1.pseudonymousId);
    });

    it('should refresh TTL on cache access', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');

      vi.advanceTimersByTime(TTL_MS - 1);

      service.getPseudonymousIdOrFallback('user-123');

      vi.advanceTimersByTime(TTL_MS - 1);

      const hasMapping = service.hasPseudonymMapping('user-123');
      expect(hasMapping).toBe(true);
    });

    it('should track different users independently', async () => {
      await service.createPseudonymousId('user-1', 'tenant-456');
      await service.createPseudonymousId('user-2', 'tenant-456');

      vi.advanceTimersByTime(TTL_MS + 1);

      expect(service.hasPseudonymMapping('user-1')).toBe(false);
      expect(service.hasPseudonymMapping('user-2')).toBe(false);
    });

    it('should bound cache size when entries expire', async () => {
      for (let i = 0; i < 100; i++) {
        await service.createPseudonymousId(`user-${i}`, 'tenant-456');
      }

      expect(service.getCacheSize()).toBe(100);

      vi.advanceTimersByTime(TTL_MS + 1);

      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('GDPR compliance - removeUser', () => {
    it('should have removeUser method for GDPR right to be forgotten', () => {
      expect(typeof service.removeUser).toBe('function');
    });

    it('should remove user mapping from both caches', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');

      service.removeUser('user-123');

      expect(service.hasPseudonymMapping('user-123')).toBe(false);
      expect(service.getPseudonymousIdOrFallback('user-123')).toBe('user-123');
    });

    it('should remove reverse mapping so pseudonymous ID cannot be reversed', async () => {
      const createResult = await service.createPseudonymousId('user-123', 'tenant-456');

      service.removeUser('user-123');

      const reverseResult = await service.reversePseudonymousId(createResult.pseudonymousId!);
      expect(reverseResult.success).toBe(false);
    });

    it('should handle removing non-existent user without error', () => {
      expect(() => service.removeUser('non-existent-user')).not.toThrow();
    });

    it('should reduce cache size after removeUser', async () => {
      await service.createPseudonymousId('user-123', 'tenant-456');

      const sizeBefore = service.getCacheSize();
      service.removeUser('user-123');
      const sizeAfter = service.getCacheSize();

      expect(sizeAfter).toBe(sizeBefore - 1);
    });
  });
});
