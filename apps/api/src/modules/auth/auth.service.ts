import { randomUUID } from 'crypto';

import * as argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { tenants } from '../../shared/database/schema/tenants.js';
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
  createProfile,
  findProfileByUserId,
  updateProfile,
  type UpdateProfileData,
} from './auth.repo.js';
import {
  InvalidCredentialsError,
  SessionExpiredError,
  SessionRevokedError,
} from './auth.errors.js';

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
  const now = Math.floor(Date.now() / 1000);
  const accessTokenExpires = config.JWT_EXPIRES_IN;

  const accessToken = await new SignJWT({
    sub: user.id,
    tenantId: user.tenantId,
    sessionId,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(accessTokenExpires)
    .sign(new TextEncoder().encode(config.JWT_SECRET));

  const refreshToken = providedRefreshToken ?? randomUUID();

  return {
    accessToken,
    refreshToken,
  };
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

export const login = async (
  config: AppConfig,
  data: {
    email: string;
    password: string;
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

  const refreshToken = randomUUID();
  const refreshTokenHash = await hashToken(refreshToken, config.TOKEN_HASH_SALT);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const session = await createSession(db, {
    userId: userWithHash.id,
    tenantId: userWithHash.tenantId,
    tokenHash: refreshTokenHash,
    expiresAt: refreshTokenExpiry,
  });

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

export const refresh = async (
  config: AppConfig,
  refreshToken: string,
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

  const newRefreshToken = randomUUID();
  const newRefreshTokenHash = await hashToken(newRefreshToken, config.TOKEN_HASH_SALT);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const newSession = await createSession(db, {
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: newRefreshTokenHash,
    expiresAt: refreshTokenExpiry,
  });

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
    const { payload } = await jwtVerify(token, new TextEncoder().encode(config.JWT_SECRET));

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
