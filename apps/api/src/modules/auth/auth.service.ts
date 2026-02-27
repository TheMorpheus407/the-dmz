import { randomUUID } from 'crypto';

import * as argon2 from 'argon2';
import { eq, and, or } from 'drizzle-orm';

import {
  canRefreshSession,
  getSessionPolicyForRole,
  resolveTenantSessionPolicy,
  evaluateSessionTimeouts,
  evaluateConcurrentSessions,
  validateSessionBinding,
  type SessionBindingContext,
  ConcurrentSessionStrategy,
  SessionRevocationReason,
} from '@the-dmz/shared/auth/session-policy.js';
import {
  m1PasswordPolicyManifest,
  evaluatePasswordPolicy,
  getTenantPolicy,
  type PasswordPolicyRequirements,
  generateResetToken,
  m1PasswordRecoveryPolicyManifest,
  getTenantRecoveryPolicy,
} from '@the-dmz/shared/contracts';
import {
  isValidScope,
  isValidScopeCombination,
  getAllowedScopes,
  type OAuthTokenResponse,
  type OAuthScope,
} from '@the-dmz/shared/auth/oauth-scope-contract';

import { screenPassword } from '../../shared/services/compromised-credential.service.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { tenants } from '../../shared/database/schema/tenants.js';
import { users } from '../../shared/database/schema/users.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';
import { ALLOWED_TENANT_STATUSES } from '../../shared/middleware/pre-auth-tenant-status-guard.js';

import {
  createUser,
  findUserByEmail,
  findUserById,
  createSession,
  findSessionById,
  findSessionByTokenHash,
  deleteSession,
  deleteSessionByTokenHash,
  deleteAllSessionsByTenantId,
  deleteAllSessionsByUserId,
  createProfile,
  findProfileByUserId,
  updateProfile,
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  deleteAllPasswordResetTokensForUser,
  findUserByEmailForPasswordReset,
  updateUserPassword,
  type UpdateProfileData,
  createOAuthClient as createOAuthClientInRepo,
  findOAuthClientByClientId,
  findOAuthClientByClientIdOnly as findOAuthClientByClientIdOnlyInRepo,
  findOAuthClientsByTenantId,
  rotateOAuthClientSecret as rotateOAuthClientSecretInRepo,
  revokeOAuthClient as revokeOAuthClientInRepo,
  updateOAuthClientLastUsed,
  deleteOAuthClient as deleteOAuthClientInRepo,
  listTenantSessions as listTenantSessionsRepo,
  findSessionWithUser,
  revokeSessionById,
  countTenantSessions,
  countActiveUserSessions,
  deleteOldestUserSessions,
  findActiveSessionWithContext,
  updateSessionLastActive,
} from './auth.repo.js';
import {
  InvalidCredentialsError,
  SessionExpiredError,
  SessionRevokedError,
  PasswordPolicyError,
  InvalidKeyIdError,
  KeyRevokedError,
  KeyExpiredError,
  MissingKeyIdError,
  PasswordResetTokenExpiredError,
  PasswordResetTokenInvalidError,
  PasswordResetTokenAlreadyUsedError,
  SessionIdleTimeoutError,
  SessionAbsoluteTimeoutError,
  SessionConcurrentLimitError,
  SessionBindingViolationError,
} from './auth.errors.js';
import {
  resolveEffectivePreferences,
  getLockedPreferenceKeys,
  type PreferenceResolutionOptions,
} from './preferences.js';
import { signJWT, verifyJWT } from './jwt-keys.service.js';

import type { AppConfig } from '../../config.js';
import type {
  AuthUser,
  AuthTokens,
  AuthResponse,
  RefreshResponse,
  JwtPayload,
  AuthenticatedUser,
  UserProfile,
} from './auth.types.js';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const hashToken = async (token: string, salt: string): Promise<string> => {
  return argon2.hash(token, {
    type: argon2.argon2id,
    salt: Buffer.from(salt),
    hashLength: 32,
  });
};

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

const generateTokens = async (
  config: AppConfig,
  user: AuthUser,
  sessionId: string,
  providedRefreshToken?: string,
): Promise<AuthTokens> => {
  const accessToken = await signJWT(config, {
    sub: user.id,
    tenantId: user.tenantId,
    sessionId,
    role: user.role,
  });

  const refreshToken = providedRefreshToken ?? randomUUID();

  return {
    accessToken,
    refreshToken,
  };
};

