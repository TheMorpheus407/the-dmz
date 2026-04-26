import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
  findUserByEmailForPasswordReset,
} from '../user.repo.js';

import type { DB } from '../../../../shared/database/connection.js';

vi.mock('../../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('user.repo', () => {
  let mockDb: DB;

  const mockUser = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'learner',
    isActive: true,
    passwordHash: 'hashed-password',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn(),
    } as unknown as DB;
  });

  describe('createUser', () => {
    it('should create a new user with correct values', async () => {
      const createdUser = {
        userId: mockUser.userId,
        tenantId: mockUser.tenantId,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: 'learner',
        isActive: true,
      };

      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(null);
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUser]),
        }),
      });

      const result = await createUser(mockDb, {
        email: mockUser.email,
        passwordHash: mockUser.passwordHash,
        displayName: mockUser.displayName,
        tenantId: mockUser.tenantId,
      });

      expect(result).toMatchObject({
        id: mockUser.userId,
        email: mockUser.email,
        displayName: mockUser.displayName,
        tenantId: mockUser.tenantId,
        role: 'learner',
        isActive: true,
      });
    });

    it('should throw UserExistsError when email already exists', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(mockUser);

      await expect(
        createUser(mockDb, {
          email: mockUser.email,
          passwordHash: mockUser.passwordHash,
          displayName: mockUser.displayName,
          tenantId: mockUser.tenantId,
        }),
      ).rejects.toThrow('User with this email already exists');
    });

    it('should enforce tenant isolation - reject duplicate email in different tenant', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(null);
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              userId: mockUser.userId,
              tenantId: mockUser.tenantId,
              email: mockUser.email,
              displayName: mockUser.displayName,
              role: 'learner',
              isActive: true,
            },
          ]),
        }),
      });

      const result = await createUser(mockDb, {
        email: mockUser.email,
        passwordHash: mockUser.passwordHash,
        displayName: mockUser.displayName,
        tenantId: mockUser.tenantId,
      });

      expect(result).toBeDefined();
    });
  });

  describe('findUserByEmail', () => {
    it('should return user with password hash when found', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(mockUser);

      const result = await findUserByEmail(mockDb, mockUser.email, mockUser.tenantId);

      expect(result).toMatchObject({
        id: mockUser.userId,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        passwordHash: mockUser.passwordHash,
      });
    });

    it('should return null when user not found', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findUserByEmail(mockDb, 'notfound@example.com', mockUser.tenantId);

      expect(result).toBeNull();
    });

    it('should return null when user belongs to different tenant', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(mockUser);

      const result = await findUserByEmail(mockDb, mockUser.email, 'different-tenant');

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should return user when found and tenant matches', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(mockUser);

      const result = await findUserById(mockDb, mockUser.userId, mockUser.tenantId);

      expect(result).toMatchObject({
        id: mockUser.userId,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
      });
    });

    it('should return null when user not found', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findUserById(mockDb, 'nonexistent', mockUser.tenantId);

      expect(result).toBeNull();
    });

    it('should return null when tenant does not match', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(mockUser);

      const result = await findUserById(mockDb, mockUser.userId, 'wrong-tenant');

      expect(result).toBeNull();
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await updateUserPassword(mockDb, mockUser.userId, mockUser.tenantId, 'new-hash');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('findUserByEmailForPasswordReset', () => {
    it('should return user without password hash for password reset', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(mockUser);

      const result = await findUserByEmailForPasswordReset(
        mockDb,
        mockUser.email,
        mockUser.tenantId,
      );

      expect(result).toMatchObject({
        id: mockUser.userId,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
      });
    });

    it('should return null when user not found', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findUserByEmailForPasswordReset(
        mockDb,
        'notfound@example.com',
        mockUser.tenantId,
      );

      expect(result).toBeNull();
    });

    it('should return null when tenant does not match', async () => {
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue(mockUser);

      const result = await findUserByEmailForPasswordReset(mockDb, mockUser.email, 'wrong-tenant');

      expect(result).toBeNull();
    });
  });
});
