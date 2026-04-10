import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../audit/index.js', () => ({
  createAuditLog: vi.fn(() => Promise.resolve(undefined)),
}));

import * as userService from '../user.service.js';

import type { AppConfig } from '../../../config.js';
import type { UserRepository } from '../user.repository.js';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

const createMockConfig = (): AppConfig => ({
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  DATABASE_POOL_SIZE: 1,
  REDIS_URL: 'redis://localhost:6379',
  SESSION_SECRET: 'test-secret-at-least-32-chars-long',
  SESSION_TTL_SECONDS: 3600,
  CSRF_SECRET: 'test-csrf-secret-at-least-32-chars',
  API_PORT: 3001,
  API_HOST: 'localhost',
  CORS_ORIGINS: ['http://localhost:5173'],
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW_MS: 60000,
  SMTP_HOST: 'localhost',
  SMTP_PORT: 1025,
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: 'test@example.com',
  JWT_PUBLIC_KEY: 'test-public-key',
  JWT_PRIVATE_KEY: 'test-private-key',
  TRUST_PROXY: true,
});

const createMockRepository = (): UserRepository => {
  return {
    findUserByTenantAndEmail: vi.fn().mockResolvedValue(undefined),
    findUserByTenantAndId: vi.fn().mockResolvedValue(undefined),
    createUser: vi.fn().mockResolvedValue({
      userId: 'new-user-id',
      tenantId: 'tenant-1',
      email: 'new@test.com',
      displayName: 'New User',
      role: 'learner',
      isActive: true,
      isJitCreated: false,
      idpSource: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateUser: vi.fn().mockResolvedValue({
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'test@test.com',
      displayName: 'Test User',
      role: 'learner',
      isActive: true,
      isJitCreated: false,
      idpSource: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    deleteUserRoles: vi.fn().mockResolvedValue(undefined),
    countAdmins: vi.fn().mockResolvedValue(2),
    getRoleAssignments: vi.fn().mockResolvedValue([]),
    listUsers: vi.fn().mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
    findRoleByTenantAndId: vi.fn().mockResolvedValue({ id: 'role-1', name: 'manager' }),
    findUserRoleAssignment: vi.fn().mockResolvedValue(undefined),
    assignUserRole: vi.fn().mockResolvedValue(undefined),
    revokeUserRole: vi.fn().mockResolvedValue(undefined),
    getRecentActivity: vi.fn().mockResolvedValue([]),
    getLoginHistory: vi.fn().mockResolvedValue([]),
  } as unknown as UserRepository;
};

describe('UserService DI Compliance', () => {
  describe('createUser', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.createUser(
          'tenant-1',
          { email: 'test@test.com', displayName: 'Test' },
          'admin-1',
          undefined as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.createUser(
          'tenant-1',
          { email: 'test@test.com', displayName: 'Test' },
          'admin-1',
          null as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      await userService.createUser(
        'tenant-1',
        { email: 'test@test.com', displayName: 'Test' },
        'admin-1',
        mockConfig,
        mockRepo,
      );

      expect(mockRepo.findUserByTenantAndEmail).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.updateUser(
          'tenant-1',
          'user-1',
          { displayName: 'Updated' },
          'admin-1',
          undefined as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.updateUser(
          'tenant-1',
          'user-1',
          { displayName: 'Updated' },
          'admin-1',
          null as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      vi.mocked(mockRepo.findUserByTenantAndId).mockResolvedValueOnce({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        displayName: 'Test',
        role: 'learner',
        isActive: true,
        isJitCreated: false,
        idpSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userService.updateUser(
        'tenant-1',
        'user-1',
        { displayName: 'Updated' },
        'admin-1',
        mockConfig,
        mockRepo,
      );

      expect(mockRepo.findUserByTenantAndId).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.deleteUser(
          'tenant-1',
          'user-1',
          'admin-1',
          undefined as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.deleteUser(
          'tenant-1',
          'user-1',
          'admin-1',
          null as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      vi.mocked(mockRepo.findUserByTenantAndId).mockResolvedValueOnce({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        displayName: 'Test',
        role: 'learner',
        isActive: true,
        isJitCreated: false,
        idpSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userService.deleteUser('tenant-1', 'user-1', 'admin-1', mockConfig, mockRepo);

      expect(mockRepo.deleteUser).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.getUserById(
          'tenant-1',
          'user-1',
          undefined as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.getUserById('tenant-1', 'user-1', null as unknown as AppConfig, mockRepo);
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      vi.mocked(mockRepo.findUserByTenantAndId).mockResolvedValueOnce({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        displayName: 'Test',
        role: 'learner',
        isActive: true,
        isJitCreated: false,
        idpSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userService.getUserById('tenant-1', 'user-1', mockConfig, mockRepo);

      expect(mockRepo.findUserByTenantAndId).toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.listUsers(
          'tenant-1',
          { page: 1, limit: 10 },
          undefined as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.listUsers(
          'tenant-1',
          { page: 1, limit: 10 },
          null as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      await userService.listUsers('tenant-1', { page: 1, limit: 10 }, mockConfig, mockRepo);

      expect(mockRepo.listUsers).toHaveBeenCalled();
    });
  });

  describe('assignUserRole', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.assignUserRole(
          'tenant-1',
          'user-1',
          'role-1',
          'admin-1',
          undefined as unknown as AppConfig,
          undefined,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.assignUserRole(
          'tenant-1',
          'user-1',
          'role-1',
          'admin-1',
          null as unknown as AppConfig,
          undefined,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      vi.mocked(mockRepo.findUserByTenantAndId).mockResolvedValueOnce({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        displayName: 'Test',
        role: 'learner',
        isActive: true,
        isJitCreated: false,
        idpSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userService.assignUserRole(
        'tenant-1',
        'user-1',
        'role-1',
        'admin-1',
        mockConfig,
        undefined,
        mockRepo,
      );

      expect(mockRepo.findUserByTenantAndId).toHaveBeenCalled();
    });
  });

  describe('revokeUserRole', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.revokeUserRole(
          'tenant-1',
          'user-1',
          'role-1',
          'admin-1',
          undefined as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.revokeUserRole(
          'tenant-1',
          'user-1',
          'role-1',
          'admin-1',
          null as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      vi.mocked(mockRepo.findUserRoleAssignment).mockResolvedValueOnce({
        id: 'assignment-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        roleId: 'role-1',
      });

      await userService.revokeUserRole(
        'tenant-1',
        'user-1',
        'role-1',
        'admin-1',
        mockConfig,
        mockRepo,
      );

      expect(mockRepo.findUserRoleAssignment).toHaveBeenCalled();
    });
  });

  describe('getUserActivity', () => {
    it('should throw TypeError when config is not provided', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.getUserActivity(
          'tenant-1',
          'user-1',
          undefined as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should throw TypeError when config is null', async () => {
      const mockRepo = createMockRepository();

      await expect(async () => {
        await userService.getUserActivity(
          'tenant-1',
          'user-1',
          null as unknown as AppConfig,
          mockRepo,
        );
      }).rejects.toThrow(TypeError);
    });

    it('should work when config is provided with repository', async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfig();

      vi.mocked(mockRepo.findUserByTenantAndId).mockResolvedValueOnce({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        displayName: 'Test',
        role: 'learner',
        isActive: true,
        isJitCreated: false,
        idpSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userService.getUserActivity('tenant-1', 'user-1', mockConfig, mockRepo);

      expect(mockRepo.findUserByTenantAndId).toHaveBeenCalled();
    });
  });
});
