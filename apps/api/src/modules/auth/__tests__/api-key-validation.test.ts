import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CredentialStatus } from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';
import { createTestApiKey } from '@the-dmz/shared/testing';

const mockUpdateApiKeyStatus = vi.fn();
const mockUpdateApiKeyStatusWithLastUsed = vi.fn();
const mockGetApiKeyByIdRaw = vi.fn();

vi.mock('../api-key-repo.js', async () => {
  const actual = await vi.importActual('../api-key-repo.js');
  return {
    ...actual,
    getApiKeyByIdRaw: mockGetApiKeyByIdRaw,
    updateApiKeyStatus: mockUpdateApiKeyStatus,
    updateApiKeyStatusWithLastUsed: mockUpdateApiKeyStatusWithLastUsed,
  };
});

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import { validateApiKey } from '../api-key-validation.js';

const mockDb: Record<string, unknown> = {};
const mockKeyId = 'test-key-id';
const mockSecret = 'test-secret';

const buildMockKey = (overrides = {}) => createTestApiKey({ keyId: mockKeyId, ...overrides });

describe('api-key-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
  });

  describe('validateApiKey', () => {
    it('should return invalid when key does not exist', async () => {
      mockGetApiKeyByIdRaw.mockResolvedValue(null);

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.API_KEY_INVALID);
    });

    it('should return invalid when both current and previous secrets are wrong', async () => {
      const key = buildMockKey();
      mockGetApiKeyByIdRaw.mockResolvedValue(key);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValue(false);

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.API_KEY_INVALID);
    });

    it('should return valid with revoked error when key is revoked', async () => {
      const key = buildMockKey({
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: 'test-user',
        revocationReason: 'Test revocation',
      });
      mockGetApiKeyByIdRaw.mockResolvedValue(key);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.API_KEY_REVOKED);
    });

    it('should return valid with expired error when key is expired', async () => {
      const key = buildMockKey({
        status: CredentialStatus.EXPIRED,
        expiresAt: new Date('2026-03-01T00:00:00.000Z'),
      });
      mockGetApiKeyByIdRaw.mockResolvedValue(key);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.API_KEY_EXPIRED);
    });

    it('should return valid with grace expired error when rotation grace period ended', async () => {
      const key = buildMockKey({
        status: CredentialStatus.ROTATING,
        rotationGraceEndsAt: new Date('2026-03-01T00:00:00.000Z'),
      });
      mockGetApiKeyByIdRaw.mockResolvedValue(key);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.API_KEY_ROTATION_GRACE_EXPIRED);
    });

    it('should return valid=true with ROTATING status when using previous secret during grace', async () => {
      const key = buildMockKey({
        status: CredentialStatus.ROTATING,
        secretHash: 'new-hash',
        previousSecretHash: 'old-hash',
        rotationGraceEndsAt: new Date('2026-04-15T00:00:00.000Z'),
      });
      mockGetApiKeyByIdRaw.mockResolvedValue(key);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockImplementation(async (hash: string) => {
        if (hash === 'new-hash') return false;
        if (hash === 'old-hash') return true;
        return false;
      });

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(true);
      expect(result.status).toBe(CredentialStatus.ROTATING);
    });

    it('should return invalid when ROTATING but previous secret is invalid and current is valid', async () => {
      const key = buildMockKey({
        status: CredentialStatus.ROTATING,
        secretHash: 'new-hash',
        previousSecretHash: 'old-hash',
        rotationGraceEndsAt: new Date('2026-04-15T00:00:00.000Z'),
      });
      mockGetApiKeyByIdRaw.mockResolvedValue(key);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockImplementation(async (hash: string) => {
        if (hash === 'new-hash') return true;
        if (hash === 'old-hash') return false;
        return false;
      });

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.API_KEY_INVALID);
    });

    it('should return valid=true for active key', async () => {
      const key = buildMockKey({
        status: CredentialStatus.ACTIVE,
      });
      mockGetApiKeyByIdRaw.mockResolvedValue(key);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const result = await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(result.valid).toBe(true);
      expect(result.status).toBe(CredentialStatus.ACTIVE);
    });

    it('should update lastUsedAt for active keys', async () => {
      const key = buildMockKey({
        status: CredentialStatus.ACTIVE,
      });
      mockGetApiKeyByIdRaw.mockResolvedValue(key);
      mockUpdateApiKeyStatusWithLastUsed.mockResolvedValue(undefined);

      const { default: argon2 } = await import('argon2');
      vi.mocked(argon2.verify).mockResolvedValue(true);

      await validateApiKey(mockDb, mockKeyId, mockSecret);

      expect(mockUpdateApiKeyStatusWithLastUsed).toHaveBeenCalled();
    });
  });
});
