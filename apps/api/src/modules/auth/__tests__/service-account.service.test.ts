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
              serviceId: 'test-service-id',
              tenantId: 'test-tenant',
              name: 'Test Service Account',
              description: 'Test description',
              status: 'active',
              ownerId: null,
              metadata: null,
              createdBy: 'test-user',
              createdAt: new Date(),
              updatedAt: new Date(),
              disabledAt: null,
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
                serviceId: 'test-service-id',
                tenantId: 'test-tenant',
                name: 'Updated Service Account',
                description: 'Updated description',
                status: 'active',
                ownerId: null,
                metadata: null,
                createdBy: 'test-user',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: null,
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

vi.mock('../audit/audit.service.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('service-account-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('serviceAccountService', () => {
    it('should have createServiceAccount function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.createServiceAccount).toBeDefined();
      expect(typeof serviceAccountService.createServiceAccount).toBe('function');
    });

    it('should have listServiceAccounts function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.listServiceAccounts).toBeDefined();
      expect(typeof serviceAccountService.listServiceAccounts).toBe('function');
    });

    it('should have getServiceAccountById function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.getServiceAccountById).toBeDefined();
      expect(typeof serviceAccountService.getServiceAccountById).toBe('function');
    });

    it('should have updateServiceAccount function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.updateServiceAccount).toBeDefined();
      expect(typeof serviceAccountService.updateServiceAccount).toBe('function');
    });

    it('should have disableServiceAccount function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.disableServiceAccount).toBeDefined();
      expect(typeof serviceAccountService.disableServiceAccount).toBe('function');
    });

    it('should have enableServiceAccount function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.enableServiceAccount).toBeDefined();
      expect(typeof serviceAccountService.enableServiceAccount).toBe('function');
    });

    it('should have deleteServiceAccount function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.deleteServiceAccount).toBeDefined();
      expect(typeof serviceAccountService.deleteServiceAccount).toBe('function');
    });

    it('should have assignRoleToServiceAccount function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.assignRoleToServiceAccount).toBeDefined();
      expect(typeof serviceAccountService.assignRoleToServiceAccount).toBe('function');
    });

    it('should have revokeRoleFromServiceAccount function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.revokeRoleFromServiceAccount).toBeDefined();
      expect(typeof serviceAccountService.revokeRoleFromServiceAccount).toBe('function');
    });

    it('should have getServiceAccountRoles function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.getServiceAccountRoles).toBeDefined();
      expect(typeof serviceAccountService.getServiceAccountRoles).toBe('function');
    });

    it('should have getServiceAccountApiKeys function', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');
      expect(serviceAccountService.getServiceAccountApiKeys).toBeDefined();
      expect(typeof serviceAccountService.getServiceAccountApiKeys).toBe('function');
    });
  });
});