const validatePasswordAgainstPolicy = (
  password: string,
  _tenantId: string,
): PasswordPolicyRequirements => {
  const policy = getTenantPolicy(undefined, m1PasswordPolicyManifest);

  const result = evaluatePasswordPolicy(password, policy);

  if (!result.valid) {
    throw new PasswordPolicyError({
      policyRequirements: {
        minLength: policy.minLength,
        maxLength: policy.maxLength,
        requireUppercase: policy.requireUppercase,
        requireLowercase: policy.requireLowercase,
        requireNumber: policy.requireNumber,
        requireSpecial: policy.requireSpecial,
        characterClassesRequired: policy.characterClassesRequired,
        characterClassesMet: result.characterClassesMet,
      },
      violations: result.violations,
    });
  }

  return policy;
};

export const register = async (
  config: AppConfig,
  data: {
    email: string;
    password: string;
    displayName: string;
  },
  options?: { tenantId?: string },
): Promise<AuthResponse> => {
  const db = getDatabaseClient(config);

  let tenantId: string;

  if (options?.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.tenantId, options.tenantId!),
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenantId = tenant.tenantId;
  } else {
    const defaultTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, 'default'),
    });

    if (!defaultTenant) {
      const [created] = await db
        .insert(tenants)
        .values({
          name: 'Default Tenant',
          slug: 'default',
        })
        .returning({ tenantId: tenants.tenantId });

      if (!created || !created.tenantId) {
        throw new Error('Failed to create default tenant');
      }

      tenantId = created.tenantId;
    } else {
      tenantId = defaultTenant.tenantId;
    }
  }

  validatePasswordAgainstPolicy(data.password, tenantId);

  const compromisedResult = await screenPassword(config, data.password);
  if ('compromised' in compromisedResult && compromisedResult.compromised) {
    throw new PasswordPolicyError({
      policyRequirements: {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
        characterClassesRequired: 3,
        characterClassesMet: 0,
      },
      violations: ['compromised'],
    });
  }

  const passwordHash = await hashPassword(data.password);

  const user = await createUser(db, {
    email: data.email,
    passwordHash,
    displayName: data.displayName,
    tenantId,
  });

  await createProfile(db, {
    tenantId: user.tenantId,
    userId: user.id,
  });

  const refreshToken = randomUUID();
  const refreshTokenHash = await hashToken(refreshToken, config.TOKEN_HASH_SALT);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const session = await createSession(db, {
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: refreshTokenHash,
    expiresAt: refreshTokenExpiry,
  });

  const tokens = await generateTokens(config, user, session.id, refreshToken);

  return {
    user,
    sessionId: session.id,
    ...tokens,
  };
};

export interface LoginOptions {
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
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

  let tenantId: string;

  if (options?.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.tenantId, options.tenantId!),
    });

    if (!tenant) {
      throw new InvalidCredentialsError();
    }

    tenantId = tenant.tenantId;
  } else {
    const defaultTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, 'default'),
    });

    if (!defaultTenant) {
      throw new InvalidCredentialsError();
    }

    tenantId = defaultTenant.tenantId;
  }

  const userWithHash = await findUserByEmail(db, data.email, tenantId);

  if (!userWithHash) {
    throw new InvalidCredentialsError();
  }

  const isValid = await verifyPassword(data.password, userWithHash.passwordHash);

  if (!isValid) {
    throw new InvalidCredentialsError();
  }

  if (!userWithHash.isActive) {
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

  const sessionPolicy = resolveTenantSessionPolicy(
    tenant?.settings as Record<string, unknown> | undefined,
  );

  const activeSessionCount = await countActiveUserSessions(
    db,
    userWithHash.id,
    userWithHash.tenantId,
  );

  const concurrentEval = evaluateConcurrentSessions(activeSessionCount, sessionPolicy);

  if (!concurrentEval.allowed) {
    if (concurrentEval.strategy === ConcurrentSessionStrategy.REJECT_NEWEST) {
      throw new SessionConcurrentLimitError(
        concurrentEval.maxSessions ?? 0,
        concurrentEval.currentSessionCount,
      );
    }

    const keepCount = (sessionPolicy.maxConcurrentSessionsPerUser ?? 1) - 1;
    await deleteOldestUserSessions(db, userWithHash.id, userWithHash.tenantId, keepCount);
  }

  const refreshToken = randomUUID();
  const refreshTokenHash = await hashToken(refreshToken, config.TOKEN_HASH_SALT);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const sessionData: {
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  } = {
    userId: userWithHash.id,
    tenantId: userWithHash.tenantId,
    tokenHash: refreshTokenHash,
    expiresAt: refreshTokenExpiry,
  };

  if (options?.ipAddress) {
    sessionData.ipAddress = options.ipAddress;
  }
  if (options?.userAgent) {
    sessionData.userAgent = options.userAgent;
  }

  const session = await createSession(db, sessionData);

  const tokens = await generateTokens(config, userWithHash, session.id, refreshToken);

  const user: AuthUser = {
    id: userWithHash.id,
    email: userWithHash.email,
    displayName: userWithHash.displayName,
    tenantId: userWithHash.tenantId,
    role: userWithHash.role,
    isActive: userWithHash.isActive,
  };

  return {
    user,
    sessionId: session.id,
    ...tokens,
  };
};

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

