import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AppError, ErrorCodes } from '../../../shared/middleware/error-handler.js';
import * as totpModule from '../totp.js';

import type { AppConfig } from '../../../config.js';
import type { AuthenticatedUser } from '../auth.types.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

const mockDb = () => ({
  query: { sessions: { findFirst: vi.fn() }, users: { findFirst: vi.fn() } },
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
});
const mockConfig = (overrides: Partial<AppConfig> = {}): AppConfig =>
  ({
    MFA_MAX_ATTEMPTS: 5,
    MFA_WINDOW: 1,
    MFA_CODE_LENGTH: 6,
    MFA_ISSUER: 'Test DMZ',
    MFA_BACKUP_CODES: 10,
    JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'test-encryption-key-32-chars!!!',
    ...overrides,
  }) as AppConfig;
const mockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser =>
  ({
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    sessionId: 'test-session-id',
    role: 'user',
    ...overrides,
  }) as AuthenticatedUser;
const mockSession = (
  overrides: Partial<{
    id: string;
    mfaLockedAt: Date | null;
    mfaFailedAttempts: number | null;
  }> = {},
): { id: string; mfaLockedAt: Date | null; mfaFailedAttempts: number | null } => ({
  id: 'test-session-id',
  mfaLockedAt: null,
  mfaFailedAttempts: 0,
  ...overrides,
});
const mockUserRecord = (
  overrides: Partial<{ userId: string; email: string; tenantId: string; role: string }> = {},
): { userId: string; email: string; tenantId: string; role: string } => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  tenantId: 'test-tenant-id',
  role: 'user',
  ...overrides,
});
const mockTotpCredential = (
  overrides: Partial<{
    id: string;
    userId: string;
    tenantId: string;
    encryptedSecret: string;
    type: string;
  }> = {},
): { id: string; userId: string; tenantId: string; encryptedSecret: string; type: string } => ({
  id: 'test-credential-id',
  userId: 'test-user-id',
  tenantId: 'test-tenant-id',
  encryptedSecret: 'mock-encrypted-secret',
  type: 'totp',
  ...overrides,
});
const mockBackupCode = (): {
  id: string;
  userId: string;
  tenantId: string;
  codeHash: string;
  usedAt: Date | null;
} => ({
  id: 'backup-id-1',
  userId: 'test-user-id',
  tenantId: 'test-tenant-id',
  codeHash: '$argon2id$v=19$m=65536,t=3,p=4$encodedhash',
  usedAt: null,
});
const setupDbMock = (
  sessionResult?: unknown,
  userResult?: unknown,
  credResult?: unknown,
  backupResult?: unknown[],
) => {
  const db = mockDb();
  if (sessionResult !== undefined) db.query.sessions.findFirst.mockResolvedValue(sessionResult);
  if (userResult !== undefined) db.query.users.findFirst.mockResolvedValue(userResult);
  if (credResult !== undefined)
    db.select.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValue({ where: vi.fn().mockResolvedValue(credResult ? [credResult] : []) }),
    });
  if (backupResult !== undefined)
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(backupResult) }),
    });
  db.update.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
  });
  return db;
};

