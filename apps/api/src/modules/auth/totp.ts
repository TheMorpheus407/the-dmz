import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

import { eq, and, isNull } from 'drizzle-orm';
import * as OTPAuth from 'otpauth';
import argon2 from 'argon2';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
import { mfaCredentials as mfaCredentialsTable } from '../../db/schema/auth/mfa-credentials.js';
import { backupCodes as backupCodesTable } from '../../db/schema/auth/backup-codes.js';
import { users } from '../../shared/database/schema/users.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import type { AppConfig } from '../../config.js';
import type { AuthenticatedUser } from './auth.types.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

const DEFAULT_ISSUER = 'The DMZ';
const DEFAULT_CODE_LENGTH = 6;
const DEFAULT_PERIOD = 30;
const DEFAULT_WINDOW = 1;
const BACKUP_CODE_COUNT = 10;

const deriveKey = (encryptionKey: string, salt: Buffer): Buffer => {
  return scryptSync(encryptionKey, salt, 32);
};

const encryptSecret = (secret: string, encryptionKey: string): string => {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(encryptionKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${salt.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decryptSecret = (encryptedData: string, encryptionKey: string): string => {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new AppError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Invalid encrypted secret format',
      statusCode: 500,
    });
  }

  const saltB64 = parts[0] ?? '';
  const ivB64 = parts[1] ?? '';
  const authTagB64 = parts[2] ?? '';
  const encryptedB64 = parts[3] ?? '';

  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const key = deriveKey(encryptionKey, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

const generateBackupCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const hashBackupCode = async (code: string): Promise<string> => {
  return argon2.hash(code, {
    type: argon2.argon2id,
    hashLength: 32,
  });
};

export interface TotpEnrollment {
  secret: string;
  qrCode: string;
  otpauthUri: string;
}

export interface BackupCodesResult {
  codes: string[];
}

const getEncryptionKey = (config: AppConfig): string => {
  return config.JWT_PRIVATE_KEY_ENCRYPTION_KEY;
};

export const createTotpEnrollment = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<TotpEnrollment> => {
  const db = getDatabaseClient(config);

  const userRecord = await db.query.users.findFirst({
    where: and(eq(users.userId, user.userId), eq(users.tenantId, user.tenantId)),
  });

  if (!userRecord) {
    throw new AppError({
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      message: 'User not found',
      statusCode: 401,
    });
  }

  const existingTotp = await db
    .select()
    .from(mfaCredentialsTable)
    .where(
      and(
        eq(mfaCredentialsTable.userId, user.userId),
        eq(mfaCredentialsTable.tenantId, user.tenantId),
        eq(mfaCredentialsTable.type, 'totp'),
      ),
    );

  if (existingTotp.length > 0) {
    throw new AppError({
      code: ErrorCodes.AUTH_MFA_ALREADY_ENABLED,
      message: 'TOTP is already enabled for this user',
      statusCode: 400,
    });
  }

  const issuer = config.MFA_ISSUER || DEFAULT_ISSUER;
  const totp = new OTPAuth.TOTP({
    issuer,
    label: userRecord.email,
    algorithm: 'SHA1',
    digits: config.MFA_CODE_LENGTH || DEFAULT_CODE_LENGTH,
    period: DEFAULT_PERIOD,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const secret = totp.secret.base32;
  const otpauthUri = totp.toString();

  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;

  return {
    secret,
    qrCode,
    otpauthUri,
  };
};

export const verifyTotpEnrollment = async (
  config: AppConfig,
  user: AuthenticatedUser,
  data: {
    code: string;
    secret: string;
    name?: string;
  },
): Promise<{ success: boolean }> => {
  const db = getDatabaseClient(config);

  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, user.sessionId),
  });

  if (session?.mfaLockedAt) {
    const lockoutDurationMs = (config.MFA_MAX_ATTEMPTS || 10) * 60 * 1000;
    const lockoutExpiresAt = new Date(session.mfaLockedAt.getTime() + lockoutDurationMs);
    if (new Date() < lockoutExpiresAt) {
      throw new AppError({
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'MFA temporarily locked due to too many failed attempts. Try again later.',
        statusCode: 429,
      });
    }
  }

  const totp = new OTPAuth.TOTP({
    issuer: config.MFA_ISSUER || DEFAULT_ISSUER,
    algorithm: 'SHA1',
    digits: config.MFA_CODE_LENGTH || DEFAULT_CODE_LENGTH,
    period: DEFAULT_PERIOD,
    secret: OTPAuth.Secret.fromBase32(data.secret),
  });

  const window = config.MFA_WINDOW || DEFAULT_WINDOW;
  const delta = totp.validate({ token: data.code, window });

  if (delta === null) {
    const failedAttempts = session?.mfaFailedAttempts ?? 0;
    const newFailedAttempts = failedAttempts + 1;
    const maxAttempts = config.MFA_MAX_ATTEMPTS || 10;

    if (newFailedAttempts >= maxAttempts) {
      await db
        .update(sessionsTable)
        .set({
          mfaFailedAttempts: newFailedAttempts,
          mfaLockedAt: new Date(),
        })
        .where(eq(sessionsTable.id, user.sessionId));
    } else {
      await db
        .update(sessionsTable)
        .set({
          mfaFailedAttempts: newFailedAttempts,
        })
        .where(eq(sessionsTable.id, user.sessionId));
    }

    throw new AppError({
      code: ErrorCodes.AUTH_MFA_INVALID_CODE,
      message: 'Invalid TOTP code',
      statusCode: 400,
    });
  }

  const encryptionKey = getEncryptionKey(config);
  const encryptedSecret = encryptSecret(data.secret, encryptionKey);

  await db.insert(mfaCredentialsTable).values({
    tenantId: user.tenantId,
    userId: user.userId,
    sessionId: user.sessionId,
    type: 'totp',
    encryptedSecret,
    name: data.name || 'Authenticator App',
  });

  await db
    .update(sessionsTable)
    .set({
      mfaFailedAttempts: null,
      mfaLockedAt: null,
    })
    .where(eq(sessionsTable.id, user.sessionId));

  return { success: true };
};

export const verifyTotpCode = async (
  config: AppConfig,
  user: AuthenticatedUser,
  code: string,
): Promise<{ success: boolean; mfaVerifiedAt: Date; method: 'totp' }> => {
  const db = getDatabaseClient(config);

  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, user.sessionId),
  });

  if (session?.mfaLockedAt) {
    const lockoutDurationMs = (config.MFA_MAX_ATTEMPTS || 10) * 60 * 1000;
    const lockoutExpiresAt = new Date(session.mfaLockedAt.getTime() + lockoutDurationMs);
    if (new Date() < lockoutExpiresAt) {
      throw new AppError({
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'MFA temporarily locked due to too many failed attempts. Try again later.',
        statusCode: 429,
      });
    }
  }

  const credentials = await db
    .select()
    .from(mfaCredentialsTable)
    .where(
      and(
        eq(mfaCredentialsTable.userId, user.userId),
        eq(mfaCredentialsTable.tenantId, user.tenantId),
        eq(mfaCredentialsTable.type, 'totp'),
      ),
    );

  if (credentials.length === 0) {
    throw new AppError({
      code: ErrorCodes.AUTH_MFA_NOT_ENABLED,
      message: 'TOTP is not enabled for this user',
      statusCode: 400,
    });
  }

  const credential = credentials[0]!;
  const encryptionKey = getEncryptionKey(config);
  const decryptedSecret = decryptSecret(credential.encryptedSecret, encryptionKey);

  const totp = new OTPAuth.TOTP({
    issuer: config.MFA_ISSUER || DEFAULT_ISSUER,
    algorithm: 'SHA1',
    digits: config.MFA_CODE_LENGTH || DEFAULT_CODE_LENGTH,
    period: DEFAULT_PERIOD,
    secret: OTPAuth.Secret.fromBase32(decryptedSecret),
  });

  const window = config.MFA_WINDOW || DEFAULT_WINDOW;
  const delta = totp.validate({ token: code, window });

  if (delta === null) {
    const failedAttempts = session?.mfaFailedAttempts ?? 0;
    const newFailedAttempts = failedAttempts + 1;
    const maxAttempts = config.MFA_MAX_ATTEMPTS || 10;

    if (newFailedAttempts >= maxAttempts) {
      await db
        .update(sessionsTable)
        .set({
          mfaFailedAttempts: newFailedAttempts,
          mfaLockedAt: new Date(),
        })
        .where(eq(sessionsTable.id, user.sessionId));
    } else {
      await db
        .update(sessionsTable)
        .set({
          mfaFailedAttempts: newFailedAttempts,
        })
        .where(eq(sessionsTable.id, user.sessionId));
    }

    throw new AppError({
      code: ErrorCodes.AUTH_MFA_INVALID_CODE,
      message: 'Invalid TOTP code',
      statusCode: 400,
    });
  }

  const mfaVerifiedAt = new Date();

  await db
    .update(sessionsTable)
    .set({
      mfaVerifiedAt,
      mfaMethod: 'totp',
      mfaFailedAttempts: null,
      mfaLockedAt: null,
    })
    .where(eq(sessionsTable.id, user.sessionId));

  await db
    .update(mfaCredentialsTable)
    .set({
      lastUsedAt: mfaVerifiedAt,
      updatedAt: mfaVerifiedAt,
    })
    .where(eq(mfaCredentialsTable.id, credential.id));

  return { success: true, mfaVerifiedAt, method: 'totp' };
};