export const getCurrentUser = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
): Promise<AuthUser> => {
  const db = getDatabaseClient(config);
  const user = await findUserById(db, userId, tenantId);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  return user;
};

export const invalidateTenantSessions = async (
  config: AppConfig,
  tenantId: string,
): Promise<number> => {
  const db = getDatabaseClient(config);
  return deleteAllSessionsByTenantId(db, tenantId);
};

export const getProfile = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
): Promise<UserProfile | null> => {
  const db = getDatabaseClient(config);
  return findProfileByUserId(db, userId, tenantId);
};

export const updateUserProfile = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
  data: UpdateProfileData,
): Promise<UserProfile | null> => {
  const db = getDatabaseClient(config);
  return updateProfile(db, userId, tenantId, data);
};

export const getEffectivePreferences = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
  _surface?: string,
): Promise<{
  profile: UserProfile | null;
  effectivePreferences: ReturnType<typeof resolveEffectivePreferences>;
  lockedPreferenceKeys: string[];
}> => {
  const profile = await getProfile(config, userId, tenantId);

  if (!profile) {
    return {
      profile: null,
      effectivePreferences: resolveEffectivePreferences({}),
      lockedPreferenceKeys: [],
    };
  }

  type UserPrefs = {
    themePreferences?: {
      theme?: 'green' | 'amber' | 'high-contrast' | 'enterprise';
      enableTerminalEffects?: boolean;
      effects?: Record<string, boolean>;
      fontSize?: number;
    };
    accessibilityPreferences?: {
      reducedMotion?: boolean;
      highContrast?: boolean;
      fontSize?: number;
    };
  };

  type LockedPrefs = {
    theme?: boolean;
    enableTerminalEffects?: boolean;
    effects?: Record<string, boolean>;
    fontSize?: boolean;
    reducedMotion?: boolean;
    highContrast?: boolean;
  };

  const userPrefs = profile.preferences as UserPrefs | undefined;
  const lockedPrefs = profile.policyLockedPreferences as LockedPrefs | undefined;

  const resolutionOptions: {
    userPreferences?: UserPrefs;
    policyLockedPreferences?: LockedPrefs;
    surface?: string;
    osPreferences?: { prefersReducedMotion: boolean; prefersContrast: boolean };
  } = {};

  if (userPrefs) {
    resolutionOptions.userPreferences = userPrefs;
  }

  if (lockedPrefs) {
    resolutionOptions.policyLockedPreferences = lockedPrefs;
  }

  const effectivePreferences = resolveEffectivePreferences(
    resolutionOptions as PreferenceResolutionOptions,
  );
  const lockedPreferenceKeys = getLockedPreferenceKeys(resolutionOptions.policyLockedPreferences);

  return {
    profile,
    effectivePreferences,
    lockedPreferenceKeys,
  };
};

export interface RequestPasswordResetResult {
  success: boolean;
}