describe('TOTP Error Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTotpEnrollment', () => {
    it('throws AUTH_UNAUTHORIZED when user does not exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(undefined, null);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(totpModule.createTotpEnrollment(mockConfig(), mockUser())).rejects.toMatchObject(
        { code: ErrorCodes.AUTH_UNAUTHORIZED, statusCode: 401 },
      );
    });
    it('throws AUTH_MFA_ALREADY_ENABLED when TOTP is already enrolled', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(undefined, mockUserRecord(), mockTotpCredential());
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(totpModule.createTotpEnrollment(mockConfig(), mockUser())).rejects.toMatchObject(
        { code: ErrorCodes.AUTH_MFA_ALREADY_ENABLED, statusCode: 400 },
      );
    });
  });

  describe('verifyTotpEnrollment', () => {
    it('throws RATE_LIMIT_EXCEEDED when session is locked during enrollment', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession({ mfaLockedAt: new Date() }));
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpEnrollment(mockConfig(), mockUser(), {
          code: '123456',
          secret: 'SECRET',
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.RATE_LIMIT_EXCEEDED, statusCode: 429 });
    });
    it('throws AUTH_MFA_INVALID_CODE when TOTP code is wrong', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession({ mfaLockedAt: null, mfaFailedAttempts: 0 }));
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpEnrollment(mockConfig(), mockUser(), {
          code: '000000',
          secret: 'SECRET',
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.AUTH_MFA_INVALID_CODE, statusCode: 400 });
    });
    it('increments mfaFailedAttempts on invalid code', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = mockDb();
      db.query.sessions.findFirst.mockResolvedValue(mockSession({ mfaFailedAttempts: 2 }));
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
      });
      db.update.mockReturnValue(updateMock);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpEnrollment(mockConfig(), mockUser(), {
          code: '000000',
          secret: 'SECRET',
        }),
      ).rejects.toThrow(AppError);
      expect(updateMock).toHaveBeenCalledWith(expect.anything(), { mfaFailedAttempts: 3 });
    });
    it('locks session after max failed attempts', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = mockDb();
      db.query.sessions.findFirst.mockResolvedValue(mockSession({ mfaFailedAttempts: 4 }));
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
      });
      db.update.mockReturnValue(updateMock);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpEnrollment(mockConfig({ MFA_MAX_ATTEMPTS: 5 }), mockUser(), {
          code: '000000',
          secret: 'SECRET',
        }),
      ).rejects.toThrow(AppError);
      expect(updateMock).toHaveBeenCalledWith(expect.anything(), {
        mfaFailedAttempts: 5,
        mfaLockedAt: expect.any(Date),
      });
    });
  });

  describe('verifyTotpCode', () => {
    it('throws RATE_LIMIT_EXCEEDED when session is locked during verification', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession({ mfaLockedAt: new Date() }));
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpCode(mockConfig(), mockUser(), '123456'),
      ).rejects.toMatchObject({ code: ErrorCodes.RATE_LIMIT_EXCEEDED, statusCode: 429 });
    });
    it('throws AUTH_MFA_NOT_ENABLED when no TOTP credential exists', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, null);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpCode(mockConfig(), mockUser(), '123456'),
      ).rejects.toMatchObject({ code: ErrorCodes.AUTH_MFA_NOT_ENABLED, statusCode: 400 });
    });
    it('throws AUTH_MFA_INVALID_CODE when TOTP code is wrong', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, mockTotpCredential());
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpCode(mockConfig(), mockUser(), '000000'),
      ).rejects.toMatchObject({ code: ErrorCodes.AUTH_MFA_INVALID_CODE, statusCode: 400 });
    });
    it('increments mfaFailedAttempts on invalid verification code', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = mockDb();
      db.query.sessions.findFirst.mockResolvedValue(mockSession({ mfaFailedAttempts: 1 }));
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([mockTotpCredential()]) }),
      });
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
      });
      db.update.mockReturnValue(updateMock);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(totpModule.verifyTotpCode(mockConfig(), mockUser(), '000000')).rejects.toThrow(
        AppError,
      );
      expect(updateMock).toHaveBeenCalledWith(expect.anything(), { mfaFailedAttempts: 2 });
    });
    it('locks session after max failed verification attempts', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = mockDb();
      db.query.sessions.findFirst.mockResolvedValue(mockSession({ mfaFailedAttempts: 4 }));
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([mockTotpCredential()]) }),
      });
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
      });
      db.update.mockReturnValue(updateMock);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyTotpCode(mockConfig({ MFA_MAX_ATTEMPTS: 5 }), mockUser(), '000000'),
      ).rejects.toThrow(AppError);
      expect(updateMock).toHaveBeenCalledWith(expect.anything(), {
        mfaFailedAttempts: 5,
        mfaLockedAt: expect.any(Date),
      });
    });
  });

  describe('verifyBackupCode', () => {
    it('throws RATE_LIMIT_EXCEEDED when session is locked during backup code verification', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession({ mfaLockedAt: new Date() }));
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyBackupCode(mockConfig(), mockUser(), 'ABCD1234'),
      ).rejects.toMatchObject({ code: ErrorCodes.RATE_LIMIT_EXCEEDED, statusCode: 429 });
    });
    it('throws AUTH_MFA_NOT_ENABLED when no backup codes exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, undefined, []);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyBackupCode(mockConfig(), mockUser(), 'ABCD1234'),
      ).rejects.toMatchObject({
        code: ErrorCodes.AUTH_MFA_NOT_ENABLED,
        statusCode: 400,
        message: 'No valid backup codes available',
      });
    });
    it('throws AUTH_MFA_INVALID_CODE when backup code does not match', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, undefined, [mockBackupCode()]);
      vi.stubGlobal('crypto', {
        ...globalThis.crypto,
        getRandomValues: vi.fn().mockReturnValue(new Uint8Array(8)),
      });
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyBackupCode(mockConfig(), mockUser(), 'WRONGCODE'),
      ).rejects.toMatchObject({
        code: ErrorCodes.AUTH_MFA_INVALID_CODE,
        statusCode: 400,
        message: 'Invalid backup code',
      });
    });
    it('increments mfaFailedAttempts on invalid backup code', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = mockDb();
      db.query.sessions.findFirst.mockResolvedValue(mockSession({ mfaFailedAttempts: 1 }));
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([mockBackupCode()]) }),
      });
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
      });
      db.update.mockReturnValue(updateMock);
      vi.stubGlobal('crypto', {
        ...globalThis.crypto,
        getRandomValues: vi.fn().mockReturnValue(new Uint8Array(8)),
      });
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyBackupCode(mockConfig(), mockUser(), 'WRONGCODE'),
      ).rejects.toThrow(AppError);
      expect(updateMock).toHaveBeenCalledWith(expect.anything(), { mfaFailedAttempts: 2 });
    });
    it('locks session after max failed backup code attempts', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = mockDb();
      db.query.sessions.findFirst.mockResolvedValue(mockSession({ mfaFailedAttempts: 4 }));
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([mockBackupCode()]) }),
      });
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
      });
      db.update.mockReturnValue(updateMock);
      vi.stubGlobal('crypto', {
        ...globalThis.crypto,
        getRandomValues: vi.fn().mockReturnValue(new Uint8Array(8)),
      });
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.verifyBackupCode(mockConfig({ MFA_MAX_ATTEMPTS: 5 }), mockUser(), 'WRONGCODE'),
      ).rejects.toThrow(AppError);
      expect(updateMock).toHaveBeenCalledWith(expect.anything(), {
        mfaFailedAttempts: 5,
        mfaLockedAt: expect.any(Date),
      });
    });
  });

  describe('disableTotp', () => {
    it('throws AUTH_UNAUTHORIZED when user does not exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(undefined, null);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(totpModule.disableTotp(mockConfig(), mockUser())).rejects.toMatchObject({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        statusCode: 401,
      });
    });
    it('throws AUTH_FORBIDDEN when super-admin attempts to disable TOTP', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(undefined, mockUserRecord({ role: 'super-admin' }));
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      await expect(
        totpModule.disableTotp(mockConfig(), mockUser({ role: 'super-admin' })),
      ).rejects.toMatchObject({
        code: ErrorCodes.AUTH_FORBIDDEN,
        statusCode: 403,
        message: 'MFA cannot be disabled for Super Admin accounts',
      });
    });
  });

  describe('hasTotpEnabled', () => {
    it('returns true when TOTP credential exists', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, mockTotpCredential());
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      expect(await totpModule.hasTotpEnabled(mockConfig(), mockUser())).toBe(true);
    });
    it('returns false when no TOTP credential exists', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, null);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      expect(await totpModule.hasTotpEnabled(mockConfig(), mockUser())).toBe(false);
    });
  });

  describe('getRemainingBackupCodes', () => {
    it('returns count of unused backup codes', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, undefined, [
        { id: 'backup-1', usedAt: null },
        { id: 'backup-2', usedAt: null },
        { id: 'backup-3', usedAt: new Date() },
      ]);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      expect(await totpModule.getRemainingBackupCodes(mockConfig(), mockUser())).toBe(2);
    });
    it('returns 0 when no backup codes exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = setupDbMock(mockSession(), undefined, undefined, []);
      vi.mocked(getDatabaseClient).mockReturnValue(db);
      expect(await totpModule.getRemainingBackupCodes(mockConfig(), mockUser())).toBe(0);
    });
  });
});
