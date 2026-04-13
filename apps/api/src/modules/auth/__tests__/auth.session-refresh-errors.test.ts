import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionBindingMode } from '@the-dmz/shared/auth/session-policy.js';
import { ErrorCodes } from '@the-dmz/shared';

import {
  InvalidCredentialsError,
  SessionExpiredError,
  SessionIdleTimeoutError,
  SessionAbsoluteTimeoutError,
  SessionBindingViolationError,
} from '../auth.errors.js';
import { refresh } from '../auth.session.service.js';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../auth.repo.js', () => ({
  findSessionByTokenHash: vi.fn(),
  findUserById: vi.fn(),
  deleteSession: vi.fn(),
  createSession: vi.fn(),
  updateSessionLastActive: vi.fn(),
  findActiveSessionWithContext: vi.fn(),
}));

vi.mock('../auth-crypto.js', () => ({
  hashToken: vi.fn(),
  generateTokens: vi.fn(),
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
}));

vi.mock('../jwt-keys.service.js', () => ({
  verifyJWT: vi.fn(),
}));

const mockConfig = {
  TOKEN_HASH_SALT: 'test-salt',
  JWT_ISSUER: 'https://test-issuer.local',
  JWT_AUDIENCE: 'test-api',
} as const;

describe('refresh() error paths', () => {
  let mockDb: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDb = vi.fn();
    vi.clearAllMocks();
  });

  describe('session not found', () => {
    it('throws InvalidCredentialsError when session not found by token hash', async () => {
      const { findSessionByTokenHash } = await import('../auth.repo.js');
      vi.mocked(findSessionByTokenHash).mockResolvedValue(null);

      await expect(refresh(mockConfig, 'invalid-token')).rejects.toThrow(InvalidCredentialsError);
    });

    it('does not call deleteSession when session not found', async () => {
      const { findSessionByTokenHash, deleteSession } = await import('../auth.repo.js');
      vi.mocked(findSessionByTokenHash).mockResolvedValue(null);

      await expect(refresh(mockConfig, 'invalid-token')).rejects.toThrow();
      expect(deleteSession).not.toHaveBeenCalled();
    });
  });

  describe('session expired', () => {
    it('throws SessionExpiredError when session expiresAt is in past', async () => {
      const { findSessionByTokenHash } = await import('../auth.repo.js');
      const expiredSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(expiredSession);

      await expect(refresh(mockConfig, 'expired-token')).rejects.toThrow(SessionExpiredError);
    });

    it('deletes session when session is expired', async () => {
      const { findSessionByTokenHash, deleteSession } = await import('../auth.repo.js');
      const expiredSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(expiredSession);

      await expect(refresh(mockConfig, 'expired-token')).rejects.toThrow();
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });
  });

  describe('user not found or inactive', () => {
    it('throws InvalidCredentialsError when user not found', async () => {
      const { findSessionByTokenHash, findUserById } = await import('../auth.repo.js');
      const validSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(validSession);
      vi.mocked(findUserById).mockResolvedValue(null);

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow(InvalidCredentialsError);
    });

    it('throws InvalidCredentialsError when user is inactive', async () => {
      const { findSessionByTokenHash, findUserById } = await import('../auth.repo.js');
      const validSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(validSession);
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: false,
      });

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow(InvalidCredentialsError);
    });

    it('does not delete session when user not found', async () => {
      const { findSessionByTokenHash, findUserById, deleteSession } =
        await import('../auth.repo.js');
      const validSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(validSession);
      vi.mocked(findUserById).mockResolvedValue(null);

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow();
      expect(deleteSession).not.toHaveBeenCalled();
    });
  });

  describe('tenant status checks', () => {
    const createValidSessionAndUser = async () => {
      const { findSessionByTokenHash, findUserById } = await import('../auth.repo.js');
      const validSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(validSession);
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: true,
      });
      return validSession;
    };

    it('throws AppError with TENANT_INACTIVE when tenant is suspended', async () => {
      const { deleteSession } = await import('../auth.repo.js');
      await createValidSessionAndUser();

      const mockTenantQuery = vi.fn().mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          tenantId: 'tenant-123',
          status: 'SUSPENDED',
          settings: {},
        }),
      });
      vi.mocked(mockDb).mockReturnValue({
        query: {
          tenants: mockTenantQuery(),
        },
      } as unknown as ReturnType<typeof mockDb>);

      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Tenant is SUSPENDED'),
          statusCode: 403,
        }),
      );
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });

    it('throws AppError with TENANT_INACTIVE when tenant is deactivated', async () => {
      const { deleteSession } = await import('../auth.repo.js');
      await createValidSessionAndUser();

      const mockTenantQuery = vi.fn().mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          tenantId: 'tenant-123',
          status: 'DEACTIVATED',
          settings: {},
        }),
      });
      vi.mocked(mockDb).mockReturnValue({
        query: {
          tenants: mockTenantQuery(),
        },
      } as unknown as ReturnType<typeof mockDb>);

      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Tenant is DEACTIVATED'),
          statusCode: 403,
        }),
      );
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });
  });

  describe('session timeout checks', () => {
    beforeEach(async () => {
      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      const mockTenantQuery = vi.fn().mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          tenantId: 'tenant-123',
          status: 'ACTIVE',
          settings: {},
        }),
      });
      vi.mocked(mockDb).mockReturnValue({
        query: {
          tenants: mockTenantQuery(),
        },
      } as unknown as ReturnType<typeof mockDb>);

      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );
    });

    it('throws SessionIdleTimeoutError when idle timeout exceeded', async () => {
      const { findSessionByTokenHash } = await import('../auth.repo.js');
      const sessionCreatedAt = new Date(Date.now() - 60000);
      const sessionWithOldLastActive = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: sessionCreatedAt,
        lastActiveAt: new Date(Date.now() - 1000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(sessionWithOldLastActive);

      const { deleteSession } = await import('../auth.repo.js');

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow(SessionIdleTimeoutError);
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });

    it('throws SessionAbsoluteTimeoutError when absolute timeout exceeded', async () => {
      const { findSessionByTokenHash } = await import('../auth.repo.js');
      const sessionCreatedAt = new Date(Date.now() - 1000);
      const sessionWithOldCreatedAt = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: sessionCreatedAt,
        lastActiveAt: new Date(Date.now() - 1000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(sessionWithOldCreatedAt);

      const { deleteSession } = await import('../auth.repo.js');

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow(SessionAbsoluteTimeoutError);
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });
  });

  describe('session binding violation', () => {
    const createValidSessionAndUser = async () => {
      const { findSessionByTokenHash, findUserById } = await import('../auth.repo.js');
      const validSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(validSession);
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: true,
      });
      return validSession;
    };

    beforeEach(async () => {
      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      const mockTenantQuery = vi.fn().mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          tenantId: 'tenant-123',
          status: 'ACTIVE',
          settings: {
            sessionPolicy: {
              idleTimeoutMinutes: 30,
              absoluteTimeoutMinutes: 1440,
              sessionBindingMode: SessionBindingMode.IP,
            },
          },
        }),
      });
      vi.mocked(mockDb).mockReturnValue({
        query: {
          tenants: mockTenantQuery(),
        },
      } as unknown as ReturnType<typeof mockDb>);

      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );
    });

    it('throws SessionBindingViolationError when IP address does not match', async () => {
      const { findActiveSessionWithContext, deleteSession } = await import('../auth.repo.js');
      await createValidSessionAndUser();

      vi.mocked(findActiveSessionWithContext).mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
        ipAddress: '192.168.1.1',
        userAgent: null,
        deviceFingerprint: null,
      });

      await expect(
        refresh(mockConfig, 'valid-token', { ipAddress: '192.168.1.99' }),
      ).rejects.toThrow(SessionBindingViolationError);
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });

    it('throws SessionBindingViolationError when device fingerprint does not match', async () => {
      const { findActiveSessionWithContext, deleteSession } = await import('../auth.repo.js');
      await createValidSessionAndUser();

      vi.mocked(findActiveSessionWithContext).mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 60000),
        lastActiveAt: new Date(Date.now() - 60000),
        ipAddress: null,
        userAgent: null,
        deviceFingerprint: 'device-fp-123',
      });

      await expect(
        refresh(mockConfig, 'valid-token', { deviceFingerprint: 'device-fp-456' }),
      ).rejects.toThrow(SessionBindingViolationError);
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });

    it('skips binding validation when findActiveSessionWithContext returns null', async () => {
      const { findActiveSessionWithContext, deleteSession, createSession } =
        await import('../auth.repo.js');
      const { generateTokens: generateTokensCrypto } = await import('../auth-crypto.js');
      await createValidSessionAndUser();

      vi.mocked(findActiveSessionWithContext).mockResolvedValue(null);
      vi.mocked(generateTokensCrypto).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });
      vi.mocked(createSession).mockResolvedValue({
        id: 'new-session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(),
        lastActiveAt: new Date(),
        ipAddress: null,
        userAgent: null,
        deviceFingerprint: null,
      });

      const result = await refresh(mockConfig, 'valid-token');
      expect(result).toMatchObject({
        sessionId: 'new-session-123',
        oldSessionId: 'session-123',
        expiresAt: expect.any(Date),
      });
      expect(deleteSession).not.toHaveBeenCalled();
    });
  });

  describe('max session duration check', () => {
    it('throws AppError with AUTH_SESSION_EXPIRED when session createdAt too old for role', async () => {
      const { findSessionByTokenHash, findUserById, deleteSession } =
        await import('../auth.repo.js');
      const { getDatabaseClient } = await import('../../shared/database/connection.js');

      const oldSession = {
        id: 'session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(Date.now() - 1000),
        lastActiveAt: new Date(Date.now() - 1000),
      };
      vi.mocked(findSessionByTokenHash).mockResolvedValue(oldSession);
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'super_admin',
        isActive: true,
      });

      const mockTenantQuery = vi.fn().mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          tenantId: 'tenant-123',
          status: 'ACTIVE',
          settings: {
            sessionPolicy: {
              idleTimeoutMinutes: 30,
              absoluteTimeoutMinutes: 240,
              sessionBindingMode: SessionBindingMode.NONE,
            },
          },
        }),
      });
      vi.mocked(mockDb).mockReturnValue({
        query: {
          tenants: mockTenantQuery(),
        },
      } as unknown as ReturnType<typeof mockDb>);
      vi.mocked(getDatabaseClient).mockReturnValue(
        mockDb as unknown as ReturnType<typeof getDatabaseClient>,
      );

      await expect(refresh(mockConfig, 'valid-token')).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCodes.AUTH_SESSION_EXPIRED,
          statusCode: 401,
          message: expect.stringContaining('super_admin'),
        }),
      );
      expect(deleteSession).toHaveBeenCalledWith(mockDb, 'session-123');
    });
  });
});
