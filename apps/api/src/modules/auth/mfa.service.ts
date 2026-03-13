import { randomUUID } from 'crypto';

import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { getRedisClient, type RedisRateLimitClient } from '../../shared/database/redis.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
import { webauthnCredentials as webauthnCredentialsTable } from '../../db/schema/auth/webauthn-credentials.js';
import { mfaCredentials as mfaCredentialsTable } from '../../db/schema/auth/mfa-credentials.js';
import { users } from '../../shared/database/schema/users.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import type { AppConfig } from '../../config.js';
import type { AuthenticatedUser } from './auth.types.js';

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const CHALLENGE_TTL_SECONDS = Math.ceil(CHALLENGE_EXPIRY_MS / 1000);
const CHALLENGE_KEY_PREFIX = 'mfa:webauthn:challenge:';

interface WebauthnChallenge {
  id: string;
  userId: string;
  tenantId: string;
  sessionId: string;
  challenge: string;
  type: 'registration' | 'verification';
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

const getChallengeKey = (challengeId: string): string => `${CHALLENGE_KEY_PREFIX}${challengeId}`;

const serializeChallenge = (challenge: WebauthnChallenge): string =>
  JSON.stringify({
    ...challenge,
    createdAt: challenge.createdAt.toISOString(),
    expiresAt: challenge.expiresAt.toISOString(),
  });

const deserializeChallenge = (data: string): WebauthnChallenge | null => {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const createdAt = parsed['createdAt'];
    const expiresAt = parsed['expiresAt'];
    const id = parsed['id'];
    const userId = parsed['userId'];
    const tenantId = parsed['tenantId'];
    const sessionId = parsed['sessionId'];
    const challenge = parsed['challenge'];
    const type = parsed['type'];
    const used = parsed['used'];

    if (
      typeof createdAt !== 'string' ||
      typeof expiresAt !== 'string' ||
      typeof id !== 'string' ||
      typeof userId !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof sessionId !== 'string' ||
      typeof challenge !== 'string' ||
      typeof type !== 'string' ||
      typeof used !== 'boolean'
    ) {
      return null;
    }

    return {
      id,
      userId,
      tenantId,
      sessionId,
      challenge,
      type: type as 'registration' | 'verification',
      createdAt: new Date(createdAt),
      expiresAt: new Date(expiresAt),
      used,
    };
  } catch {
    return null;
  }
};

const storeChallenge = async (
  redis: RedisRateLimitClient,
  challengeId: string,
  challenge: WebauthnChallenge,
): Promise<void> => {
  await redis.setValue(
    getChallengeKey(challengeId),
    serializeChallenge(challenge),
    CHALLENGE_TTL_SECONDS,
  );
};

const getChallenge = async (
  redis: RedisRateLimitClient,
  challengeId: string,
): Promise<WebauthnChallenge | null> => {
  const data = await redis.getValue(getChallengeKey(challengeId));
  if (!data) {
    return null;
  }
  return deserializeChallenge(data);
};

const deleteChallenge = async (redis: RedisRateLimitClient, challengeId: string): Promise<void> => {
  await redis.deleteKey(getChallengeKey(challengeId));
};

export const createWebauthnChallenge = async (
  config: AppConfig,
  user: AuthenticatedUser,
  type: 'registration' | 'verification',
): Promise<{
  challengeId: string;
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: 'public-key'; alg: -7 | -257 }>;
  timeout: number;
  excludeCredentials?: Array<{ id: string; type: 'public-key' }>;
}> => {
  const db = getDatabaseClient(config);

  if (type === 'verification') {
    const credentials = await db
      .select({
        credentialId: webauthnCredentialsTable.credentialId,
      })
      .from(webauthnCredentialsTable)
      .where(
        and(
          eq(webauthnCredentialsTable.userId, user.userId),
          eq(webauthnCredentialsTable.tenantId, user.tenantId),
        ),
      );

    if (credentials.length === 0) {
      throw new AppError({
        code: ErrorCodes.AUTH_MFA_NOT_ENABLED,
        message: 'No WebAuthn credentials found',
        statusCode: 400,
      });
    }
  }

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

  const challengeId = randomUUID();
  const challenge = randomUUID();

  const webauthnChallenge: WebauthnChallenge = {
    id: challengeId,
    userId: user.userId,
    tenantId: user.tenantId,
    sessionId: user.sessionId,
    challenge,
    type,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + CHALLENGE_EXPIRY_MS),
    used: false,
  };

  const redis = getRedisClient(config);
  if (redis) {
    await redis.connect();
    await storeChallenge(redis, challengeId, webauthnChallenge);
  } else {
    throw new AppError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Redis is not available for challenge storage',
      statusCode: 503,
    });
  }

  const rpId = config.WEBAUTHN_RP_ID || 'localhost';
  const rpName = config.WEBAUTHN_RP_NAME || 'The DMZ';

  const existingCredentials =
    type === 'registration'
      ? await db
          .select({
            credentialId: webauthnCredentialsTable.credentialId,
          })
          .from(webauthnCredentialsTable)
          .where(
            and(
              eq(webauthnCredentialsTable.userId, user.userId),
              eq(webauthnCredentialsTable.tenantId, user.tenantId),
            ),
          )
      : [];

  return {
    challengeId,
    challenge,
    rp: { id: rpId, name: rpName },
    user: {
      id: user.userId,
      name: userRecord.email,
      displayName: userRecord.displayName ?? userRecord.email,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: CHALLENGE_EXPIRY_MS,
    excludeCredentials:
      existingCredentials.length > 0
        ? existingCredentials.map((c) => ({
            id: c.credentialId,
            type: 'public-key' as const,
          }))
        : ([] as { id: string; type: 'public-key' }[]),
  };
};

