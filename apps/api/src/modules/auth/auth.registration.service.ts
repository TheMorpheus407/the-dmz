import { randomUUID } from 'crypto';

import { getDatabaseClient } from '../../shared/database/connection.js';

import { createUser, createProfile, createSession } from './auth.repo.js';
import {
  hashPassword,
  hashToken,
  generateTokens,
  validatePasswordAgainstPolicy,
  screenPasswordForCompromise,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from './auth.crypto.js';
import { resolveTenantId } from './auth.utils.js';

import type { AppConfig } from '../../config.js';
import type { AuthResponse } from './auth.types.js';

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

  const tenantId = await resolveTenantId(config, {
    ...(options?.tenantId ? { tenantId: options.tenantId } : {}),
    required: true,
  });

  validatePasswordAgainstPolicy(data.password, tenantId);

  await screenPasswordForCompromise(config, data.password);

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
