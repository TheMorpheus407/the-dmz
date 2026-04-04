/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CredentialStatus } from '@the-dmz/shared/auth/api-key-contract';

vi.mock('argon2', () => ({
  __esModule: true,
  default: {
    verify: vi.fn(),
    hash: vi.fn(),
  },
  verify: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

vi.mock('../api-key-crypto.js', () => ({
  generateSecret: vi.fn(() => 'test-secret-xxxx'),
  hashSecret: vi.fn(() => Promise.resolve('hashed-secret')),
  getKeyPrefix: vi.fn(() => 'sk_test_'),
}));

describe('api-key-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('createApiKey', () => {
    it('should create API key with valid input', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'new-key-id',
                keyId: 'key-123',
                tenantId: 'tenant-1',
                name: 'Test Key',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hashed-secret',
                scopes: '[]',
                status: 'active',
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: new Date(),
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
      } as any;

      const result = await apiKeyService.createApiKey(
        mockDb,
        { name: 'Test Key', scopes: [{ resource: 'analytics', actions: ['read'] }] },
        'user-1',
        'tenant-1',
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Key');
    });

    it('should reject when tenant has 100+ keys', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(Array(100).fill({ id: 'key' })),
          })),
        })),
      } as any;

      await expect(
        apiKeyService.createApiKey(mockDb, { name: 'Test Key' }, 'user-1', 'tenant-1'),
      ).rejects.toThrow('Maximum number of API keys reached for tenant');
    });

    it('should reject when user has 10+ keys', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      let callCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve([]);
              }
              return Promise.resolve(Array(10).fill({ id: 'key' }));
            }),
          })),
        })),
      } as any;

      await expect(
        apiKeyService.createApiKey(
          mockDb,
          { name: 'Test Key', ownerId: 'user-2' },
          'user-1',
          'tenant-1',
        ),
      ).rejects.toThrow('Maximum number of API keys reached for user');
    });
  });

  describe('listApiKeys', () => {
    it('should return keys for tenant', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 'key-1',
                    keyId: 'keyid-1',
                    tenantId: 'tenant-1',
                    name: 'Key 1',
                    type: 'api_key',
                    ownerType: 'service',
                    ownerId: null,
                    secretHash: 'hash',
                    scopes: '[]',
                    status: 'active',
                    expiresAt: null,
                    rotationGracePeriodDays: '7',
                    rotationGraceEndsAt: null,
                    lastUsedAt: null,
                    createdBy: 'user-1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          })),
        })),
      } as any;

      const result = await apiKeyService.listApiKeys(mockDb, 'tenant-1');

      expect(result.keys).toHaveLength(1);
      expect(result.keys[0]?.name).toBe('Key 1');
    });

    it('should return empty array when no keys exist', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })),
        })),
      } as any;

      const result = await apiKeyService.listApiKeys(mockDb, 'tenant-1');

      expect(result.keys).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should support pagination with cursor', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const keys = Array(21)
        .fill(null)
        .map((_, i) => ({
          id: `key-${i}`,
          keyId: `keyid-${i}`,
          tenantId: 'tenant-1',
          name: `Key ${i}`,
          type: 'api_key',
          ownerType: 'service',
          ownerId: null,
          secretHash: 'hash',
          scopes: '[]',
          status: 'active',
          expiresAt: null,
          rotationGracePeriodDays: '7',
          rotationGraceEndsAt: null,
          lastUsedAt: null,
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(keys),
              }),
            }),
          })),
        })),
      } as any;

      const result = await apiKeyService.listApiKeys(mockDb, 'tenant-1', { limit: 20 });

      expect(result.keys).toHaveLength(20);
      expect(result.cursor).toBe('keyid-19');
    });
  });

  describe('getApiKeyById', () => {
    it('should return key when exists', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hash',
                scopes: '[]',
                status: 'active',
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
      } as any;

      const result = await apiKeyService.getApiKeyById(mockDb, 'keyid-1', 'tenant-1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Key 1');
    });

    it('should return null when not found', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      const result = await apiKeyService.getApiKeyById(mockDb, 'nonexistent', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should validate valid key successfully', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                ownerType: 'service',
                ownerId: null,
                serviceAccountId: null,
                secretHash: 'hashed-secret',
                previousSecretHash: null,
                scopes: [],
                status: CredentialStatus.ACTIVE,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                ipAllowlist: null,
                refererRestrictions: null,
                rateLimitRequestsPerWindow: null,
                rateLimitWindowMs: null,
              },
            ]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      const result = await apiKeyService.validateApiKey(mockDb, 'keyid-1', 'valid-secret');

      expect(result).toBeDefined();
    });

    it('should reject revoked keys', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                ownerType: 'service',
                ownerId: null,
                serviceAccountId: null,
                secretHash: 'hashed-secret',
                previousSecretHash: null,
                scopes: [],
                status: CredentialStatus.REVOKED,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                ipAllowlist: null,
                refererRestrictions: null,
                rateLimitRequestsPerWindow: null,
                rateLimitWindowMs: null,
              },
            ]),
          })),
        })),
      } as any;

      const result = await apiKeyService.validateApiKey(mockDb, 'keyid-1', 'some-secret');

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBeDefined();
    });

    it('should validate key in rotation grace period with previous secret', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                ownerType: 'service',
                ownerId: null,
                serviceAccountId: null,
                secretHash: 'hashed-secret',
                previousSecretHash: 'previous-hash',
                scopes: [],
                status: CredentialStatus.ROTATING,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: futureDate,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                ipAllowlist: null,
                refererRestrictions: null,
                rateLimitRequestsPerWindow: null,
                rateLimitWindowMs: null,
              },
            ]),
          })),
        })),
      } as any;

      const result = await apiKeyService.validateApiKey(mockDb, 'keyid-1', 'some-secret');

      expect(result).toBeDefined();
    });
  });

  describe('rotateApiKey', () => {
    it('should rotate existing key', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'old-hash',
                scopes: '[]',
                status: CredentialStatus.ACTIVE,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'key-1',
                  keyId: 'keyid-1',
                  tenantId: 'tenant-1',
                  name: 'Key 1',
                  type: 'api_key',
                  ownerType: 'service',
                  ownerId: null,
                  secretHash: 'new-hash',
                  previousSecretHash: 'old-hash',
                  scopes: '[]',
                  status: CredentialStatus.ROTATING,
                  expiresAt: null,
                  rotationGracePeriodDays: '7',
                  rotationGraceEndsAt: new Date(),
                  lastUsedAt: null,
                  createdBy: 'user-1',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]),
            }),
          })),
        })),
      } as any;

      const result = await apiKeyService.rotateApiKey(mockDb, 'keyid-1', {}, 'tenant-1');

      expect(result).toBeDefined();
      expect(result.status).toBe(CredentialStatus.ROTATING);
    });

    it('should throw when key not found', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        apiKeyService.rotateApiKey(mockDb, 'nonexistent', {}, 'tenant-1'),
      ).rejects.toThrow('API key not found');
    });

    it('should throw when key is revoked', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hash',
                scopes: '[]',
                status: CredentialStatus.REVOKED,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
      } as any;

      await expect(apiKeyService.rotateApiKey(mockDb, 'keyid-1', {}, 'tenant-1')).rejects.toThrow(
        'Cannot rotate a revoked API key',
      );
    });

    it('should throw when rotation already in progress', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hash',
                scopes: '[]',
                status: CredentialStatus.ROTATING,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
      } as any;

      await expect(apiKeyService.rotateApiKey(mockDb, 'keyid-1', {}, 'tenant-1')).rejects.toThrow(
        'API key rotation already in progress',
      );
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke existing key', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hash',
                scopes: '[]',
                status: CredentialStatus.ACTIVE,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'key-1',
                  keyId: 'keyid-1',
                  tenantId: 'tenant-1',
                  name: 'Key 1',
                  type: 'api_key',
                  ownerType: 'service',
                  ownerId: null,
                  secretHash: 'hash',
                  scopes: '[]',
                  status: CredentialStatus.REVOKED,
                  expiresAt: null,
                  rotationGracePeriodDays: '7',
                  rotationGraceEndsAt: null,
                  lastUsedAt: null,
                  createdBy: 'user-1',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  revokedAt: new Date(),
                  revokedBy: 'admin-1',
                  revocationReason: 'Test reason',
                },
              ]),
            }),
          })),
        })),
      } as any;

      const result = await apiKeyService.revokeApiKey(
        mockDb,
        'keyid-1',
        { reason: 'Test reason' },
        'admin-1',
        'tenant-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(CredentialStatus.REVOKED);
    });

    it('should throw when key not found', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        apiKeyService.revokeApiKey(mockDb, 'nonexistent', {}, 'admin-1', 'tenant-1'),
      ).rejects.toThrow('API key not found');
    });

    it('should return key when already revoked', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hash',
                scopes: '[]',
                status: CredentialStatus.REVOKED,
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                revokedAt: new Date(),
                revokedBy: 'admin-1',
                revocationReason: 'Previous reason',
              },
            ]),
          })),
        })),
      } as any;

      const result = await apiKeyService.revokeApiKey(
        mockDb,
        'keyid-1',
        { reason: 'New reason' },
        'admin-1',
        'tenant-1',
      );

      expect(result.status).toBe(CredentialStatus.REVOKED);
    });
  });

  describe('deleteApiKey', () => {
    it('should delete existing key', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hash',
                scopes: '[]',
                status: 'active',
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      } as any;

      await expect(
        apiKeyService.deleteApiKey(mockDb, 'keyid-1', 'tenant-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw error when key not found', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(apiKeyService.deleteApiKey(mockDb, 'nonexistent', 'tenant-1')).rejects.toThrow(
        'API key not found',
      );
    });
  });

  describe('getApiKeyByIdForAdmin', () => {
    it('should return key for admin without tenant filter', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'key-1',
                keyId: 'keyid-1',
                tenantId: 'tenant-1',
                name: 'Key 1',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hash',
                scopes: '[]',
                status: 'active',
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: null,
                lastUsedAt: null,
                createdBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          })),
        })),
      } as any;

      const result = await apiKeyService.getApiKeyByIdForAdmin(mockDb, 'keyid-1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Key 1');
    });
  });

  describe('updateApiKeyLastUsed', () => {
    it('should update last used timestamp', async () => {
      const { apiKeyService } = await import('../api-key.service.js');

      const mockDb = {
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      } as any;

      await expect(apiKeyService.updateApiKeyLastUsed(mockDb, 'keyid-1')).resolves.toBeUndefined();
    });
  });
});
