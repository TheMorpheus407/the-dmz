import { randomUUID, createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

import {
  generateKeyPair,
  exportSPKI,
  exportPKCS8,
  importPKCS8,
  importSPKI,
  exportJWK,
  SignJWT,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import { eq, and, or, gt, isNull } from 'drizzle-orm';

import { KEY_TYPE, JWT_SIGNING_ALGORITHM, KEY_STATUS } from '@the-dmz/shared/contracts';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { signingKeys } from '../../db/schema/auth/signing-keys.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  InvalidKeyIdError,
  KeyRevokedError,
  KeyExpiredError,
  MissingKeyIdError,
} from './auth.errors.js';

import type { AppConfig } from '../../config.js';

type KeyStatus = (typeof KEY_STATUS)[keyof typeof KEY_STATUS];
type JWTSigningAlgorithm = (typeof JWT_SIGNING_ALGORITHM)[keyof typeof JWT_SIGNING_ALGORITHM];
type KeyType = (typeof KEY_TYPE)[keyof typeof KEY_TYPE];

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

const deriveKey = (encryptionKey: string, salt: Buffer): Buffer => {
  return scryptSync(encryptionKey, salt, 32);
};

const encryptPrivateKey = (privateKeyPem: string, encryptionKey: string): string => {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(encryptionKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);

  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
};

const decryptPrivateKey = (encryptedPem: string, encryptionKey: string): string => {
  const combined = Buffer.from(encryptedPem, 'base64');

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(encryptionKey, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
};

export interface GeneratedKeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
  kid: string;
}

export const generateRSAKeyPair = async (): Promise<GeneratedKeyPair> => {
  const kid = randomUUID();
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });

  const publicKeyPem = await exportSPKI(publicKey);
  const privateKeyPem = await exportPKCS8(privateKey);

  return {
    publicKeyPem,
    privateKeyPem,
    kid,
  };
};

export const generateECKeyPair = async (): Promise<GeneratedKeyPair> => {
  const kid = randomUUID();
  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });

  const publicKeyPem = await exportSPKI(publicKey);
  const privateKeyPem = await exportPKCS8(privateKey);

  return {
    publicKeyPem,
    privateKeyPem,
    kid,
  };
};

export const parseRSAPublicKeyToJWK = async (pem: string): Promise<{ n: string; e: string }> => {
  const publicKey = await importSPKI(pem, 'RS256');
  const jwk = await exportJWK(publicKey);
  return { n: jwk.n!, e: jwk.e! };
};

export const parseECPublicKeyToJWK = async (
  pem: string,
): Promise<{ x: string; y: string; crv: string }> => {
  const publicKey = await importSPKI(pem, 'ES256');
  const jwk = await exportJWK(publicKey);
  return { x: jwk.x!, y: jwk.y!, crv: jwk.crv! };
};

export interface SigningKeyRow {
  id: string;
  keyType: string;
  algorithm: string;
  publicKeyPem: string;
  privateKeyEncryptedPem: string;
  status: string;
  createdAt: Date;
  activatedAt: Date | null;
  expiresAt: Date | null;
  rotatedAt: Date | null;
  revokedAt: Date | null;
}

export const createSigningKey = async (
  config: AppConfig,
  options: {
    keyType: KeyType;
    algorithm: JWTSigningAlgorithm;
    validityDays?: number;
  },
): Promise<SigningKeyRow> => {
  const db = getDatabaseClient(config);

  const keyPair =
    options.keyType === KEY_TYPE.RSA ? await generateRSAKeyPair() : await generateECKeyPair();

  const now = new Date();
  const expiresAt = options.validityDays
    ? new Date(now.getTime() + options.validityDays * 24 * 60 * 60 * 1000)
    : null;

  const [key] = await db
    .insert(signingKeys)
    .values({
      id: keyPair.kid,
      keyType: options.keyType,
      algorithm: options.algorithm,
      publicKeyPem: keyPair.publicKeyPem,
      privateKeyEncryptedPem: encryptPrivateKey(
        keyPair.privateKeyPem,
        config.JWT_PRIVATE_KEY_ENCRYPTION_KEY,
      ),
      status: KEY_STATUS.ACTIVE,
      activatedAt: now,
      expiresAt,
    })
    .returning();

  return key as unknown as SigningKeyRow;
};

export const getActiveSigningKey = async (config: AppConfig): Promise<SigningKeyRow | null> => {
  const db = getDatabaseClient(config);

  const [key] = await db
    .select()
    .from(signingKeys)
    .where(
      and(
        eq(signingKeys.status, KEY_STATUS.ACTIVE),
        or(isNull(signingKeys.expiresAt), gt(signingKeys.expiresAt, new Date())),
      ),
    )
    .limit(1);

  return key as unknown as SigningKeyRow | null;
};

export const getSigningKeyById = async (
  config: AppConfig,
  keyId: string,
): Promise<SigningKeyRow | null> => {
  const db = getDatabaseClient(config);

  const [key] = await db.select().from(signingKeys).where(eq(signingKeys.id, keyId)).limit(1);

  return key as unknown as SigningKeyRow | null;
};

export const getAllActiveSigningKeys = async (config: AppConfig): Promise<SigningKeyRow[]> => {
  const db = getDatabaseClient(config);

  const keys = await db
    .select()
    .from(signingKeys)
    .where(
      and(
        eq(signingKeys.status, KEY_STATUS.ACTIVE),
        or(isNull(signingKeys.expiresAt), gt(signingKeys.expiresAt, new Date())),
      ),
    );

  return keys as unknown as SigningKeyRow[];
};