export const requestPasswordReset = async (
  config: AppConfig,
  data: {
    email: string;
  },
  options?: { tenantId?: string },
): Promise<RequestPasswordResetResult> => {
  const db = getDatabaseClient(config);

  let tenantId: string;

  if (options?.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.tenantId, options.tenantId!),
    });

    if (!tenant) {
      return { success: true };
    }

    tenantId = tenant.tenantId;
  } else {
    const defaultTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, 'default'),
    });

    if (!defaultTenant) {
      return { success: true };
    }

    tenantId = defaultTenant.tenantId;
  }

  const user = await findUserByEmailForPasswordReset(db, data.email, tenantId);

  if (!user || !user.isActive) {
    return { success: true };
  }

  const recoveryPolicy = getTenantRecoveryPolicy(undefined, m1PasswordRecoveryPolicyManifest);
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

export const changePasswordWithToken = async (
  config: AppConfig,
  data: {
    token: string;
    password: string;
  },
  options?: { tenantId?: string },
): Promise<ChangePasswordWithTokenResult> => {
  const db = getDatabaseClient(config);

  let tenantId: string;

  if (options?.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.tenantId, options.tenantId!),
    });

    if (!tenant) {
      throw new PasswordResetTokenInvalidError();
    }

    tenantId = tenant.tenantId;
  } else {
    const defaultTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, 'default'),
    });

    if (!defaultTenant) {
      throw new PasswordResetTokenInvalidError();
    }

    tenantId = defaultTenant.tenantId;
  }

  const tokenHash = await hashToken(data.token, config.TOKEN_HASH_SALT);
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

  validatePasswordAgainstPolicy(data.password, tokenRecord.tenantId);

  const compromisedResult = await screenPassword(config, data.password);
  if ('compromised' in compromisedResult && compromisedResult.compromised) {
    throw new PasswordPolicyError({
      policyRequirements: {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
        characterClassesRequired: 3,
        characterClassesMet: 0,
      },
      violations: ['compromised'],
    });
  }

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

const OAUTH_TOKEN_EXPIRY_SECONDS = 3600;

const generateOAuthSecret = (): string => {
  return randomUUID() + '-' + randomUUID();
};

const hashOAuthSecret = async (secret: string): Promise<string> => {
  return argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
};

export interface CreateOAuthClientResult {
  clientId: string;
  clientSecret: string;
  name: string;
  tenantId: string;
  scopes: string[];
  expiresAt: Date | null;
}

export const createOAuthClient = async (
  config: AppConfig,
  data: {
    name: string;
    tenantId: string;
    scopes: readonly string[];
  },
): Promise<CreateOAuthClientResult> => {
  const db = getDatabaseClient(config);

  const validScopes = data.scopes.filter((s) => isValidScope(s));
  if (validScopes.length === 0) {
    throw new Error('At least one valid scope is required');
  }

  const allowedScopes = getAllowedScopes('scim');
  if (!isValidScopeCombination(validScopes, allowedScopes)) {
    throw new Error('Invalid scope combination');
  }

  const clientSecret = generateOAuthSecret();
  const secretHash = await hashOAuthSecret(clientSecret);

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const client = await createOAuthClientInRepo(db, {
    tenantId: data.tenantId,
    name: data.name,
    secretHash,
    scopes: validScopes.join(' '),
    expiresAt,
  });

  return {
    clientId: client.clientId,
    clientSecret,
    name: client.name,
    tenantId: client.tenantId,
    scopes: validScopes,
    expiresAt: client.expiresAt,
  };
};

export interface OAuthClientInfo {
  clientId: string;
  name: string;
  tenantId: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

export const listOAuthClients = async (
  config: AppConfig,
  tenantId: string,
): Promise<OAuthClientInfo[]> => {
  const db = getDatabaseClient(config);

  const clients = await findOAuthClientsByTenantId(db, tenantId);

  return clients.map((client) => ({
    clientId: client.clientId,
    name: client.name,
    tenantId: client.tenantId,
    scopes: client.scopes.split(' '),
    createdAt: client.createdAt,
    expiresAt: client.expiresAt,
    revokedAt: client.revokedAt,
    lastUsedAt: client.lastUsedAt,
  }));
};

export const findOAuthClientByClientIdOnly = async (
  config: AppConfig,
  clientId: string,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  secretHash: string;
  previousSecretHash: string | null;
  scopes: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
} | null> => {
  const db = getDatabaseClient(config);
  return findOAuthClientByClientIdOnlyInRepo(db, clientId);
};

export const rotateOAuthClientSecret = async (
  config: AppConfig,
  clientId: string,
  tenantId: string,
): Promise<{ clientSecret: string }> => {
  const db = getDatabaseClient(config);

  const clientSecret = generateOAuthSecret();
  const secretHash = await hashOAuthSecret(clientSecret);

  await rotateOAuthClientSecretInRepo(db, clientId, tenantId, secretHash);

  return { clientSecret };
};

export const revokeOAuthClient = async (
  config: AppConfig,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);

