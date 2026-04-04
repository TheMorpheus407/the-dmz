/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { serviceAccounts } from '../../../db/schema/auth/service-accounts.js';
import { serviceAccountRoles } from '../../../db/schema/auth/service-account-roles.js';

vi.mock('../../config.js', () => ({
  loadConfig: vi.fn(() => ({
    DATABASE_URL: 'postgres://localhost:5432/test',
    DATABASE_POOL_MAX: 10,
    DATABASE_POOL_IDLE_TIMEOUT: 30,
    DATABASE_POOL_CONNECT_TIMEOUT: 10,
    DATABASE_SSL: false,
    NODE_ENV: 'test',
  })),
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
  getDatabasePool: vi.fn(),
}));

vi.mock('../audit/index.js', () => ({
  createAuditLog: vi.fn(() => Promise.resolve(undefined)),
}));

describe('service-account-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('createServiceAccount', () => {
    it('should create service account with valid input', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

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
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Test Service',
                description: 'Test description',
                status: 'active',
                ownerId: 'user-1',
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: null,
              },
            ]),
          })),
        })),
      } as any;

      const result = await serviceAccountService.createServiceAccount(
        mockDb,
        { name: 'Test Service', description: 'Test description', ownerId: 'user-1' },
        'admin-1',
        'tenant-1',
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Service');
      expect(result.serviceId).toBe('service-123');
      expect(result.status).toBe('active');
    });

    it('should throw error when insert fails', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.createServiceAccount(
          mockDb,
          { name: 'Test Service' },
          'admin-1',
          'tenant-1',
        ),
      ).rejects.toThrow('Failed to create service account');
    });
  });

  describe('listServiceAccounts', () => {
    it('should return accounts for tenant', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 'db-id-1',
                    serviceId: 'service-1',
                    tenantId: 'tenant-1',
                    name: 'Service 1',
                    description: 'Description 1',
                    status: 'active',
                    ownerId: null,
                    metadata: null,
                    createdBy: 'admin-1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    disabledAt: null,
                  },
                ]),
              }),
            }),
          })),
        })),
      } as any;

      const result = await serviceAccountService.listServiceAccounts(mockDb, 'tenant-1');

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]?.name).toBe('Service 1');
    });

    it('should return empty array when no accounts exist', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

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

      const result = await serviceAccountService.listServiceAccounts(mockDb, 'tenant-1');

      expect(result.accounts).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should support pagination with cursor', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const accounts = Array(21)
        .fill(null)
        .map((_, i) => ({
          id: `db-id-${i}`,
          serviceId: `service-${i}`,
          tenantId: 'tenant-1',
          name: `Service ${i}`,
          description: null,
          status: 'active',
          ownerId: null,
          metadata: null,
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          disabledAt: null,
        }));

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(accounts),
              }),
            }),
          })),
        })),
      } as any;

      const result = await serviceAccountService.listServiceAccounts(mockDb, 'tenant-1', {
        limit: 20,
      });

      expect(result.accounts).toHaveLength(20);
      expect(result.cursor).toBeDefined();
    });

    it('should filter by status', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 'db-id-1',
                    serviceId: 'service-1',
                    tenantId: 'tenant-1',
                    name: 'Service 1',
                    description: null,
                    status: 'disabled',
                    ownerId: null,
                    metadata: null,
                    createdBy: 'admin-1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    disabledAt: new Date(),
                  },
                ]),
              }),
            }),
          })),
        })),
      } as any;

      const result = await serviceAccountService.listServiceAccounts(mockDb, 'tenant-1', {
        status: 'disabled',
      });

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]?.status).toBe('disabled');
    });
  });

  describe('getServiceAccountById', () => {
    it('should return account when exists', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Test Service',
                description: 'Test description',
                status: 'active',
                ownerId: null,
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: null,
              },
            ]),
          })),
        })),
      } as any;

      const result = await serviceAccountService.getServiceAccountById(
        mockDb,
        'service-123',
        'tenant-1',
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Service');
    });

    it('should return null when not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      const result = await serviceAccountService.getServiceAccountById(
        mockDb,
        'nonexistent',
        'tenant-1',
      );

      expect(result).toBeNull();
    });
  });

  describe('updateServiceAccount', () => {
    it('should update account with valid input', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Old Name',
                description: 'Old description',
                status: 'active',
                ownerId: null,
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: null,
              },
            ]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'db-id-1',
                  serviceId: 'service-123',
                  tenantId: 'tenant-1',
                  name: 'New Name',
                  description: 'New description',
                  status: 'active',
                  ownerId: null,
                  metadata: null,
                  createdBy: 'admin-1',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  disabledAt: null,
                },
              ]),
            }),
          })),
        })),
      } as any;

      const result = await serviceAccountService.updateServiceAccount(
        mockDb,
        'service-123',
        { name: 'New Name', description: 'New description' },
        'tenant-1',
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('New Name');
    });

    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.updateServiceAccount(
          mockDb,
          'nonexistent',
          { name: 'New Name' },
          'tenant-1',
        ),
      ).rejects.toThrow('Service account not found');
    });
  });

  describe('disableServiceAccount', () => {
    it('should disable account successfully', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Test Service',
                description: null,
                status: 'active',
                ownerId: null,
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: null,
              },
            ]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'db-id-1',
                  serviceId: 'service-123',
                  tenantId: 'tenant-1',
                  name: 'Test Service',
                  description: null,
                  status: 'disabled',
                  ownerId: null,
                  metadata: null,
                  createdBy: 'admin-1',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  disabledAt: new Date(),
                },
              ]),
            }),
          })),
        })),
      } as any;

      const result = await serviceAccountService.disableServiceAccount(
        mockDb,
        'service-123',
        'tenant-1',
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('disabled');
    });

    it('should return early if already disabled', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Test Service',
                description: null,
                status: 'disabled',
                ownerId: null,
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: new Date(),
              },
            ]),
          })),
        })),
        update: vi.fn(),
      } as any;

      const result = await serviceAccountService.disableServiceAccount(
        mockDb,
        'service-123',
        'tenant-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('disabled');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.disableServiceAccount(mockDb, 'nonexistent', 'tenant-1'),
      ).rejects.toThrow('Service account not found');
    });
  });

  describe('enableServiceAccount', () => {
    it('should enable account successfully', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Test Service',
                description: null,
                status: 'disabled',
                ownerId: null,
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: new Date(),
              },
            ]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'db-id-1',
                  serviceId: 'service-123',
                  tenantId: 'tenant-1',
                  name: 'Test Service',
                  description: null,
                  status: 'active',
                  ownerId: null,
                  metadata: null,
                  createdBy: 'admin-1',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  disabledAt: null,
                },
              ]),
            }),
          })),
        })),
      } as any;

      const result = await serviceAccountService.enableServiceAccount(
        mockDb,
        'service-123',
        'tenant-1',
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('active');
    });

    it('should return early if already active', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Test Service',
                description: null,
                status: 'active',
                ownerId: null,
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: null,
              },
            ]),
          })),
        })),
        update: vi.fn(),
      } as any;

      const result = await serviceAccountService.enableServiceAccount(
        mockDb,
        'service-123',
        'tenant-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('active');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.enableServiceAccount(mockDb, 'nonexistent', 'tenant-1'),
      ).rejects.toThrow('Service account not found');
    });
  });

  describe('deleteServiceAccount', () => {
    it('should delete account successfully', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: 'db-id-1',
                serviceId: 'service-123',
                tenantId: 'tenant-1',
                name: 'Test Service',
                description: null,
                status: 'active',
                ownerId: null,
                metadata: null,
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                disabledAt: null,
              },
            ]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.deleteServiceAccount(mockDb, 'service-123', 'tenant-1', 'admin-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.deleteServiceAccount(mockDb, 'nonexistent', 'tenant-1'),
      ).rejects.toThrow('Service account not found');
    });
  });

  describe('assignRoleToServiceAccount', () => {
    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.assignRoleToServiceAccount(
          mockDb,
          'nonexistent',
          { roleId: 'role-1', assignedBy: 'admin-1' },
          'tenant-1',
        ),
      ).rejects.toThrow('Service account not found');
    });

    it('should throw NOT_FOUND when role not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn((selector) => {
          if (selector === serviceAccounts) {
            return {
              where: vi.fn(() => ({
                limit: vi.fn(() =>
                  Promise.resolve([
                    {
                      id: 'db-id-1',
                      serviceId: 'service-123',
                      tenantId: 'tenant-1',
                      name: 'Test Service',
                      description: null,
                      status: 'active',
                      ownerId: null,
                      metadata: null,
                      createdBy: 'admin-1',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      disabledAt: null,
                    },
                  ]),
                ),
              })),
            };
          }
          return {
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          };
        }),
      } as any;

      await expect(
        serviceAccountService.assignRoleToServiceAccount(
          mockDb,
          'service-123',
          { roleId: 'nonexistent', assignedBy: 'admin-1' },
          'tenant-1',
        ),
      ).rejects.toThrow('Role not found');
    });
  });

  describe('revokeRoleFromServiceAccount', () => {
    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.revokeRoleFromServiceAccount(
          mockDb,
          'nonexistent',
          'role-1',
          'tenant-1',
        ),
      ).rejects.toThrow('Service account not found');
    });
  });

  describe('getServiceAccountRoles', () => {
    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.getServiceAccountRoles(mockDb, 'nonexistent', 'tenant-1'),
      ).rejects.toThrow('Service account not found');
    });
  });

  describe('getServiceAccountApiKeys', () => {
    it('should throw NOT_FOUND when account not found', async () => {
      const { serviceAccountService } = await import('../service-account.service.js');

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
      } as any;

      await expect(
        serviceAccountService.getServiceAccountApiKeys(mockDb, 'nonexistent', 'tenant-1'),
      ).rejects.toThrow('Service account not found');
    });
  });
});
