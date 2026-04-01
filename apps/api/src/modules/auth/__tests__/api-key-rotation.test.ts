/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CredentialStatus, CredentialType } from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

const mockGetApiKeyByIdRaw = vi.fn();
const mockMapDbToResponse = vi.fn();
const mockHashSecret = vi.fn();
const mockGenerateSecret = vi.fn();
const mockGetKeyPrefix = vi.fn();

vi.mock('../api-key-repo.js', async () => {
  const actual = await vi.importActual('../api-key-repo.js');
  return {
    ...actual,
    getApiKeyByIdRaw: mockGetApiKeyByIdRaw,
    mapDbToResponse: mockMapDbToResponse,
  };
});

vi.mock('../api-key-crypto.js', () => ({
  hashSecret: (...args: unknown[]) => mockHashSecret(...args),
  generateSecret: (...args: unknown[]) => mockGenerateSecret(...args),
  getKeyPrefix: (...args: unknown[]) => mockGetKeyPrefix(...args),
}));

import { rotateApiKey } from '../api-key-rotation.js';

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
} as any;

const mockTenantId = 'test-tenant';
const mockKeyId = 'test-key-id';

const buildMockKey = (overrides: any = {}) => ({
  id: 'test-id',
  keyId: mockKeyId,
  tenantId: mockTenantId,
  name: 'Test Key',
  type: CredentialType.API_KEY,
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
  createdBy: 'test-user',
  createdAt: new Date(),
  updatedAt: new Date(),
  revokedAt: null,
  revokedBy: null,
  revocationReason: null,
  ...overrides,
});

describe('api-key-rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
  });

  describe('rotateApiKey', () => {
    it('should throw NOT_FOUND when key does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        rotateApiKey(mockDb, mockKeyId, { rotationGracePeriodDays: 7 }, mockTenantId),
      ).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_NOT_FOUND,
      });
    });

    it('should throw REVOKED when key is revoked', async () => {
      const revokedKey = buildMockKey({ status: CredentialStatus.REVOKED });
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([revokedKey]),
        }),
      });

      await expect(
        rotateApiKey(mockDb, mockKeyId, { rotationGracePeriodDays: 7 }, mockTenantId),
      ).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_REVOKED,
      });
    });

    it('should throw ROTATION_IN_PROGRESS when already rotating', async () => {
      const rotatingKey = buildMockKey({ status: CredentialStatus.ROTATING });
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([rotatingKey]),
        }),
      });

      await expect(
        rotateApiKey(mockDb, mockKeyId, { rotationGracePeriodDays: 7 }, mockTenantId),
      ).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_ROTATION_IN_PROGRESS,
      });
    });

    it('should throw EXPIRED when key is expired', async () => {
      const expiredKey = buildMockKey({
        status: CredentialStatus.EXPIRED,
        expiresAt: new Date('2026-03-01T00:00:00.000Z'),
      });
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expiredKey]),
        }),
      });

      await expect(
        rotateApiKey(mockDb, mockKeyId, { rotationGracePeriodDays: 7 }, mockTenantId),
      ).rejects.toMatchObject({
        code: ErrorCodes.API_KEY_EXPIRED,
      });
    });

    it('should return new secret and set status to ROTATING', async () => {
      const activeKey = buildMockKey({ status: CredentialStatus.ACTIVE });
      const updatedKey = {
        ...activeKey,
        status: CredentialStatus.ROTATING,
        previousSecretHash: activeKey.secretHash,
        secretHash: 'new-hash',
        rotationGracePeriodDays: '7',
        rotationGraceEndsAt: new Date('2026-04-08T00:00:00.000Z'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeKey]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedKey]),
          }),
        }),
      });

      mockGetKeyPrefix.mockReturnValue('dmz_ak_');
      mockGenerateSecret.mockReturnValue('new-secret');
      mockHashSecret.mockResolvedValue('new-hash');
      mockMapDbToResponse.mockReturnValue({
        id: updatedKey.id,
        keyId: updatedKey.keyId,
        status: CredentialStatus.ROTATING,
      });

      const result = await rotateApiKey(
        mockDb,
        mockKeyId,
        { rotationGracePeriodDays: 7 },
        mockTenantId,
      );

      expect(result.secret).toBe('new-secret');
      expect(mockMapDbToResponse).toHaveBeenCalledWith(updatedKey);
    });

    it('should preserve previous secret hash for grace period', async () => {
      const activeKey = buildMockKey({ status: CredentialStatus.ACTIVE });
      const updatedKey = {
        ...activeKey,
        status: CredentialStatus.ROTATING,
        previousSecretHash: activeKey.secretHash,
        secretHash: 'new-hash',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeKey]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedKey]),
          }),
        }),
      });

      mockGetKeyPrefix.mockReturnValue('dmz_ak_');
      mockGenerateSecret.mockReturnValue('new-secret');
      mockHashSecret.mockResolvedValue('new-hash');
      mockMapDbToResponse.mockReturnValue({});

      await rotateApiKey(mockDb, mockKeyId, { rotationGracePeriodDays: 7 }, mockTenantId);

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            previousSecretHash: activeKey.secretHash,
          }),
        }),
      );
    });
  });
});
