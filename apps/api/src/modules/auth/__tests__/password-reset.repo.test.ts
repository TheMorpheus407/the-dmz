import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  deleteAllPasswordResetTokensForUser,
  type PasswordResetTokenRecord,
} from '../password-reset.repo.js';

import type { DB } from '../../../../shared/database/connection.js';

vi.mock('../../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('password-reset.repo', () => {
  let mockDb: DB;

  const mockToken: PasswordResetTokenRecord = {
    id: 'token-123',
    tenantId: 'tenant-456',
    userId: 'user-789',
    tokenHash: 'token-hash',
    expiresAt: new Date('2027-01-01'),
    usedAt: null,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: {
        passwordResetTokens: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      where: vi.fn(),
    } as unknown as DB;
  });

  describe('createPasswordResetToken', () => {
    it('should create a password reset token', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockToken]),
        }),
      });

      const result = await createPasswordResetToken(mockDb, {
        userId: mockToken.userId,
        tenantId: mockToken.tenantId,
        tokenHash: mockToken.tokenHash,
        expiresAt: mockToken.expiresAt,
      });

      expect(result).toMatchObject({
        id: mockToken.id,
        tenantId: mockToken.tenantId,
        userId: mockToken.userId,
        tokenHash: mockToken.tokenHash,
      });
    });
  });

  describe('findValidPasswordResetToken', () => {
    it('should return token when found and not expired', async () => {
      mockDb.query.passwordResetTokens.findFirst = vi.fn().mockResolvedValue(mockToken);

      const result = await findValidPasswordResetToken(
        mockDb,
        mockToken.tokenHash,
        mockToken.tenantId,
      );

      expect(result).toMatchObject({
        id: mockToken.id,
        tokenHash: mockToken.tokenHash,
      });
    });

    it('should return null when token not found', async () => {
      mockDb.query.passwordResetTokens.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findValidPasswordResetToken(mockDb, 'wrong-hash', mockToken.tenantId);

      expect(result).toBeNull();
    });

    it('should return null when token is used', async () => {
      const usedToken = { ...mockToken, usedAt: new Date() };
      mockDb.query.passwordResetTokens.findFirst = vi.fn().mockResolvedValue(usedToken);

      const result = await findValidPasswordResetToken(
        mockDb,
        mockToken.tokenHash,
        mockToken.tenantId,
      );

      expect(result).toBeNull();
    });

    it('should return null when token is expired', async () => {
      const expiredToken = { ...mockToken, expiresAt: new Date('2020-01-01') };
      mockDb.query.passwordResetTokens.findFirst = vi.fn().mockResolvedValue(expiredToken);

      const result = await findValidPasswordResetToken(
        mockDb,
        mockToken.tokenHash,
        mockToken.tenantId,
      );

      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      mockDb.query.passwordResetTokens.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findValidPasswordResetToken(mockDb, mockToken.tokenHash, 'wrong-tenant');

      expect(result).toBeNull();
    });
  });

  describe('markPasswordResetTokenUsed', () => {
    it('should update token usedAt timestamp', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await markPasswordResetTokenUsed(mockDb, mockToken.id);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteAllPasswordResetTokensForUser', () => {
    it('should delete all tokens for user and return count', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        }),
      });

      const result = await deleteAllPasswordResetTokensForUser(
        mockDb,
        mockToken.userId,
        mockToken.tenantId,
      );

      expect(result).toBe(2);
    });

    it('should return 0 when no tokens deleted', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteAllPasswordResetTokensForUser(
        mockDb,
        mockToken.userId,
        mockToken.tenantId,
      );

      expect(result).toBe(0);
    });
  });
});