  await revokeOAuthClientInRepo(db, clientId, tenantId);
};

export const deleteOAuthClient = async (
  config: AppConfig,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);
  await deleteOAuthClientInRepo(db, clientId, tenantId);
};

export const issueClientCredentialsToken = async (
  config: AppConfig,
  data: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    scope?: string;
  },
): Promise<OAuthTokenResponse> => {
  const db = getDatabaseClient(config);

  const client = await findOAuthClientByClientId(db, data.clientId, data.tenantId);

  if (!client) {
    throw new Error('Invalid client credentials');
  }

  if (client.revokedAt) {
    throw new Error('OAuth client has been revoked');
  }

  if (client.expiresAt && new Date() > client.expiresAt) {
    throw new Error('OAuth client has expired');
  }

  const isValid = await argon2.verify(client.secretHash, data.clientSecret);
  if (!isValid) {
    const previousValid = client.previousSecretHash
      ? await argon2.verify(client.previousSecretHash, data.clientSecret)
      : false;
    if (!previousValid) {
      throw new Error('Invalid client credentials');
    }
  }

  const allowedScopes = client.scopes.split(' ');
  let requestedScopes: string[];

  if (data.scope) {
    requestedScopes = data.scope.split(' ');
    if (
      !isValidScopeCombination(requestedScopes, allowedScopes as unknown as readonly OAuthScope[])
    ) {
      throw new Error('Invalid scope');
    }
  } else {
    requestedScopes = allowedScopes;
  }

  await updateOAuthClientLastUsed(db, data.clientId, data.tenantId);

  const accessToken = await signOAuthJWT(config, {
    clientId: client.clientId,
    tenantId: client.tenantId,
    scopes: requestedScopes,
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: OAUTH_TOKEN_EXPIRY_SECONDS,
    scope: requestedScopes.join(' '),
  };
};

const signOAuthJWT = async (
  config: AppConfig,
  payload: {
    clientId: string;
    tenantId: string;
    scopes: string[];
  },
): Promise<string> => {
  return signJWT(config, {
    sub: payload.clientId,
    tenantId: payload.tenantId,
    scopes: payload.scopes,
    type: 'oauth_client_credentials',
  });
};

export const verifyOAuthToken = async (
  config: AppConfig,
  token: string,
): Promise<{
  clientId: string;
  tenantId: string;
  scopes: string[];
}> => {
  try {
    const { payload } = await verifyJWT(config, token);
    const jwtPayload = payload as unknown as {
      sub: string;
      tenantId: string;
      scopes: string[];
      type?: string;
    };

    if (!jwtPayload.sub || !jwtPayload.tenantId || !jwtPayload.scopes) {
      throw new Error('Invalid token payload');
    }

    if (jwtPayload.type !== 'oauth_client_credentials') {
      throw new Error('Invalid token type');
    }

    return {
      clientId: jwtPayload.sub,
      tenantId: jwtPayload.tenantId,
      scopes: jwtPayload.scopes,
    };
  } catch {
    throw new Error('Invalid or expired token');
  }
};

export const hasRequiredOAuthScope = (
  tokenScopes: readonly string[],
  requiredScope: string,
): boolean => {
  return tokenScopes.includes(requiredScope);
};

export interface FederatedRevocationInput {
  tenantId: string;
  userId?: string;
  email?: string;
  sourceType: 'saml' | 'oidc' | 'scim' | 'admin';
  ssoProviderId?: string;
}

export interface FederatedRevocationResult {
  result: 'revoked' | 'already_revoked' | 'ignored_invalid' | 'failed';
  sessionsRevoked: number;
  userId?: string;
  reason?: string;
}

export const revokeUserSessionsByFederatedIdentity = async (
  config: AppConfig,
  input: FederatedRevocationInput,
): Promise<FederatedRevocationResult> => {
  const db = getDatabaseClient(config);

  let targetUserId = input.userId;
  let targetTenantId = input.tenantId;

  if (!targetUserId && input.email) {
    const user = await findUserByEmail(db, input.email, input.tenantId);
    if (!user) {
      return {
        result: 'ignored_invalid',
        sessionsRevoked: 0,
        reason: 'user_not_found',
      };
    }
    targetUserId = user.id;
    targetTenantId = user.tenantId;
  }

  if (!targetUserId) {
    return {
      result: 'ignored_invalid',
      sessionsRevoked: 0,
      reason: 'user_identity_required',
    };
  }

  if (targetTenantId !== input.tenantId) {
    return {
      result: 'ignored_invalid',
      sessionsRevoked: 0,
      reason: 'tenant_mismatch',
    };
  }

  const sessionsBefore = await db.query.sessions.findMany({
    where: (sessions, { eq, and }) =>
      and(eq(sessions.userId, targetUserId), eq(sessions.tenantId, targetTenantId)),
  });

  if (sessionsBefore.length === 0) {
    return {
      result: 'already_revoked',
      sessionsRevoked: 0,
      userId: targetUserId,
      reason: 'no_active_sessions',
    };
  }

  const sessionsRevoked = await deleteAllSessionsByUserId(db, targetUserId, targetTenantId);

  return {
    result: 'revoked',
    sessionsRevoked,
    userId: targetUserId,
    reason: `${input.sourceType}_revocation`,
  };
};

export const revokeAllTenantSessionsFederated = async (
  config: AppConfig,
  tenantId: string,
  _reason: string,
): Promise<number> => {
  const db = getDatabaseClient(config);
  return deleteAllSessionsByTenantId(db, tenantId);
};

export interface ListTenantSessionsInput {
  tenantId: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}

export interface SessionListEntry {
  sessionId: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  deviceInfo: {
    userAgent: string | null;
    ipAddress: string | null;
  } | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface ListTenantSessionsResult {
  sessions: SessionListEntry[];
  nextCursor: string | undefined;
  total: number;
}

export const listTenantSessions = async (
  config: AppConfig,
  input: ListTenantSessionsInput,
): Promise<ListTenantSessionsResult> => {
  const db = getDatabaseClient(config);
  const limit = input.limit ?? 20;

  const repoInput: {
    tenantId: string;
    userId?: string;
    cursor?: string;
    limit: number;
  } = {
    tenantId: input.tenantId,
    limit,
  };

  if (input.userId) {
    repoInput.userId = input.userId;
  }
  if (input.cursor) {
    repoInput.cursor = input.cursor;
  }

  const { sessions, nextCursor } = await listTenantSessionsRepo(db, repoInput);

  const total = await countTenantSessions(db, input.tenantId, input.userId);

  const now = new Date();
  const sessionEntries: SessionListEntry[] = sessions.map((session) => {
    let status: 'active' | 'expired' | 'revoked' = 'active';
    if (session.expiresAt < now) {
      status = 'expired';
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      userEmail: '',
      tenantId: session.tenantId,
      createdAt: session.createdAt,
      lastSeenAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      deviceInfo:
        session.ipAddress || session.userAgent
          ? {
              userAgent: session.userAgent,
              ipAddress: session.ipAddress,
            }
          : null,
      status,
    };
  });

  const userIds = [...new Set(sessionEntries.map((s) => s.userId))];
  if (userIds.length > 0) {
    const userRecords = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, input.tenantId),
        or(...userIds.map((id) => eq(users.userId, id))),
      ),
      columns: {
        userId: true,
        email: true,
      },
    });

    const userEmailMap = new Map(userRecords.map((u) => [u.userId, u.email]));

    for (const session of sessionEntries) {
      session.userEmail = userEmailMap.get(session.userId) ?? '';
    }
  }

  return {
    sessions: sessionEntries,
    nextCursor,
    total,
  };
};