export const rotateSigningKey = async (
  config: AppConfig,
  options?: {
    keyType?: KeyType;
    algorithm?: JWTSigningAlgorithm;
    gracePeriodHours?: number;
  },
): Promise<SigningKeyRow> => {
  const db = getDatabaseClient(config);

  const currentKey = await getActiveSigningKey(config);

  if (currentKey) {
    const gracePeriodMs = (options?.gracePeriodHours ?? 24) * 60 * 60 * 1000;
    const gracePeriodEnd = new Date(Date.now() + gracePeriodMs);

    await db
      .update(signingKeys)
      .set({
        status: KEY_STATUS.ROTATING,
        rotatedAt: new Date(),
        expiresAt: gracePeriodEnd,
      })
      .where(eq(signingKeys.id, currentKey.id));
  }

  const newKey = await createSigningKey(config, {
    keyType: options?.keyType ?? KEY_TYPE.RSA,
    algorithm: options?.algorithm ?? JWT_SIGNING_ALGORITHM.RS256,
    validityDays: 90,
  });

  return newKey;
};

export const revokeSigningKey = async (config: AppConfig, keyId: string): Promise<void> => {
  const db = getDatabaseClient(config);

  await db
    .update(signingKeys)
    .set({
      status: KEY_STATUS.REVOKED,
      revokedAt: new Date(),
    })
    .where(eq(signingKeys.id, keyId));
};

export interface JWKResponse {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
}

export interface JWKSDocument {
  keys: JWKResponse[];
}

export const getJWKS = async (config: AppConfig): Promise<JWKSDocument> => {
  const activeKeys = await getAllActiveSigningKeys(config);

  const jwks: JWKResponse[] = await Promise.all(
    activeKeys.map(async (key) => {
      const baseJwk: JWKResponse = {
        kty: key.keyType,
        kid: key.id,
        use: 'sig',
        alg: key.algorithm,
      };

      if (key.keyType === KEY_TYPE.RSA) {
        const parsed = await parseRSAPublicKeyToJWK(key.publicKeyPem);
        return {
          ...baseJwk,
          n: parsed.n,
          e: parsed.e,
        };
      }

      if (key.keyType === KEY_TYPE.EC) {
        const parsed = await parseECPublicKeyToJWK(key.publicKeyPem);
        return {
          ...baseJwk,
          crv: parsed.crv,
          x: parsed.x,
          y: parsed.y,
        };
      }

      return baseJwk;
    }),
  );

  return { keys: jwks };
};

export const getKeyForVerification = async (
  config: AppConfig,
  kid: string,
): Promise<{
  key: CryptoKey;
  algorithm: JWTSigningAlgorithm;
  status: KeyStatus;
} | null> => {
  const key = await getSigningKeyById(config, kid);

  if (!key) {
    return null;
  }

  if (key.status === KEY_STATUS.REVOKED) {
    throw new KeyRevokedError(kid);
  }

  if (key.status === KEY_STATUS.EXPIRED || (key.expiresAt && key.expiresAt < new Date())) {
    throw new KeyExpiredError(kid);
  }

  const publicKey = await importSPKI(key.publicKeyPem, key.algorithm);

  return {
    key: publicKey,
    algorithm: key.algorithm as JWTSigningAlgorithm,
    status: key.status as KeyStatus,
  };
};

const DEFAULT_KEY_ROTATION_DAYS = 90;

export const ensureActiveSigningKey = async (config: AppConfig): Promise<SigningKeyRow> => {
  let key = await getActiveSigningKey(config);

  if (!key) {
    key = await createSigningKey(config, {
      keyType: KEY_TYPE.RSA,
      algorithm: JWT_SIGNING_ALGORITHM.RS256,
      validityDays: DEFAULT_KEY_ROTATION_DAYS,
    });
  }

  return key;
};

export const signJWT = async (
  config: AppConfig,
  payload: Record<string, unknown>,
): Promise<string> => {
  try {
    const key = await ensureActiveSigningKey(config);

    const privateKeyPem = decryptPrivateKey(
      key.privateKeyEncryptedPem,
      config.JWT_PRIVATE_KEY_ENCRYPTION_KEY,
    );
    const privateKey = await importPKCS8(privateKeyPem, key.algorithm);

    const token = await new SignJWT(payload)
      .setProtectedHeader({
        alg: key.algorithm as JWTSigningAlgorithm,
        typ: 'JWT',
        kid: key.id,
      })
      .setIssuedAt()
      .setExpirationTime(config.JWT_EXPIRES_IN)
      .sign(privateKey);

    return token;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (
      error instanceof Error &&
      (error.message.includes('relation') ||
        error.message.includes('table') ||
        error.message.includes('signing_keys') ||
        error.message.includes('database') ||
        error.message.includes('connection'))
    ) {
      throw new AppError({
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'JWT signing is unavailable. Please ensure database migrations are run.',
        statusCode: 503,
      });
    }
    throw new AppError({
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : 'Failed to sign JWT',
      statusCode: 500,
    });
  }
};

export const verifyJWT = async (
  config: AppConfig,
  token: string,
): Promise<{
  payload: Record<string, unknown>;
  header: { kid: string; alg: string };
}> => {
  const { payload, protectedHeader } = await jwtVerify(token, getKeyForVerificationFunc(config));

  return {
    payload: payload as Record<string, unknown>,
    header: protectedHeader as { kid: string; alg: string },
  };
};

const getKeyForVerificationFunc = (config: AppConfig): JWTVerifyGetKey => {
  return async (protectedHeader) => {
    const kid = protectedHeader.kid;

    if (!kid) {
      throw new MissingKeyIdError();
    }

    const keyData = await getKeyForVerification(config, kid);

    if (!keyData) {
      throw new InvalidKeyIdError(kid);
    }

    return keyData.key;
  };
};
