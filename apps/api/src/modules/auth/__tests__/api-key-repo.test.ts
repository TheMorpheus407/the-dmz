/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  CredentialStatus,
  CredentialType,
  CredentialOwnerType,
} from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

import {
  parseJsonField,
  mapDbToResponse,
  createApiKey,
  listApiKeys,
  getApiKeyById,
  deleteApiKey,
  updateApiKeyLastUsed,
  getApiKeyByIdRaw,
} from '../api-key-repo.js';

vi.mock('../api-key-crypto.js', () => ({
  generateSecret: vi.fn().mockReturnValue('dmz_ak_test-secret'),
  hashSecret: vi.fn().mockResolvedValue('hashed-secret'),
  getKeyPrefix: vi.fn().mockReturnValue('dmz_ak_'),
}));

describe('api-key-repo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseJsonField', () => {
    it('should return undefined for null field', () => {
      const result = parseJsonField<readonly string[]>(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined field', () => {
      const result = parseJsonField<readonly string[]>(undefined);
      expect(result).toBeUndefined();
    });

    it('should parse valid JSON string', () => {
      const result = parseJsonField<readonly string[]>(JSON.stringify(['scope1', 'scope2']));
      expect(result).toEqual(['scope1', 'scope2']);
    });

    it('should return undefined for invalid JSON string', () => {
      const result = parseJsonField<readonly string[]>('not valid json');
      expect(result).toBeUndefined();
    });

    it('should return already-parsed object as-is', () => {
      const parsed = ['scope1', 'scope2'] as const;
      const result = parseJsonField<readonly string[]>(parsed);
      expect(result).toBe(parsed);
    });

    it('should parse JSON number', () => {
      const result = parseJsonField<number>(JSON.stringify(100));
      expect(result).toBe(100);
    });

    it('should return undefined for malformed JSON-like string', () => {
      const result = parseJsonField<number>('{invalid}');
      expect(result).toBeUndefined();
    });
  });

  describe('mapDbToResponse', () => {
    const createMockDbKey = (overrides: Record<string, unknown> = {}) => ({
      id: 'test-id',
      keyId: 'test-key-id',
      tenantId: 'test-tenant',
      name: 'Test Key',
      type: 'api_key',
      ownerType: 'service',
      ownerId: null,
      serviceAccountId: null,
      secretHash: 'hashed-secret',
      previousSecretHash: null,
      scopes: JSON.stringify(['read:items', 'write:items']),
      status: CredentialStatus.ACTIVE,
      expiresAt: null,
      rotationGracePeriodDays: '7',
      rotationGraceEndsAt: null,
      lastUsedAt: null,
      createdBy: 'test-user',
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-01'),
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      metadata: null,
      ipAllowlist: JSON.stringify(['192.168.1.1']),
      refererRestrictions: null,
      rateLimitRequestsPerWindow: null,
      rateLimitWindowMs: null,
      ...overrides,
    });

    it('should parse scopes from JSON string', () => {
      const dbKey = createMockDbKey();
      const result = mapDbToResponse(dbKey);

      expect(result.scopes).toEqual(['read:items', 'write:items']);
    });

    it('should handle scopes as already-parsed array', () => {
      const scopes = ['read:items', 'write:items'] as const;
      const dbKey = createMockDbKey({ scopes });
      const result = mapDbToResponse(dbKey);

      expect(result.scopes).toEqual(['read:items', 'write:items']);
    });

    it('should parse rotationGracePeriodDays as integer', () => {
      const dbKey = createMockDbKey({ rotationGracePeriodDays: '14' });
      const result = mapDbToResponse(dbKey);

      expect(result.rotationGracePeriodDays).toBe(14);
    });

    it('should handle null ipAllowlist', () => {
      const dbKey = createMockDbKey({ ipAllowlist: null });
      const result = mapDbToResponse(dbKey);

      expect(result.ipAllowlist).toBeNull();
    });

    it('should parse ipAllowlist from JSON string', () => {
      const dbKey = createMockDbKey({ ipAllowlist: JSON.stringify(['10.0.0.1', '10.0.0.2']) });
      const result = mapDbToResponse(dbKey);

      expect(result.ipAllowlist).toEqual(['10.0.0.1', '10.0.0.2']);
    });

    it('should handle all null restriction fields', () => {
      const dbKey = createMockDbKey({
        ipAllowlist: null,
        refererRestrictions: null,
        rateLimitRequestsPerWindow: null,
        rateLimitWindowMs: null,
      });
      const result = mapDbToResponse(dbKey);

      expect(result.ipAllowlist).toBeNull();
      expect(result.refererRestrictions).toBeNull();
      expect(result.rateLimitRequestsPerWindow).toBeNull();
      expect(result.rateLimitWindowMs).toBeNull();
    });
  });

  describe('createApiKey', () => {
    const mockDb = {
      select: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    } as any;

    beforeEach(() => {
      mockDb.select.mockReset();
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockReset();
    });

    it('should throw when tenant has 100 keys', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(Array(100).fill({ id: 'key' })),
        }),
      });

      await expect(createApiKey(mockDb, { name: 'Test' }, 'user', 'tenant')).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_TOO_MANY,
      });
    });

    it('should throw when user has 10 keys', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValueOnce([{ id: 'key1' }]) // tenant count = 1 (below 100)
            .mockResolvedValueOnce(Array(10).fill({ id: 'key' })), // user count = 10
        }),
      });

      await expect(
        createApiKey(mockDb, { name: 'Test', ownerId: 'user-1' }, 'user', 'tenant'),
      ).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_TOO_MANY,
      });
    });

    it('should create key with expiresAt', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'key1' }]),
        }),
      });

      const expiresAt = '2027-01-01T00:00:00.000Z';
      const createdKey = {
        id: 'new-id',
        keyId: 'new-key-id',
        tenantId: 'tenant',
        name: 'Test Key',
        type: CredentialType.API_KEY,
        ownerType: CredentialOwnerType.SERVICE,
        ownerId: null,
        serviceAccountId: null,
        scopes: JSON.stringify([]),
        status: CredentialStatus.ACTIVE,
        expiresAt: new Date(expiresAt),
        rotationGracePeriodDays: '7',
        rotationGraceEndsAt: null,
        lastUsedAt: null,
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        ipAllowlist: null,
        refererRestrictions: null,
        rateLimitRequestsPerWindow: null,
        rateLimitWindowMs: null,
      };

      mockDb.returning.mockResolvedValue([createdKey]);

      const result = await createApiKey(mockDb, { name: 'Test Key', expiresAt }, 'user', 'tenant');

      expect(result.expiresAt).toEqual(new Date(expiresAt));
      expect(result.secret).toBe('dmz_ak_test-secret');
    });

    it('should create key with scopes as JSON string', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'key1' }]),
        }),
      });

      const createdKey = {
        id: 'new-id',
        keyId: 'new-key-id',
        tenantId: 'tenant',
        name: 'Test Key',
        type: CredentialType.API_KEY,
        ownerType: CredentialOwnerType.SERVICE,
        ownerId: null,
        serviceAccountId: null,
        scopes: JSON.stringify(['read:items']),
        status: CredentialStatus.ACTIVE,
        expiresAt: null,
        rotationGracePeriodDays: '7',
        rotationGraceEndsAt: null,
        lastUsedAt: null,
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        ipAllowlist: null,
        refererRestrictions: null,
        rateLimitRequestsPerWindow: null,
        rateLimitWindowMs: null,
      };

      mockDb.returning.mockResolvedValue([createdKey]);

      const result = await createApiKey(
        mockDb,
        { name: 'Test Key', scopes: ['read:items'] },
        'user',
        'tenant',
      );

      expect(result.scopes).toEqual(['read:items']);
    });
  });

  describe('listApiKeys', () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    } as any;

    const createKey = (id: string, keyId: string) => ({
      id,
      keyId,
      tenantId: 'test-tenant',
      name: `Key ${id}`,
      type: 'api_key',
      ownerType: 'service',
      ownerId: null,
      serviceAccountId: null,
      scopes: JSON.stringify([]),
      status: CredentialStatus.ACTIVE,
      expiresAt: null,
      rotationGracePeriodDays: '7',
      rotationGraceEndsAt: null,
      lastUsedAt: null,
      createdBy: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      revokedAt: null,
      ipAllowlist: null,
      refererRestrictions: null,
      rateLimitRequestsPerWindow: null,
      rateLimitWindowMs: null,
    });

    beforeEach(() => {
      mockDb.select.mockReset().mockReturnThis();
      mockDb.from.mockReset().mockReturnThis();
      mockDb.where.mockReset().mockReturnThis();
      mockDb.orderBy.mockReset().mockReturnThis();
      mockDb.limit.mockReset().mockReturnThis();
    });

    it('should return empty list when no keys', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await listApiKeys(mockDb, 'test-tenant');

      expect(result.keys).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.cursor).toBeUndefined();
    });

    it('should return keys with pagination', async () => {
      const keys = [createKey('1', 'key-1'), createKey('2', 'key-2')];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(keys),
            }),
          }),
        }),
      });

      const result = await listApiKeys(mockDb, 'test-tenant', { limit: 2 });

      expect(result.keys).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should provide cursor when more results exist', async () => {
      const keys = [createKey('1', 'key-1'), createKey('2', 'key-2'), createKey('3', 'key-3')];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(keys),
            }),
          }),
        }),
      });

      const result = await listApiKeys(mockDb, 'test-tenant', { limit: 2 });

      expect(result.keys).toHaveLength(2);
      expect(result.cursor).toBe('key-2');
    });

    it('should filter by ownerType', async () => {
      const keys = [createKey('1', 'key-1')];
      mockDb.limit.mockReturnValue(keys);

      await listApiKeys(mockDb, 'test-tenant', { ownerType: CredentialOwnerType.SERVICE });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const keys = [createKey('1', 'key-1')];
      mockDb.limit.mockReturnValue(keys);

      await listApiKeys(mockDb, 'test-tenant', { status: CredentialStatus.ACTIVE });

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('getApiKeyById', () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
    } as any;

    beforeEach(() => {
      mockDb.select.mockReset();
      mockDb.from.mockReset();
      mockDb.where.mockReset();
    });

    it('should return null when key not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await getApiKeyById(mockDb, 'non-existent', 'tenant');

      expect(result).toBeNull();
    });

    it('should return key when found', async () => {
      const key = {
        id: 'id',
        keyId: 'key-id',
        tenantId: 'tenant',
        name: 'Test Key',
        type: 'api_key',
        ownerType: 'service',
        ownerId: null,
        serviceAccountId: null,
        scopes: JSON.stringify([]),
        status: CredentialStatus.ACTIVE,
        expiresAt: null,
        rotationGracePeriodDays: '7',
        rotationGraceEndsAt: null,
        lastUsedAt: null,
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        ipAllowlist: null,
        refererRestrictions: null,
        rateLimitRequestsPerWindow: null,
        rateLimitWindowMs: null,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([key]),
        }),
      });

      const result = await getApiKeyById(mockDb, 'key-id', 'tenant');

      expect(result).not.toBeNull();
      expect(result?.keyId).toBe('key-id');
    });
  });

  describe('deleteApiKey', () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    } as any;

    beforeEach(() => {
      mockDb.select.mockReset();
      mockDb.from.mockReset();
      mockDb.where.mockReset();
      mockDb.delete.mockReset();
    });

    it('should throw when key not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(deleteApiKey(mockDb, 'non-existent', 'tenant')).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_NOT_FOUND,
      });
    });

    it('should delete key when found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'key-id' }]),
        }),
      });

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await deleteApiKey(mockDb, 'key-id', 'tenant');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('updateApiKeyLastUsed', () => {
    const mockDb = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    } as any;

    it('should update lastUsedAt', async () => {
      await updateApiKeyLastUsed(mockDb, 'key-id');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });
  });

  describe('getApiKeyByIdRaw', () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
    } as any;

    beforeEach(() => {
      mockDb.select.mockReset();
      mockDb.from.mockReset();
      mockDb.where.mockReset();
    });

    it('should return null when key not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await getApiKeyByIdRaw(mockDb, 'non-existent');

      expect(result).toBeNull();
    });

    it('should return raw key when found', async () => {
      const key = { id: 'id', keyId: 'key-id', secretHash: 'hash' };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([key]),
        }),
      });

      const result = await getApiKeyByIdRaw(mockDb, 'key-id');

      expect(result).toEqual(key);
    });
  });
});
