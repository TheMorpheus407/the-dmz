import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createOAuthClient,
  findOAuthClientByClientIdOnly,
  findOAuthClientByClientId,
  findOAuthClientsByTenantId,
  rotateOAuthClientSecret,
  revokeOAuthClient,
  updateOAuthClientLastUsed,
  deleteOAuthClient,
  type OAuthClientData,
} from '../oauth-client.repo.js';

import type { DB } from '../../../../shared/database/connection.js';

vi.mock('../../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('oauth-client.repo', () => {
  let mockDb: DB;

  const mockOAuthClient = {
    id: 'id-123',
    clientId: 'client-456',
    tenantId: 'tenant-789',
    name: 'Test OAuth Client',
    secretHash: 'secret-hash',
    previousSecretHash: null,
    rotationGracePeriodHours: '1',
    rotationGraceEndsAt: null,
    scopes: 'read:users write:users',
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: {
        oauthClients: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      where: vi.fn(),
    } as unknown as DB;
  });

  describe('createOAuthClient', () => {
    it('should create an OAuth client', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockOAuthClient]),
        }),
      });

      const data: OAuthClientData = {
        tenantId: mockOAuthClient.tenantId,
        name: mockOAuthClient.name,
        secretHash: mockOAuthClient.secretHash,
        scopes: mockOAuthClient.scopes,
        expiresAt: null,
      };

      const result = await createOAuthClient(mockDb, data);

      expect(result).toMatchObject({
        id: mockOAuthClient.id,
        clientId: mockOAuthClient.clientId,
        tenantId: mockOAuthClient.tenantId,
        name: mockOAuthClient.name,
        scopes: mockOAuthClient.scopes,
      });
    });

    it('should create OAuth client with expiration', async () => {
      const expiresAt = new Date('2027-01-01');
      const clientWithExpiry = { ...mockOAuthClient, expiresAt };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([clientWithExpiry]),
        }),
      });

      const data: OAuthClientData = {
        tenantId: mockOAuthClient.tenantId,
        name: mockOAuthClient.name,
        secretHash: mockOAuthClient.secretHash,
        scopes: mockOAuthClient.scopes,
        expiresAt,
      };

      const result = await createOAuthClient(mockDb, data);

      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('findOAuthClientByClientIdOnly', () => {
    it('should return client when found', async () => {
      mockDb.query.oauthClients.findFirst = vi.fn().mockResolvedValue(mockOAuthClient);

      const result = await findOAuthClientByClientIdOnly(mockDb, mockOAuthClient.clientId);

      expect(result).toMatchObject({
        clientId: mockOAuthClient.clientId,
        secretHash: mockOAuthClient.secretHash,
      });
    });

    it('should return null when client not found', async () => {
      mockDb.query.oauthClients.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findOAuthClientByClientIdOnly(mockDb, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findOAuthClientByClientId', () => {
    it('should return client when found with matching tenant', async () => {
      mockDb.query.oauthClients.findFirst = vi.fn().mockResolvedValue(mockOAuthClient);

      const result = await findOAuthClientByClientId(
        mockDb,
        mockOAuthClient.clientId,
        mockOAuthClient.tenantId,
      );

      expect(result).toMatchObject({
        clientId: mockOAuthClient.clientId,
        tenantId: mockOAuthClient.tenantId,
      });
    });

    it('should return null when client not found', async () => {
      mockDb.query.oauthClients.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findOAuthClientByClientId(
        mockDb,
        'nonexistent',
        mockOAuthClient.tenantId,
      );

      expect(result).toBeNull();
    });

    it('should return null when tenant does not match', async () => {
      mockDb.query.oauthClients.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findOAuthClientByClientId(
        mockDb,
        mockOAuthClient.clientId,
        'wrong-tenant',
      );

      expect(result).toBeNull();
    });
  });

  describe('findOAuthClientsByTenantId', () => {
    it('should return all clients for tenant', async () => {
      const clients = [mockOAuthClient];
      mockDb.query.oauthClients.findMany = vi.fn().mockResolvedValue(clients);

      const result = await findOAuthClientsByTenantId(mockDb, mockOAuthClient.tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        clientId: mockOAuthClient.clientId,
        tenantId: mockOAuthClient.tenantId,
      });
    });

    it('should return empty array when no clients found', async () => {
      mockDb.query.oauthClients.findMany = vi.fn().mockResolvedValue([]);

      const result = await findOAuthClientsByTenantId(mockDb, mockOAuthClient.tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('rotateOAuthClientSecret', () => {
    it('should rotate client secret and set grace period', async () => {
      mockDb.query.oauthClients.findFirst = vi.fn().mockResolvedValue(mockOAuthClient);
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await rotateOAuthClientSecret(
        mockDb,
        mockOAuthClient.clientId,
        mockOAuthClient.tenantId,
        'new-secret-hash',
      );

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw error when client not found', async () => {
      mockDb.query.oauthClients.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        rotateOAuthClientSecret(mockDb, 'nonexistent', mockOAuthClient.tenantId, 'new-secret-hash'),
      ).rejects.toThrow('OAuth client not found');
    });
  });

  describe('revokeOAuthClient', () => {
    it('should revoke OAuth client', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await revokeOAuthClient(mockDb, mockOAuthClient.clientId, mockOAuthClient.tenantId);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateOAuthClientLastUsed', () => {
    it('should update lastUsedAt timestamp', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await updateOAuthClientLastUsed(mockDb, mockOAuthClient.clientId, mockOAuthClient.tenantId);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteOAuthClient', () => {
    it('should delete OAuth client', async () => {
      await deleteOAuthClient(mockDb, mockOAuthClient.clientId, mockOAuthClient.tenantId);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