export const registerWebauthnCredential = async (
  config: AppConfig,
  user: AuthenticatedUser,
  data: {
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[] | undefined;
  },
  challengeId: string,
): Promise<{ credentialId: string }> => {
  const redis = getRedisClient(config);
  if (!redis) {
    throw new AppError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Redis is not available for challenge verification',
      statusCode: 503,
    });
  }

  await redis.connect();
  const challenge = await getChallenge(redis, challengeId);

  if (!challenge) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
      message: 'Challenge not found or expired',
      statusCode: 400,
    });
  }

  if (challenge.used) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
      message: 'Challenge already used',
      statusCode: 400,
    });
  }

  if (new Date() > challenge.expiresAt) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
      message: 'Challenge expired',
      statusCode: 400,
    });
  }

  if (challenge.userId !== user.userId || challenge.tenantId !== user.tenantId) {
    throw new AppError({
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      message: 'Challenge does not match user',
      statusCode: 401,
    });
  }

  if (challenge.type !== 'registration') {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_REGISTRATION_FAILED,
      message: 'Invalid challenge type for registration',
      statusCode: 400,
    });
  }

  challenge.used = true;
  await storeChallenge(redis, challengeId, challenge);
  await deleteChallenge(redis, challengeId);

  const db = getDatabaseClient(config);

  const existing = await db
    .select()
    .from(webauthnCredentialsTable)
    .where(eq(webauthnCredentialsTable.credentialId, data.credentialId))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_EXISTS,
      message: 'Credential already registered',
      statusCode: 409,
    });
  }

  await db.insert(webauthnCredentialsTable).values({
    tenantId: user.tenantId,
    userId: user.userId,
    sessionId: user.sessionId,
    credentialId: data.credentialId,
    publicKey: data.publicKey,
    counter: data.counter,
    transports: data.transports ?? null,
  });

  return { credentialId: data.credentialId };
};

export const verifyWebauthnAssertion = async (
  config: AppConfig,
  user: AuthenticatedUser,
  data: {
    credentialId: string;
    counter: number;
  },
  challengeId: string,
): Promise<{ success: boolean; mfaVerifiedAt: Date }> => {
  const redis = getRedisClient(config);
  if (!redis) {
    throw new AppError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Redis is not available for challenge verification',
      statusCode: 503,
    });
  }

  await redis.connect();
  const challenge = await getChallenge(redis, challengeId);

  if (!challenge) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
      message: 'Challenge not found or expired',
      statusCode: 400,
    });
  }

  if (challenge.used) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
      message: 'Challenge already used',
      statusCode: 400,
    });
  }

  if (new Date() > challenge.expiresAt) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
      message: 'Challenge expired',
      statusCode: 400,
    });
  }

  if (challenge.userId !== user.userId || challenge.tenantId !== user.tenantId) {
    throw new AppError({
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      message: 'Challenge does not match user',
      statusCode: 401,
    });
  }

  if (challenge.type !== 'verification') {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_ASSERTION_FAILED,
      message: 'Invalid challenge type for verification',
      statusCode: 400,
    });
  }

  challenge.used = true;
  await deleteChallenge(redis, challengeId);

  const db = getDatabaseClient(config);

  const credentialResult = await db
    .select()
    .from(webauthnCredentialsTable)
    .where(
      and(
        eq(webauthnCredentialsTable.credentialId, data.credentialId),
        eq(webauthnCredentialsTable.userId, user.userId),
        eq(webauthnCredentialsTable.tenantId, user.tenantId),
      ),
    )
    .limit(1);

  const credential = credentialResult[0];

  if (!credential) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND,
      message: 'Credential not found',
      statusCode: 400,
    });
  }

  await db
    .update(sessionsTable)
    .set({
      mfaVerifiedAt: new Date(),
      mfaMethod: 'webauthn',
    })
    .where(eq(sessionsTable.id, user.sessionId));

  await db
    .update(webauthnCredentialsTable)
    .set({
      counter: data.counter,
      lastUsedAt: new Date(),
    })
    .where(eq(webauthnCredentialsTable.id, credential.id));

  return {
    success: true,
    mfaVerifiedAt: new Date(),
  };
};

