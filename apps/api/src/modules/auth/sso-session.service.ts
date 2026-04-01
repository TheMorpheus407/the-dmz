import * as crypto from 'crypto';

import { getRedisClient } from '../../shared/database/redis.js';

import { DEFAULT_SESSION_TIMEOUT, REMEMBER_ME_TIMEOUT } from './sso-shared.js';

import type { SSOStateData } from './sso-shared.js';

const OIDC_STATE_KEY_PREFIX = 'sso:oidc:state:';

const getOIDCStateKey = (state: string): string => `${OIDC_STATE_KEY_PREFIX}${state}`;

export const storeOIDCState = async (
  state: string,
  data: SSOStateData,
  expiresInSeconds: number = 600,
): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis client is not available');
  }
  await redis.connect();
  await redis.setValue(getOIDCStateKey(state), JSON.stringify(data), expiresInSeconds);
};

export const getOIDCState = async (state: string): Promise<SSOStateData | null> => {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  await redis.connect();
  const data = await redis.getValue(getOIDCStateKey(state));
  if (!data) {
    return null;
  }
  try {
    return JSON.parse(data) as SSOStateData;
  } catch {
    return null;
  }
};

export const deleteOIDCState = async (state: string): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  await redis.connect();
  await redis.deleteKey(getOIDCStateKey(state));
};

export const createSAMLLoginSession = (
  _userId: string,
  _tenantId: string,
  _providerId: string,
  rememberMe: boolean = false,
): { sessionId: string; expiresAt: Date; cookieOptions: Record<string, unknown> } => {
  const sessionId = crypto.randomUUID();
  const timeout = rememberMe ? REMEMBER_ME_TIMEOUT : DEFAULT_SESSION_TIMEOUT;
  const expiresAt = new Date(Date.now() + timeout);

  const isProduction = process.env['NODE_ENV'] === 'production';

  const cookieOptions: Record<string, unknown> = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };

  return {
    sessionId,
    expiresAt,
    cookieOptions,
  };
};
