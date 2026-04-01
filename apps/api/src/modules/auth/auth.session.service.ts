import { randomUUID } from 'crypto';

import {
  canRefreshSession,
  getSessionPolicyForRole,
  resolveTenantSessionPolicy,
  evaluateSessionTimeouts,
  validateSessionBinding,
  type SessionBindingContext,
  SessionRevocationReason,
} from '@the-dmz/shared/auth/session-policy.js';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { ALLOWED_TENANT_STATUSES } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  findSessionByTokenHash,
  findUserById,
  deleteSession,
  deleteSessionByTokenHash,
  createSession,
  findSessionById,
  deleteAllSessionsByTenantId,
  findActiveSessionWithContext,
  updateSessionLastActive,
} from './auth.repo.js';
import { hashToken, generateTokens, REFRESH_TOKEN_EXPIRY_DAYS } from './auth-crypto.js';
import { verifyJWT } from './jwt-keys.service.js';
import {
  InvalidCredentialsError,
  SessionExpiredError,
  SessionRevokedError,
  InvalidKeyIdError,
  KeyRevokedError,
  KeyExpiredError,
  MissingKeyIdError,
  SessionIdleTimeoutError,
  SessionAbsoluteTimeoutError,
  SessionBindingViolationError,
} from './auth.errors.js';

import type { AppConfig } from '../../config.js';
import type { RefreshResponse, AuthenticatedUser, JwtPayload } from './auth.types.js';

export interface RefreshOptions {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export const refresh = async (
  config: AppConfig,
  refreshToken: string,
  options?: RefreshOptions,
): Promise<RefreshResponse> => {
  const db = getDatabaseClient(config);

  const refreshTokenHash = await hashToken(refreshToken, config.TOKEN_HASH_SALT);
  const session = await findSessionByTokenHash(db, refreshTokenHash);

  if (!session) {
    throw new InvalidCredentialsError();
  }

  if (new Date() > session.expiresAt) {
    await deleteSession(db, session.id);
    throw new SessionExpiredError();
  }

  const user = await findUserById(db, session.userId, session.tenantId);

  if (!user || !user.isActive) {
    throw new InvalidCredentialsError();
  }

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.tenantId, user.tenantId),
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
      details: {
        tenantId: tenant.tenantId,
        tenantStatus: tenant.status,
      },
    });
  }

  const sessionPolicy = resolveTenantSessionPolicy(
    tenant?.settings as Record<string, unknown> | undefined,
  );

  const lastActiveAt = session.lastActiveAt ?? session.createdAt;
  const timeoutEval = evaluateSessionTimeouts(session.createdAt, lastActiveAt, sessionPolicy);

  if (!timeoutEval.allowed) {
    await deleteSession(db, session.id);
    if (timeoutEval.reason === SessionRevocationReason.IDLE_TIMEOUT) {
      throw new SessionIdleTimeoutError(sessionPolicy.idleTimeoutMinutes);
    }
    if (timeoutEval.reason === SessionRevocationReason.ABSOLUTE_TIMEOUT) {
      throw new SessionAbsoluteTimeoutError(sessionPolicy.absoluteTimeoutMinutes);
    }
    throw new SessionExpiredError();
  }

  if (sessionPolicy.sessionBindingMode !== 'none') {
    const originalSession = await findActiveSessionWithContext(db, session.id);
    if (originalSession) {
      const bindingContext: SessionBindingContext = {
        ipAddress: options?.ipAddress ?? null,
        deviceFingerprint: options?.deviceFingerprint ?? null,
      };
      const originalContext: SessionBindingContext = {
        ipAddress: originalSession.ipAddress ?? null,
        deviceFingerprint: originalSession.deviceFingerprint ?? null,
      };
      const bindingViolation = validateSessionBinding(
        sessionPolicy,
        originalContext,
        bindingContext,
      );
      if (bindingViolation.violated) {
        await deleteSession(db, session.id);
        throw new SessionBindingViolationError(bindingViolation.violations);
      }
    }
  }

  if (!canRefreshSession(session.createdAt, user.role)) {
    await deleteSession(db, session.id);
    const policy = getSessionPolicyForRole(user.role);
    throw new AppError({
      code: ErrorCodes.AUTH_SESSION_EXPIRED,
      message: `Session has exceeded maximum duration of ${policy.maxSessionDurationMs}ms for role ${user.role}`,
      statusCode: 401,
    });
  }

  await updateSessionLastActive(db, session.id);

  const newRefreshToken = randomUUID();
  const newRefreshTokenHash = await hashToken(newRefreshToken, config.TOKEN_HASH_SALT);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const newSessionData: {
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  } = {
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: newRefreshTokenHash,
    expiresAt: refreshTokenExpiry,
  };

  if (options?.ipAddress) {
    newSessionData.ipAddress = options.ipAddress;
  }
  if (options?.userAgent) {
    newSessionData.userAgent = options.userAgent;
  }

  const newSession = await createSession(db, newSessionData);

  await deleteSession(db, session.id);

  const newTokens = await generateTokens(config, user, newSession.id, newRefreshToken);

  return {
    ...newTokens,
    sessionId: newSession.id,
    oldSessionId: session.id,
    userId: user.id,
    tenantId: user.tenantId,
  };
};

export const logout = async (config: AppConfig, refreshToken: string): Promise<void> => {
  const db = getDatabaseClient(config);

  const refreshTokenHash = await hashToken(refreshToken, config.TOKEN_HASH_SALT);
  await deleteSessionByTokenHash(db, refreshTokenHash);
};

export const verifyAccessToken = async (
  config: AppConfig,
  token: string,
): Promise<AuthenticatedUser> => {
  try {
    const { payload } = await verifyJWT(config, token);

    const jwtPayload = payload as unknown as JwtPayload;

    if (!jwtPayload.sub || !jwtPayload.tenantId || !jwtPayload.sessionId) {
      throw new InvalidCredentialsError();
    }

    const db = getDatabaseClient(config);
    const session = await findSessionById(db, jwtPayload.sessionId);

    if (!session) {
      throw new SessionRevokedError();
    }

    if (new Date() > session.expiresAt) {
      throw new SessionExpiredError();
    }

    return {
      userId: jwtPayload.sub,
      tenantId: jwtPayload.tenantId,
      sessionId: jwtPayload.sessionId,
      role: jwtPayload.role,
    };
  } catch (error) {
    if (error instanceof SessionExpiredError || error instanceof SessionRevokedError) {
      throw error;
    }
    if (
      error instanceof MissingKeyIdError ||
      error instanceof InvalidKeyIdError ||
      error instanceof KeyRevokedError ||
      error instanceof KeyExpiredError
    ) {
      throw error;
    }
    throw new InvalidCredentialsError();
  }
};

export const invalidateTenantSessions = async (
  config: AppConfig,
  tenantId: string,
): Promise<number> => {
  const db = getDatabaseClient(config);
  return deleteAllSessionsByTenantId(db, tenantId);
};
