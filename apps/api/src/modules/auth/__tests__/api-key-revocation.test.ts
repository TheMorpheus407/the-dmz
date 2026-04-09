import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CredentialStatus } from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';
import { createTestApiKey } from '@the-dmz/shared/testing';

const mockMapDbToResponse = vi.fn();

vi.mock('../api-key-repo.js', async () => {
  const actual = await vi.importActual('../api-key-repo.js');
  return {
    ...actual,
    mapDbToResponse: mockMapDbToResponse,
  };
});

import { revokeApiKey } from '../api-key-revocation.js';

const mockDb: Record<string, unknown> = {
  select: vi.fn(),
  update: vi.fn(),
};

const mockTenantId = 'test-tenant';
const mockKeyId = 'test-key-id';
const mockRevokedBy = 'test-user';

const buildMockKey = (overrides = {}) =>
  createTestApiKey({ keyId: mockKeyId, tenantId: mockTenantId, ...overrides });

describe('api-key-revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
  });

  describe('revokeApiKey', () => {
    it('should throw NOT_FOUND when key does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        revokeApiKey(mockDb, mockKeyId, { reason: 'Test' }, mockRevokedBy, mockTenantId),
      ).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_NOT_FOUND,
      });
    });

    it('should return existing key if already revoked', async () => {
      const revokedKey = buildMockKey({
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: mockRevokedBy,
        revocationReason: 'First revocation',
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([revokedKey]),
        }),
      });

      mockMapDbToResponse.mockReturnValue({
        keyId: revokedKey.keyId,
        status: CredentialStatus.REVOKED,
      });

      const result = await revokeApiKey(
        mockDb,
        mockKeyId,
        { reason: 'Second revocation' },
        mockRevokedBy,
        mockTenantId,
      );

      expect(result.status).toBe(CredentialStatus.REVOKED);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should set status to REVOKED and clear previousSecretHash', async () => {
      const activeKey = buildMockKey({ status: CredentialStatus.ACTIVE });
      const revokedKey = {
        ...activeKey,
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: mockRevokedBy,
        revocationReason: 'Test reason',
        previousSecretHash: null,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeKey]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([revokedKey]),
          }),
        }),
      });

      mockMapDbToResponse.mockReturnValue({
        keyId: revokedKey.keyId,
        status: CredentialStatus.REVOKED,
      });

      const result = await revokeApiKey(
        mockDb,
        mockKeyId,
        { reason: 'Test reason' },
        mockRevokedBy,
        mockTenantId,
      );

      expect(result.status).toBe(CredentialStatus.REVOKED);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            status: CredentialStatus.REVOKED,
            previousSecretHash: null,
          }),
        }),
      );
    });

    it('should store revocation reason and revokedBy', async () => {
      const activeKey = buildMockKey({ status: CredentialStatus.ACTIVE });
      const revokedKey = {
        ...activeKey,
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: mockRevokedBy,
        revocationReason: 'Test reason',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeKey]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([revokedKey]),
          }),
        }),
      });

      mockMapDbToResponse.mockReturnValue({
        keyId: revokedKey.keyId,
        status: CredentialStatus.REVOKED,
      });

      await revokeApiKey(mockDb, mockKeyId, { reason: 'Test reason' }, mockRevokedBy, mockTenantId);

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            revokedBy: mockRevokedBy,
            revocationReason: 'Test reason',
          }),
        }),
      );
    });
  });
});