export const verifyBackupCode = async (
  config: AppConfig,
  user: AuthenticatedUser,
  code: string,
): Promise<{ success: boolean; mfaVerifiedAt: Date; method: 'backup' }> => {
  const db = getDatabaseClient(config);

  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, user.sessionId),
  });

  if (session?.mfaLockedAt) {
    const lockoutDurationMs = (config.MFA_MAX_ATTEMPTS || 10) * 60 * 1000;
    const lockoutExpiresAt = new Date(session.mfaLockedAt.getTime() + lockoutDurationMs);
    if (new Date() < lockoutExpiresAt) {
      throw new AppError({
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'MFA temporarily locked due to too many failed attempts. Try again later.',
        statusCode: 429,
      });
    }
  }

  const validCodes = await db
    .select()
    .from(backupCodesTable)
    .where(
      and(
        eq(backupCodesTable.userId, user.userId),
        eq(backupCodesTable.tenantId, user.tenantId),
        isNull(backupCodesTable.usedAt),
      ),
    );

  if (validCodes.length === 0) {
    throw new AppError({
      code: ErrorCodes.AUTH_MFA_NOT_ENABLED,
      message: 'No valid backup codes available',
      statusCode: 400,
    });
  }

  const codeHash = await hashBackupCode(code);

  const matchingCode = validCodes.find((c) => c.codeHash === codeHash);

  if (!matchingCode) {
    const failedAttempts = session?.mfaFailedAttempts ?? 0;
    const newFailedAttempts = failedAttempts + 1;
    const maxAttempts = config.MFA_MAX_ATTEMPTS || 10;

    if (newFailedAttempts >= maxAttempts) {
      await db
        .update(sessionsTable)
        .set({
          mfaFailedAttempts: newFailedAttempts,
          mfaLockedAt: new Date(),
        })
        .where(eq(sessionsTable.id, user.sessionId));
    } else {
      await db
        .update(sessionsTable)
        .set({
          mfaFailedAttempts: newFailedAttempts,
        })
        .where(eq(sessionsTable.id, user.sessionId));
    }

    throw new AppError({
      code: ErrorCodes.AUTH_MFA_INVALID_CODE,
      message: 'Invalid backup code',
      statusCode: 400,
    });
  }

  const mfaVerifiedAt = new Date();

  await db
    .update(backupCodesTable)
    .set({ usedAt: mfaVerifiedAt })
    .where(eq(backupCodesTable.id, matchingCode.id));

  await db
    .update(sessionsTable)
    .set({
      mfaVerifiedAt,
      mfaMethod: 'backup',
      mfaFailedAttempts: null,
      mfaLockedAt: null,
    })
    .where(eq(sessionsTable.id, user.sessionId));

  return { success: true, mfaVerifiedAt, method: 'backup' };
};

