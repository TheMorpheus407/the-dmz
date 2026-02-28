import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve([
            {
              id: 'test-id',
              keyId: 'test-key-id',
              tenantId: 'test-tenant',
              name: 'Test Key',
              type: 'api_key',
              ownerType: 'service',
              ownerId: null,
              secretHash: 'hashed-secret',
              scopes: [{ resource: 'analytics', actions: ['read'] }],
              status: 'active',
              expiresAt: null,
              rotationGracePeriodDays: '7',
              rotationGraceEndsAt: new Date(),
              lastUsedAt: null,
              createdBy: 'test-user',
              createdAt: new Date(),
              updatedAt: new Date(),
              revokedAt: null,
            },
          ]),
        ),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'test-id',
                keyId: 'test-key-id',
                tenantId: 'test-tenant',
                name: 'Test Key',
                type: 'api_key',
                ownerType: 'service',
                ownerId: null,
                secretHash: 'hashed-secret',
                scopes: [{ resource: 'analytics', actions: ['read'] }],
                status: 'rotating',
                expiresAt: null,
                rotationGracePeriodDays: '7',
                rotationGraceEndsAt: new Date(),
                lastUsedAt: null,
                createdBy: 'test-user',
                createdAt: new Date(),
                updatedAt: new Date(),
                revokedAt: null,
              },
            ]),
          ),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

describe('api-key-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiKeyService', () => {
    it('should have createApiKey function', async () => {
      const { apiKeyService } = await import('../api-key.service.js');
      expect(apiKeyService.createApiKey).toBeDefined();
    });

    it('should have listApiKeys function', async () => {
      const { apiKeyService } = await import('../api-key.service.js');
      expect(apiKeyService.listApiKeys).toBeDefined();
    });

    it('should have getApiKeyById function', async () => {
      const { apiKeyService } = await import('../api-key.service.js');
      expect(apiKeyService.getApiKeyById).toBeDefined();
    });

    it('should have validateApiKey function', async () => {
      const { apiKeyService } = await import('../api-key.service.js');
      expect(apiKeyService.validateApiKey).toBeDefined();
    });

    it('should have rotateApiKey function', async () => {
      const { apiKeyService } = await import('../api-key.service.js');
      expect(apiKeyService.rotateApiKey).toBeDefined();
    });

    it('should have revokeApiKey function', async () => {
      const { apiKeyService } = await import('../api-key.service.js');
      expect(apiKeyService.revokeApiKey).toBeDefined();
    });

    it('should have deleteApiKey function', async () => {
      const { apiKeyService } = await import('../api-key.service.js');
      expect(apiKeyService.deleteApiKey).toBeDefined();
    });
  });
});