export interface RevokeSingleSessionInput {
  sessionId: string;
  tenantId: string;
}

export interface RevokeSingleSessionResult {
  result: 'revoked' | 'already_revoked' | 'not_found' | 'forbidden' | 'failed';
  sessionId: string;
  reason: string;
}

export const revokeSingleSession = async (
  config: AppConfig,
  input: RevokeSingleSessionInput,
): Promise<RevokeSingleSessionResult> => {
  const db = getDatabaseClient(config);

  const session = await findSessionWithUser(db, input.sessionId, input.tenantId);

  if (!session) {
    return {
      result: 'not_found',
      sessionId: input.sessionId,
      reason: 'session_not_found',
    };
  }

  const revokeResult = await revokeSessionById(db, input.sessionId, input.tenantId);

  if (!revokeResult.success) {
    return {
      result: 'failed',
      sessionId: input.sessionId,
      reason: 'revocation_failed',
    };
  }

  return {
    result: 'revoked',
    sessionId: input.sessionId,
    reason: 'admin_revoked',
  };
};

export interface RevokeAllUserSessionsInput {
  userId: string;
  tenantId: string;
  initiatedBy: string;
}

export interface RevokeAllUserSessionsResult {
  result: 'revoked' | 'already_revoked' | 'not_found' | 'forbidden' | 'failed';
  sessionsRevoked: number;
  reason: string;
}

