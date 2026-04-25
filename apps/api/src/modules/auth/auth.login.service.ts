import { randomUUID } from 'crypto';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { ALLOWED_TENANT_STATUSES } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  resolveTenantSessionPolicy,
  evaluateConcurrentSessions,
  ConcurrentSessionStrategy,
} from './session-policy.service.js';
import {
  findUserByEmail,
  createSession,
  countActiveUserSessions,
  deleteOldestUserSessions,
} from './auth.repo.js';
import {
  hashToken,
  generateTokens,
  verifyPassword,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from './auth.crypto.js';
import { resolveTenantId } from './auth.utils.js';
import { InvalidCredentialsError, SessionConcurrentLimitError } from './auth.errors.js';

import type { AppConfig } from '../../config.js';
import type { AuthResponse } from './auth.types.js';

export interface LoginOptions {
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

async function validateUserAndTenant(
  db: ReturnType<typeof getDatabaseClient>,
  email: string,
  tenantId: string,
  password: string,
): Promise<{
  user: Awaited<ReturnType<typeof findUserByEmail>>;
  tenant: { tenantId: string; status: string; settings: Record<string, unknown> } | undefined;
}> {
  const userWithHash = await findUserByEmail(db, email, tenantId);

  if (!userWithHash) {
    throw new InvalidCredentialsError();
  }

  const isValid = await verifyPassword(password, userWithHash.passwordHash);

  if (!isValid || !userWithHash.isActive) {
    throw new InvalidCredentialsError();
  }

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.tenantId, userWithHash.tenantId),
    columns: {
      tenantId: true,
      status: true,
      settings: true,
    },
  });

  if (
    tenant &&
    !ALLOWED_TENANT_STATUSES.includes(tenant.status as (typeof ALLOWED_TENANT_STATUSES)[number])
  ) {
    throw new AppError({
      code: ErrorCodes.TENANT_INACTIVE,
      message: `Tenant is ${tenant.status}`,
      statusCode: 403,
    });
  }

  return { user: userWithHash, tenant: tenant ?? undefined };
}

async function handleConcurrentSessionLimit(
  db: ReturnType<typeof getDatabaseClient>,
  userId: string,
  tenantId: string,
  sessionPolicy: ReturnType<typeof resolveTenantSessionPolicy>,
): Promise<void> {
  const activeSessionCount = await countActiveUserSessions(db, userId, tenantId);
  const concurrentEval = evaluateConcurrentSessions(activeSessionCount, sessionPolicy);

  if (!concurrentEval.allowed) {
    if (concurrentEval.strategy === ConcurrentSessionStrategy.REJECT_NEWEST) {
      throw new SessionConcurrentLimitError(
        concurrentEval.maxSessions ?? 0,
        concurrentEval.currentSessionCount,
      );
    }
    const keepCount = (sessionPolicy.maxConcurrentSessionsPerUser ?? 1) - 1;
    await deleteOldestUserSessions(db, userId, tenantId, keepCount);
  }
}

interface SessionDataParams {
  userId: string;
  tenantId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

function buildSessionData(params: SessionDataParams) {
  const { userId, tenantId, tokenHash, expiresAt, ipAddress, userAgent } = params;
  return {
    userId,
    tenantId,
    tokenHash,
    expiresAt,
    ...(ipAddress && { ipAddress }),
    ...(userAgent && { userAgent }),
  };
}

export const login = async (
  config: AppConfig,
  data: {
    email: string;
    password: string;
  },
  options?: LoginOptions,
): Promise<AuthResponse> => {
  const db = getDatabaseClient(config);

  const tenantId = await resolveTenantId(
    config,
    options?.tenantId ? { tenantId: options.tenantId } : undefined,
  );

  const { user: userWithHash, tenant } = await validateUserAndTenant(
    db,
    data.email,
    tenantId,
    data.password,
  );
  const sessionPolicy = resolveTenantSessionPolicy(tenant?.settings);

  await handleConcurrentSessionLimit(db, userWithHash.id, userWithHash.tenantId, sessionPolicy);

  const refreshToken = randomUUID();
  const refreshTokenHash = await hashToken(refreshToken, config.TOKEN_HASH_SALT);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const sessionData = buildSessionData({
    userId: userWithHash.id,
    tenantId: userWithHash.tenantId,
    tokenHash: refreshTokenHash,
    expiresAt: refreshTokenExpiry,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });

  const session = await createSession(db, sessionData);
  const tokens = await generateTokens(config, userWithHash, session.id, refreshToken);

  const user = {
    id: userWithHash.id,
    email: userWithHash.email,
    displayName: userWithHash.displayName,
    tenantId: userWithHash.tenantId,
    role: userWithHash.role,
    isActive: userWithHash.isActive,
  };

  return { user, sessionId: session.id, ...tokens };
};