export const generateBackupCodes = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<BackupCodesResult> => {
  const db = getDatabaseClient(config);

  await db
    .delete(backupCodesTable)
    .where(
      and(eq(backupCodesTable.userId, user.userId), eq(backupCodesTable.tenantId, user.tenantId)),
    );

  const codes: string[] = [];
  for (let i = 0; i < (config.MFA_BACKUP_CODES || BACKUP_CODE_COUNT); i++) {
    const code = generateBackupCode();
    codes.push(code);
    const codeHash = await hashBackupCode(code);

    await db.insert(backupCodesTable).values({
      tenantId: user.tenantId,
      userId: user.userId,
      codeHash,
    });
  }

  return { codes };
};

export const getRemainingBackupCodes = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<number> => {
  const db = getDatabaseClient(config);

  const result = await db
    .select({ id: backupCodesTable.id })
    .from(backupCodesTable)
    .where(
      and(
        eq(backupCodesTable.userId, user.userId),
        eq(backupCodesTable.tenantId, user.tenantId),
        isNull(backupCodesTable.usedAt),
      ),
    );

  return result.length;
};

export const disableTotp = async (config: AppConfig, user: AuthenticatedUser): Promise<void> => {
  const db = getDatabaseClient(config);

  const userRecord = await db.query.users.findFirst({
    where: and(eq(users.userId, user.userId), eq(users.tenantId, user.tenantId)),
  });

  if (!userRecord) {
    throw new AppError({
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      message: 'User not found',
      statusCode: 401,
    });
  }

  if (userRecord.role === 'super-admin') {
    throw new AppError({
      code: ErrorCodes.AUTH_FORBIDDEN,
      message: 'MFA cannot be disabled for Super Admin accounts',
      statusCode: 403,
    });
  }

  await db
    .delete(mfaCredentialsTable)
    .where(
      and(
        eq(mfaCredentialsTable.userId, user.userId),
        eq(mfaCredentialsTable.tenantId, user.tenantId),
        eq(mfaCredentialsTable.type, 'totp'),
      ),
    );

  await db
    .delete(backupCodesTable)
    .where(
      and(eq(backupCodesTable.userId, user.userId), eq(backupCodesTable.tenantId, user.tenantId)),
    );
};

