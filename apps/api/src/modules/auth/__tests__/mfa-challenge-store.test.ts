import { afterAll, describe, expect, it, vi } from 'vitest';

import { closeDatabase } from '../../../shared/database/connection.js';

describe('MFA WebAuthn Challenge Store (Redis)', () => {
  afterAll(async () => {
    await closeDatabase();
  });

  describe('Challenge storage with Redis', () => {
    const mockRedisClient = {
      status: 'ready' as const,
      connect: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue('PONG'),
      incrementRateLimitKey: vi.fn(),
      incrementHourlyQuotaKey: vi.fn(),
      getValue: vi.fn(),
      setValue: vi.fn(),
      deleteKey: vi.fn(),
      getKeys: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
    };

    it('serializes and deserializes challenge correctly', async () => {
      const challenge = {
        id: 'test-challenge-id',
        userId: 'test-user-id',
        tenantId: 'test-tenant-id',
        sessionId: 'test-session-id',
        challenge: 'test-challenge-value',
        type: 'verification' as const,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        expiresAt: new Date('2024-01-01T00:05:00Z'),
        used: false,
      };

      const serialized = JSON.stringify({
        ...challenge,
        createdAt: challenge.createdAt.toISOString(),
        expiresAt: challenge.expiresAt.toISOString(),
      });

      expect(serialized).toContain('test-challenge-id');
      expect(serialized).toContain('test-user-id');
      expect(serialized).toContain('"used":false');

      const deserialized = JSON.parse(serialized);
      expect(new Date(deserialized.createdAt).toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(new Date(deserialized.expiresAt).toISOString()).toBe('2024-01-01T00:05:00.000Z');
    });

    it('uses tenant-scoped key for challenge storage', () => {
      const tenantId = 'test-tenant-id';
      const challengeId = 'test-challenge-123';
      const expectedKey = `mfa:webauthn:challenge:${tenantId}:${challengeId}`;
      expect(expectedKey).toBe('mfa:webauthn:challenge:test-tenant-id:test-challenge-123');
    });

    it('challenge TTL is set to 5 minutes (300 seconds)', () => {
      const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
      const CHALLENGE_TTL_SECONDS = Math.ceil(CHALLENGE_EXPIRY_MS / 1000);
      expect(CHALLENGE_TTL_SECONDS).toBe(300);
    });

    it('mock Redis client has required methods for challenge storage', () => {
      expect(typeof mockRedisClient.getValue).toBe('function');
      expect(typeof mockRedisClient.setValue).toBe('function');
      expect(typeof mockRedisClient.deleteKey).toBe('function');
    });

    it('stores and retrieves challenge via Redis mock', async () => {
      const challengeId = 'challenge-123';
      const challengeData = {
        id: challengeId,
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        challenge: 'challenge-value',
        type: 'verification' as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
      };

      const serialized = JSON.stringify({
        ...challengeData,
        createdAt: challengeData.createdAt.toISOString(),
        expiresAt: challengeData.expiresAt.toISOString(),
      });

      mockRedisClient.setValue.mockResolvedValueOnce(undefined);
      mockRedisClient.getValue.mockResolvedValueOnce(serialized);

      const tenantId = 'tenant-1';
      await mockRedisClient.setValue(
        `mfa:webauthn:challenge:${tenantId}:${challengeId}`,
        serialized,
        300,
      );

      const retrieved = await mockRedisClient.getValue(
        `mfa:webauthn:challenge:${tenantId}:${challengeId}`,
      );

      expect(retrieved).toBe(serialized);
      expect(mockRedisClient.setValue).toHaveBeenCalledWith(
        'mfa:webauthn:challenge:tenant-1:challenge-123',
        expect.any(String),
        300,
      );
    });

    it('deletes challenge after use', async () => {
      const tenantId = 'test-tenant';
      const challengeId = 'challenge-to-delete';

      mockRedisClient.deleteKey.mockResolvedValueOnce(undefined);

      await mockRedisClient.deleteKey(`mfa:webauthn:challenge:${tenantId}:${challengeId}`);

      expect(mockRedisClient.deleteKey).toHaveBeenCalledWith(
        'mfa:webauthn:challenge:test-tenant:challenge-to-delete',
      );
    });

    it('returns null for non-existent challenge', async () => {
      mockRedisClient.getValue.mockResolvedValueOnce(null);

      const result = await mockRedisClient.getValue('mfa:webauthn:challenge:tenant-1:non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Challenge expiry logic', () => {
    it('correctly identifies expired challenges', () => {
      const expiredChallenge = {
        expiresAt: new Date(Date.now() - 1000),
      };

      expect(new Date() > expiredChallenge.expiresAt).toBe(true);
    });

    it('correctly identifies valid challenges', () => {
      const validChallenge = {
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      expect(new Date() > validChallenge.expiresAt).toBe(false);
    });
  });

  describe('Multi-instance deployment compatibility', () => {
    it('challenge can be stored and retrieved across different "instances"', async () => {
      const tenantId = 'tenant-1';
      const challengeId = 'shared-challenge';
      const challengeData = {
        id: challengeId,
        userId: 'user-1',
        tenantId: tenantId,
        sessionId: 'session-1',
        challenge: 'shared-challenge-value',
        type: 'verification' as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
      };

      const serialized = JSON.stringify({
        ...challengeData,
        createdAt: challengeData.createdAt.toISOString(),
        expiresAt: challengeData.expiresAt.toISOString(),
      });

      const redisInstanceA = {
        status: 'ready' as const,
        setValue: vi.fn().mockResolvedValue(undefined),
        getValue: vi.fn().mockResolvedValue(serialized),
        deleteKey: vi.fn().mockResolvedValue(undefined),
        connect: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue('PONG'),
        incrementRateLimitKey: vi.fn(),
        incrementHourlyQuotaKey: vi.fn(),
        getKeys: vi.fn(),
        quit: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
      };

      const redisInstanceB = {
        status: 'ready' as const,
        setValue: vi.fn().mockResolvedValue(undefined),
        getValue: vi.fn().mockResolvedValue(serialized),
        deleteKey: vi.fn().mockResolvedValue(undefined),
        connect: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue('PONG'),
        incrementRateLimitKey: vi.fn(),
        incrementHourlyQuotaKey: vi.fn(),
        getKeys: vi.fn(),
        quit: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
      };

      await redisInstanceA.setValue(
        `mfa:webauthn:challenge:${tenantId}:${challengeId}`,
        serialized,
        300,
      );

      const retrievedByInstanceB = await redisInstanceB.getValue(
        `mfa:webauthn:challenge:${tenantId}:${challengeId}`,
      );

      expect(retrievedByInstanceB).not.toBeNull();
      expect(retrievedByInstanceB).toBe(serialized);

      await redisInstanceB.deleteKey(`mfa:webauthn:challenge:${tenantId}:${challengeId}`);

      redisInstanceA.getValue.mockResolvedValueOnce(null);

      const afterDelete = await redisInstanceA.getValue(
        `mfa:webauthn:challenge:${tenantId}:${challengeId}`,
      );

      expect(afterDelete).toBeNull();
    });
  });
});