export const getMfaStatus = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<{
  mfaRequired: boolean;
  mfaVerified: boolean;
  method: string | null;
  mfaVerifiedAt: Date | null;
  hasCredentials: boolean;
  totpEnabled: boolean;
  webauthnEnabled: boolean;
  mfaEnforcementLevel: 'none' | 'totp_required' | 'totp_and_webauthn_required';
}> => {
  const db = getDatabaseClient(config);

  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, user.sessionId),
  });

  const totpCredentials = await db
    .select({ id: mfaCredentialsTable.id })
    .from(mfaCredentialsTable)
    .where(
      and(
        eq(mfaCredentialsTable.userId, user.userId),
        eq(mfaCredentialsTable.tenantId, user.tenantId),
        eq(mfaCredentialsTable.type, 'totp'),
      ),
    );

  const webauthnCredentials = await db
    .select({ id: webauthnCredentialsTable.id })
    .from(webauthnCredentialsTable)
    .where(
      and(
        eq(webauthnCredentialsTable.userId, user.userId),
        eq(webauthnCredentialsTable.tenantId, user.tenantId),
      ),
    );

  const userRecord = await db.query.users.findFirst({
    where: and(eq(users.userId, user.userId), eq(users.tenantId, user.tenantId)),
  });

  const role = userRecord?.role;
  let mfaEnforcementLevel: 'none' | 'totp_required' | 'totp_and_webauthn_required' = 'none';
  let mfaRequired = false;

  if (role === 'super-admin') {
    mfaEnforcementLevel = 'totp_and_webauthn_required';
    mfaRequired = true;
  } else if (role === 'admin' || role === 'tenant-admin') {
    mfaEnforcementLevel = 'totp_required';
    mfaRequired = true;
  }

  return {
    mfaRequired,
    mfaVerified: session?.mfaVerifiedAt !== null && session?.mfaVerifiedAt !== undefined,
    method: session?.mfaMethod ?? null,
    mfaVerifiedAt: session?.mfaVerifiedAt ?? null,
    hasCredentials: totpCredentials.length > 0 || webauthnCredentials.length > 0,
    totpEnabled: totpCredentials.length > 0,
    webauthnEnabled: webauthnCredentials.length > 0,
    mfaEnforcementLevel,
  };
};

export const listWebauthnCredentials = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<
  Array<{
    id: string;
    credentialId: string;
    transports: string[] | undefined;
    createdAt: Date;
  }>
> => {
  const db = getDatabaseClient(config);

  const credentials = await db
    .select({
      id: webauthnCredentialsTable.id,
      credentialId: webauthnCredentialsTable.credentialId,
      transports: webauthnCredentialsTable.transports,
      createdAt: webauthnCredentialsTable.createdAt,
    })
    .from(webauthnCredentialsTable)
    .where(
      and(
        eq(webauthnCredentialsTable.userId, user.userId),
        eq(webauthnCredentialsTable.tenantId, user.tenantId),
      ),
    );

  return credentials.map((c) => ({
    id: c.id,
    credentialId: c.credentialId,
    transports: c.transports ?? undefined,
    createdAt: c.createdAt,
  }));
};

export const deleteWebauthnCredential = async (
  config: AppConfig,
  user: AuthenticatedUser,
  credentialId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);

  const result = await db
    .delete(webauthnCredentialsTable)
    .where(
      and(
        eq(webauthnCredentialsTable.id, credentialId),
        eq(webauthnCredentialsTable.userId, user.userId),
        eq(webauthnCredentialsTable.tenantId, user.tenantId),
      ),
    )
    .returning({ id: webauthnCredentialsTable.id });

  if (result.length === 0) {
    throw new AppError({
      code: ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND,
      message: 'Credential not found',
      statusCode: 404,
    });
  }
};
