import { getTenantRecoveryPolicy, generateResetToken } from '@the-dmz/shared/contracts';

import { getDatabaseClient } from '../../shared/database/connection.js';

import { resolveTenantSessionPolicy } from './session-policy.service.js';
import {
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  deleteAllPasswordResetTokensForUser,
  updateUserPassword,
  deleteAllSessionsByTenantId,
  findUserByEmailForPasswordReset,
  createPasswordResetToken,
} from './auth.repo.js';
import {
  hashToken,
  hashPassword,
  validatePasswordAgainstPolicy,
  screenPasswordForCompromise,
} from './auth.crypto.js';
import { resolveTenantId } from './auth.utils.js';
import {
  PasswordResetTokenInvalidError,
  PasswordResetTokenExpiredError,
  PasswordResetTokenAlreadyUsedError,
} from './auth.errors.js';

import type { AppConfig } from '../../config.js';

export interface RequestPasswordResetResult {
  success: boolean;
}

async function resolvePasswordResetTenantId(
  db: ReturnType<typeof getDatabaseClient>,
  optionsTenantId?: string,
): Promise<string | null> {
  if (optionsTenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.tenantId, optionsTenantId),
    });
    return tenant?.tenantId ?? null;
  }
  const defaultTenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.slug, 'default'),
  });
  return defaultTenant?.tenantId ?? null;
}

export const requestPasswordReset = async (
  config: AppConfig,
  data: {
    email: string;
  },
  options?: { tenantId?: string },
): Promise<RequestPasswordResetResult> => {
  const db = getDatabaseClient(config);
  const tenantId = await resolvePasswordResetTenantId(db, options?.tenantId);

  if (!tenantId) {
    return { success: true };
  }

  const user = await findUserByEmailForPasswordReset(db, data.email, tenantId);

  if (!user || !user.isActive) {
    return { success: true };
  }

  const recoveryPolicy = getTenantRecoveryPolicy(undefined);
  const token = generateResetToken(recoveryPolicy.tokenLength);
  const tokenHash = await hashToken(token, config.TOKEN_HASH_SALT);

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + recoveryPolicy.tokenTtlSeconds);

  await createPasswordResetToken(db, {
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash,
    expiresAt,
  });

  return { success: true };
};

export interface ChangePasswordWithTokenResult {
  success: boolean;
  sessionsRevoked?: number;
}

async function validatePasswordResetToken(
  db: ReturnType<typeof getDatabaseClient>,
  token: string,
  tenantId: string,
  tokenHash: string,
) {
  const tokenRecord = await findValidPasswordResetToken(db, tokenHash, tenantId);

  if (!tokenRecord) {
    throw new PasswordResetTokenInvalidError();
  }
  if (tokenRecord.usedAt) {
    throw new PasswordResetTokenAlreadyUsedError();
  }
  if (new Date() > tokenRecord.expiresAt) {
    throw new PasswordResetTokenExpiredError();
  }
  return tokenRecord;
}

export const changePasswordWithToken = async (
  config: AppConfig,
  data: {
    token: string;
    password: string;
  },
  options?: { tenantId?: string },
): Promise<ChangePasswordWithTokenResult> => {
  const db = getDatabaseClient(config);

  const tenantId = await resolveTenantId(
    config,
    options?.tenantId ? { tenantId: options.tenantId } : undefined,
  );

  const tokenHash = await hashToken(data.token, config.TOKEN_HASH_SALT);
  const tokenRecord = await validatePasswordResetToken(db, data.token, tenantId, tokenHash);

  validatePasswordAgainstPolicy(data.password, tokenRecord.tenantId);
  await screenPasswordForCompromise(config, data.password);

  const passwordHash = await hashPassword(data.password);

  await updateUserPassword(db, tokenRecord.userId, tokenRecord.tenantId, passwordHash);
  await markPasswordResetTokenUsed(db, tokenRecord.id);
  await deleteAllPasswordResetTokensForUser(db, tokenRecord.userId, tokenRecord.tenantId);

  const tenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.tenantId, tokenRecord.tenantId),
  });

  const sessionPolicy = resolveTenantSessionPolicy(
    tenant?.settings as Record<string, unknown> | undefined,
  );
  let sessionsRevoked = 0;
  if (sessionPolicy.forceLogoutOnPasswordChange) {
    sessionsRevoked = await deleteAllSessionsByTenantId(db, tokenRecord.tenantId);
  }

  return { success: true, sessionsRevoked };
};
