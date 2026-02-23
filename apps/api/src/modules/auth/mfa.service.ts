import { randomUUID } from 'crypto';

import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
import { webauthnCredentials as webauthnCredentialsTable } from '../../db/schema/auth/webauthn-credentials.js';
import { users } from '../../shared/database/schema/users.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import type { AppConfig } from '../../config.js';
import type { AuthenticatedUser } from './auth.types.js';

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

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

const challengeStore = new Map<string, WebauthnChallenge>();

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

  challengeStore.set(challengeId, webauthnChallenge);

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
  const challenge = challengeStore.get(challengeId);

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
  const challenge = challengeStore.get(challengeId);

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
}> => {
  const db = getDatabaseClient(config);

  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, user.sessionId),
  });

  const credentials = await db
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

  const isSuperAdmin = userRecord?.role === 'super-admin';

  return {
    mfaRequired: isSuperAdmin,
    mfaVerified: session?.mfaVerifiedAt !== null && session?.mfaVerifiedAt !== undefined,
    method: session?.mfaMethod ?? null,
    mfaVerifiedAt: session?.mfaVerifiedAt ?? null,
    hasCredentials: credentials.length > 0,
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