export const revokeAllUserSessions = async (
  config: AppConfig,
  input: RevokeAllUserSessionsInput,
): Promise<RevokeAllUserSessionsResult> => {
  const db = getDatabaseClient(config);

  const user = await findUserById(db, input.userId, input.tenantId);

  if (!user) {
    return {
      result: 'not_found',
      sessionsRevoked: 0,
      reason: 'user_not_found',
    };
  }

  const sessionsBefore = await db.query.sessions.findMany({
    where: and(eq(sessionsTable.userId, input.userId), eq(sessionsTable.tenantId, input.tenantId)),
  });

  if (sessionsBefore.length === 0) {
    return {
      result: 'already_revoked',
      sessionsRevoked: 0,
      reason: 'no_active_sessions',
    };
  }

  const sessionsRevoked = await deleteAllSessionsByUserId(db, input.userId, input.tenantId);

  return {
    result: 'revoked',
    sessionsRevoked,
    reason: 'admin_revoked',
  };
};

export interface RevokeAllTenantSessionsInput {
  tenantId: string;
  initiatedBy: string;
}

export interface RevokeAllTenantSessionsResult {
  result: 'revoked' | 'failed';
  sessionsRevoked: number;
  reason: string;
}

export const revokeAllTenantSessions = async (
  config: AppConfig,
  input: RevokeAllTenantSessionsInput,
): Promise<RevokeAllTenantSessionsResult> => {
  const db = getDatabaseClient(config);

  const sessionsRevoked = await deleteAllSessionsByTenantId(db, input.tenantId);

  return {
    result: 'revoked',
    sessionsRevoked,
    reason: 'tenant_wide_admin_revocation',
  };
};

export interface HandleUserRoleChangeInput {
  userId: string;
  tenantId: string;
  oldRole: string;
  newRole: string;
}

export interface HandleUserRoleChangeResult {
  sessionsRevoked: number;
  reason: string;
}

export const handleUserRoleChange = async (
  config: AppConfig,
  input: HandleUserRoleChangeInput,
): Promise<HandleUserRoleChangeResult> => {
  if (input.oldRole === input.newRole) {
    return { sessionsRevoked: 0, reason: 'role_unchanged' };
  }

  const db = getDatabaseClient(config);

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.tenantId, input.tenantId),
    columns: {
      tenantId: true,
      settings: true,
    },
  });

  const sessionPolicy = resolveTenantSessionPolicy(
    tenant?.settings as Record<string, unknown> | undefined,
  );

  if (!sessionPolicy.forceLogoutOnRoleChange) {
    return { sessionsRevoked: 0, reason: 'force_logout_disabled' };
  }

  const sessionsRevoked = await deleteAllSessionsByUserId(db, input.userId, input.tenantId);

  return {
    sessionsRevoked,
    reason: SessionRevocationReason.ROLE_CHANGED,
  };
};