export const getMfaCredentials = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<
  Array<{
    id: string;
    type: string;
    name: string | null;
    createdAt: Date;
    lastUsedAt: Date | null;
  }>
> => {
  const db = getDatabaseClient(config);

  const credentials = await db
    .select({
      id: mfaCredentialsTable.id,
      type: mfaCredentialsTable.type,
      name: mfaCredentialsTable.name,
      createdAt: mfaCredentialsTable.createdAt,
      lastUsedAt: mfaCredentialsTable.lastUsedAt,
    })
    .from(mfaCredentialsTable)
    .where(
      and(
        eq(mfaCredentialsTable.userId, user.userId),
        eq(mfaCredentialsTable.tenantId, user.tenantId),
      ),
    );

  return credentials;
};

export const hasTotpEnabled = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const result = await db
    .select({ id: mfaCredentialsTable.id })
    .from(mfaCredentialsTable)
    .where(
      and(
        eq(mfaCredentialsTable.userId, user.userId),
        eq(mfaCredentialsTable.tenantId, user.tenantId),
        eq(mfaCredentialsTable.type, 'totp'),
      ),
    )
    .limit(1);

  return result.length > 0;
};

export const hasWebauthnEnabled = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const result = await db
    .select({ id: mfaCredentialsTable.id })
    .from(mfaCredentialsTable)
    .where(
      and(
        eq(mfaCredentialsTable.userId, user.userId),
        eq(mfaCredentialsTable.tenantId, user.tenantId),
        eq(mfaCredentialsTable.type, 'webauthn'),
      ),
    )
    .limit(1);

  return result.length > 0;
};

export const getMfaEnrollmentStatus = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<{
  totpEnabled: boolean;
  webauthnEnabled: boolean;
  backupCodesRemaining: number;
}> => {
  const [totpEnabled, webauthnEnabled, backupCodesRemaining] = await Promise.all([
    hasTotpEnabled(config, user),
    hasWebauthnEnabled(config, user),
    getRemainingBackupCodes(config, user),
  ]);

  return {
    totpEnabled,
    webauthnEnabled,
    backupCodesRemaining,
  };
};
