import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AppError, ErrorCodes } from '../../../shared/middleware/error-handler.js';
import * as mfaService from '../mfa.service.js';

import type { AppConfig } from '../../../config.js';
import type { AuthenticatedUser } from '../auth.types.js';

const createMockRedisClient = () => ({
  status: 'ready' as const,
  connect: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue('PONG'),
  incrementRateLimitKey: vi.fn(),
  incrementHourlyQuotaKey: vi.fn(),
  getValue: vi.fn(),
  setValue: vi.fn(),
  deleteKey: vi.fn(),
  getKeys: vi.fn(),
  quit: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
});

const createMockDb = () => ({
  query: {
    sessions: {
      findFirst: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
});

vi.mock('../../../shared/database/redis.js', () => ({
  getRedisClient: vi.fn(),
}));

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

const createMockConfig = (overrides: Partial<AppConfig> = {}): AppConfig =>
  ({
    MFA_MAX_ATTEMPTS: 5,
    ...overrides,
  }) as AppConfig;

const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser =>
  ({
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    sessionId: 'test-session-id',
    ...overrides,
  }) as AuthenticatedUser;

const createValidChallenge = (
  overrides: Partial<{
    id: string;
    userId: string;
    tenantId: string;
    sessionId: string;
    challenge: string;
    type: 'registration' | 'verification';
    createdAt: Date;
    expiresAt: Date;
    used: boolean;
  }> = {},
): {
  id: string;
  userId: string;
  tenantId: string;
  sessionId: string;
  challenge: string;
  type: 'registration' | 'verification';
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
} => ({
  id: 'test-challenge-id',
  userId: 'test-user-id',
  tenantId: 'test-tenant-id',
  sessionId: 'test-session-id',
  challenge: 'test-challenge-value',
  type: 'verification',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  used: false,
  ...overrides,
});

const serializeChallenge = (challenge: ReturnType<typeof createValidChallenge>): string =>
  JSON.stringify({
    ...challenge,
    createdAt: challenge.createdAt.toISOString(),
    expiresAt: challenge.expiresAt.toISOString(),
  });

describe('MFA WebAuthn Service Error Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyWebauthnAssertion', () => {
    describe('Redis unavailability', () => {
      it('throws INTERNAL_ERROR when Redis client is unavailable', async () => {
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        vi.mocked(getRedisClient).mockReturnValue(null);

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            'test-challenge-id',
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.INTERNAL_ERROR);
          expect((error as AppError).statusCode).toBe(503);
        }
      });
    });

    describe('Challenge validation errors', () => {
      it('throws AUTH_WEBAUTHN_CHALLENGE_EXPIRED when challenge not found', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        mockRedis.getValue.mockResolvedValue(null);

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            'non-existent-challenge',
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });

      it('throws AUTH_WEBAUTHN_CHALLENGE_EXPIRED when challenge already used', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const usedChallenge = createValidChallenge({ used: true });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(usedChallenge));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            usedChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });

      it('throws AUTH_WEBAUTHN_CHALLENGE_EXPIRED when challenge expired', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const expiredChallenge = createValidChallenge({
          expiresAt: new Date(Date.now() - 1000),
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(expiredChallenge));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            expiredChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });

      it('throws AUTH_UNAUTHORIZED when challenge userId does not match', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const challengeWithWrongUser = createValidChallenge({
          userId: 'different-user-id',
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(challengeWithWrongUser));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            challengeWithWrongUser.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
          expect((error as AppError).statusCode).toBe(401);
        }
      });

      it('throws AUTH_UNAUTHORIZED when challenge tenantId does not match', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const challengeWithWrongTenant = createValidChallenge({
          tenantId: 'different-tenant-id',
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(challengeWithWrongTenant));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            challengeWithWrongTenant.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
          expect((error as AppError).statusCode).toBe(401);
        }
      });

      it('throws AUTH_WEBAUTHN_ASSERTION_FAILED when challenge type is registration instead of verification', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const registrationChallenge = createValidChallenge({
          type: 'registration',
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(registrationChallenge));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            registrationChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_ASSERTION_FAILED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });
    });

    describe('MFA lockout', () => {
      it('throws RATE_LIMIT_EXCEEDED when session is locked', async () => {
        const mockRedis = createMockRedisClient();
        const mockDb = createMockDb();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

        const validChallenge = createValidChallenge();
        mockRedis.getValue.mockResolvedValue(serializeChallenge(validChallenge));

        const lockedSession = {
          id: 'test-session-id',
          mfaLockedAt: new Date(),
        };
        mockDb.query.sessions.findFirst.mockResolvedValue(lockedSession);

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'cred-1', counter: 1 },
            validChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
          expect((error as AppError).statusCode).toBe(429);
        }
      });
    });

    describe('Credential not found', () => {
      it('throws AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND when credential does not exist', async () => {
        const mockRedis = createMockRedisClient();
        const mockDb = createMockDb();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

        const validChallenge = createValidChallenge();
        mockRedis.getValue.mockResolvedValue(serializeChallenge(validChallenge));

        const unlockedSession = {
          id: 'test-session-id',
          mfaLockedAt: null,
          mfaFailedAttempts: 0,
        };
        mockDb.query.sessions.findFirst.mockResolvedValue(unlockedSession);

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        });

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.verifyWebauthnAssertion(
            config,
            user,
            { credentialId: 'non-existent-credential', counter: 1 },
            validChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND);
          expect((error as AppError).statusCode).toBe(400);
        }
      });
    });
  });

  describe('registerWebauthnCredential', () => {
    describe('Redis unavailability', () => {
      it('throws INTERNAL_ERROR when Redis client is unavailable', async () => {
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        vi.mocked(getRedisClient).mockReturnValue(null);

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            { credentialId: 'cred-1', publicKey: 'pubkey', counter: 1, transports: [] },
            'challenge-id',
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.INTERNAL_ERROR);
          expect((error as AppError).statusCode).toBe(503);
        }
      });
    });

    describe('Challenge validation errors', () => {
      it('throws AUTH_WEBAUTHN_CHALLENGE_EXPIRED when challenge not found', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        mockRedis.getValue.mockResolvedValue(null);

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            { credentialId: 'cred-1', publicKey: 'pubkey', counter: 1, transports: [] },
            'non-existent-challenge',
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });

      it('throws AUTH_WEBAUTHN_CHALLENGE_EXPIRED when challenge already used', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const usedChallenge = createValidChallenge({ type: 'registration', used: true });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(usedChallenge));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            { credentialId: 'cred-1', publicKey: 'pubkey', counter: 1, transports: [] },
            usedChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });

      it('throws AUTH_WEBAUTHN_CHALLENGE_EXPIRED when challenge expired', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const expiredChallenge = createValidChallenge({
          type: 'registration',
          expiresAt: new Date(Date.now() - 1000),
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(expiredChallenge));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            { credentialId: 'cred-1', publicKey: 'pubkey', counter: 1, transports: [] },
            expiredChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });

      it('throws AUTH_UNAUTHORIZED when challenge userId does not match', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const challengeWithWrongUser = createValidChallenge({
          type: 'registration',
          userId: 'different-user-id',
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(challengeWithWrongUser));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            { credentialId: 'cred-1', publicKey: 'pubkey', counter: 1, transports: [] },
            challengeWithWrongUser.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
          expect((error as AppError).statusCode).toBe(401);
        }
      });

      it('throws AUTH_UNAUTHORIZED when challenge tenantId does not match', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const challengeWithWrongTenant = createValidChallenge({
          type: 'registration',
          tenantId: 'different-tenant-id',
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(challengeWithWrongTenant));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            { credentialId: 'cred-1', publicKey: 'pubkey', counter: 1, transports: [] },
            challengeWithWrongTenant.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
          expect((error as AppError).statusCode).toBe(401);
        }
      });

      it('throws AUTH_WEBAUTHN_REGISTRATION_FAILED when challenge type is verification instead of registration', async () => {
        const mockRedis = createMockRedisClient();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(createMockDb());

        const verificationChallenge = createValidChallenge({
          type: 'verification',
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(verificationChallenge));

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            { credentialId: 'cred-1', publicKey: 'pubkey', counter: 1, transports: [] },
            verificationChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_REGISTRATION_FAILED);
          expect((error as AppError).statusCode).toBe(400);
        }
      });

      it('throws AUTH_WEBAUTHN_CREDENTIAL_EXISTS when credential already registered', async () => {
        const mockRedis = createMockRedisClient();
        const mockDb = createMockDb();
        const { getRedisClient } = await import('../../../shared/database/redis.js');
        const { getDatabaseClient } = await import('../../../shared/database/connection.js');

        vi.mocked(getRedisClient).mockReturnValue(mockRedis);
        vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

        const validRegistrationChallenge = createValidChallenge({
          type: 'registration',
        });
        mockRedis.getValue.mockResolvedValue(serializeChallenge(validRegistrationChallenge));

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 'existing-credential-id' }]),
            }),
          }),
        });

        const config = createMockConfig();
        const user = createMockUser();

        try {
          await mfaService.registerWebauthnCredential(
            config,
            user,
            {
              credentialId: 'existing-credential-id',
              publicKey: 'pubkey',
              counter: 1,
              transports: [],
            },
            validRegistrationChallenge.id,
          );
          expect.fail('Expected AppError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_EXISTS);
          expect((error as AppError).statusCode).toBe(409);
        }
      });
    });
  });
});
