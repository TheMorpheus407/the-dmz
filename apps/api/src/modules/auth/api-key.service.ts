import { randomBytes, randomUUID } from 'crypto';

import { eq, and, desc } from 'drizzle-orm';
import * as argon2 from 'argon2';

import {
  CredentialStatus,
  CredentialType,
  CredentialOwnerType,
  DEFAULT_ROTATION_GRACE_PERIOD_DAYS,
  type ApiKeyScope,
  type ApiKeyValidationResult,
  type CreateApiKeyInput,
  type RevokeApiKeyInput,
  type RotateApiKeyInput,
  type ApiKeyResponse,
  type ApiKeyWithSecret,
  type ApiKeyListResponse,
} from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

import { apiKeys } from '../../db/schema/auth/api-keys.js';
import { createAppError } from '../../shared/middleware/error-handler.js';

import type { DB } from '../../shared/database/connection.js';

const DEFAULT_GRACE_PERIOD = DEFAULT_ROTATION_GRACE_PERIOD_DAYS;

function generateSecret(prefix: string, length: number = 40): string {
  const randomPart = randomBytes(length).toString('hex');
  return `${prefix}${randomPart}`;
}

async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await argon2.hash(secret, {
    salt: Buffer.from(salt, 'hex'),
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
  return `${salt}:${hash}`;
}

function getKeyPrefix(type: CredentialType): string {
  return type === CredentialType.PAT ? 'dmz_pat_' : 'dmz_ak_';
}

async function countTenantApiKeys(db: DB, tenantId: string): Promise<number> {
  const result = await db
    .select({ count: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.tenantId, tenantId));
  return result.length;
}

async function countUserApiKeys(db: DB, tenantId: string, ownerId: string): Promise<number> {
  const result = await db
    .select({ count: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.ownerId, ownerId)));
  return result.length;
}

async function createApiKey(
  db: DB,
  input: CreateApiKeyInput,
  createdBy: string,
  tenantId: string,
): Promise<ApiKeyWithSecret> {
  const tenantCount = await countTenantApiKeys(db, tenantId);
  if (tenantCount >= 100) {
    throw createAppError(
      ErrorCodes.API_KEY_TOO_MANY,
      'Maximum number of API keys reached for tenant',
    );
  }

  if (input.ownerId) {
    const userCount = await countUserApiKeys(db, tenantId, input.ownerId);
    if (userCount >= 10) {
      throw createAppError(
        ErrorCodes.API_KEY_TOO_MANY,
        'Maximum number of API keys reached for user',
      );
    }
  }

  const keyId = randomUUID();
  const secret = generateSecret(getKeyPrefix(input.type ?? CredentialType.API_KEY));
  const secretHash = await hashSecret(secret);

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const rotationGracePeriodDays = input.rotationGracePeriodDays ?? DEFAULT_GRACE_PERIOD;
  const rotationGraceEndsAt = new Date();
  rotationGraceEndsAt.setDate(rotationGraceEndsAt.getDate() + rotationGracePeriodDays);

  const [created] = await db
    .insert(apiKeys)
    .values({
      keyId,
      tenantId,
      name: input.name,
      type: input.type ?? CredentialType.API_KEY,
      ownerType: input.ownerType ?? CredentialOwnerType.SERVICE,
      ownerId: input.ownerId ?? null,
      secretHash,
      scopes: input.scopes as unknown as string,
      status: CredentialStatus.ACTIVE,
      expiresAt,
      rotationGracePeriodDays: String(rotationGracePeriodDays),
      rotationGraceEndsAt,
      createdBy,
      metadata: input.metadata ?? null,
    })
    .returning();

  if (!created) {
    throw createAppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create API key');
  }

  return {
    ...mapDbToResponse(created),
    secret,
  };
}

async function listApiKeys(
  db: DB,
  tenantId: string,
  options?: {
    cursor?: string;
    limit?: number;
    ownerType?: CredentialOwnerType;
    ownerId?: string;
    status?: CredentialStatus;
  },
): Promise<ApiKeyListResponse> {
  const limit = options?.limit ?? 20;

  const conditions = [eq(apiKeys.tenantId, tenantId)];

  if (options?.ownerType) {
    conditions.push(eq(apiKeys.ownerType, options.ownerType));
  }

  if (options?.ownerId) {
    conditions.push(eq(apiKeys.ownerId, options.ownerId));
  }

  if (options?.status) {
    conditions.push(eq(apiKeys.status, options.status));
  }

  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(...conditions))
    .orderBy(desc(apiKeys.createdAt))
    .limit(limit + 1);

  let cursor: string | undefined;
  if (keys.length > limit) {
    const lastKey = keys[limit - 1];
    if (lastKey) {
      cursor = lastKey.keyId;
      keys.pop();
    }
  }

  return {
    keys: keys.map(mapDbToResponse),
    total: keys.length,
    cursor,
  };
}

async function getApiKeyById(
  db: DB,
  keyId: string,
  tenantId: string,
): Promise<ApiKeyResponse | null> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyId, keyId), eq(apiKeys.tenantId, tenantId)));

  return key ? mapDbToResponse(key) : null;
}

async function getApiKeyByIdForAdmin(db: DB, keyId: string): Promise<ApiKeyResponse | null> {
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyId, keyId));

  return key ? mapDbToResponse(key) : null;
}

async function validateApiKey(
  db: DB,
  keyId: string,
  secret: string,
): Promise<ApiKeyValidationResult> {
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyId, keyId));

  if (!key) {
    return {
      valid: false,
      error: {
        code: ErrorCodes.API_KEY_INVALID,
        message: 'Invalid API key',
      },
    };
  }

  const secretHash = await hashSecret(secret);
  const currentKeyHash = key.secretHash;
  const previousKeyHash = key.previousSecretHash;

  let currentValid = false;
  let previousValid = false;

  if (currentKeyHash) {
    currentValid = await argon2.verify(currentKeyHash, secret);
  }

  if (previousKeyHash) {
    previousValid = await argon2.verify(previousKeyHash, secret);
  }

  if (!currentValid && !previousValid) {
    return {
      valid: false,
      error: {
        code: ErrorCodes.API_KEY_INVALID,
        message: 'Invalid API key',
      },
    };
  }

  if (key.status === CredentialStatus.REVOKED) {
    return {
      valid: false,
      keyId: key.keyId,
      tenantId: key.tenantId,
      ownerType: key.ownerType as CredentialOwnerType,
      ...(key.ownerId !== null && { ownerId: key.ownerId }),
      scopes: key.scopes as readonly ApiKeyScope[],
      status: key.status as CredentialStatus,
      error: {
        code: ErrorCodes.API_KEY_REVOKED,
        message: 'API key has been revoked',
      },
    };
  }

  if (key.status === CredentialStatus.EXPIRED || (key.expiresAt && key.expiresAt < new Date())) {
    await db
      .update(apiKeys)
      .set({ status: CredentialStatus.EXPIRED, updatedAt: new Date() })
      .where(eq(apiKeys.id, key.id));

    return {
      valid: false,
      keyId: key.keyId,
      tenantId: key.tenantId,
      ownerType: key.ownerType as CredentialOwnerType,
      ...(key.ownerId !== null && { ownerId: key.ownerId }),
      scopes: key.scopes as readonly ApiKeyScope[],
      status: CredentialStatus.EXPIRED,
      error: {
        code: ErrorCodes.API_KEY_EXPIRED,
        message: 'API key has expired',
      },
    };
  }

  if (
    key.status === CredentialStatus.ROTATING &&
    key.rotationGraceEndsAt &&
    key.rotationGraceEndsAt < new Date()
  ) {
    await db
      .update(apiKeys)
      .set({ status: CredentialStatus.EXPIRED, updatedAt: new Date() })
      .where(eq(apiKeys.id, key.id));

    return {
      valid: false,
      keyId: key.keyId,
      tenantId: key.tenantId,
      ownerType: key.ownerType as CredentialOwnerType,
      ...(key.ownerId !== null && { ownerId: key.ownerId }),
      scopes: key.scopes as readonly ApiKeyScope[],
      status: CredentialStatus.EXPIRED,
      error: {
        code: ErrorCodes.API_KEY_ROTATION_GRACE_EXPIRED,
        message: 'API key rotation grace period has expired',
      },
    };
  }

  if (key.status === CredentialStatus.ROTATING && key.previousSecretHash === secretHash) {
    return {
      valid: true,
      keyId: key.keyId,
      tenantId: key.tenantId,
      ownerType: key.ownerType as CredentialOwnerType,
      ...(key.ownerId !== null && { ownerId: key.ownerId }),
      scopes: key.scopes as readonly ApiKeyScope[],
      status: CredentialStatus.ROTATING,
    };
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  return {
    valid: true,
    keyId: key.keyId,
    tenantId: key.tenantId,
    ownerType: key.ownerType as CredentialOwnerType,
    ...(key.ownerId !== null && { ownerId: key.ownerId }),
    scopes: key.scopes as readonly ApiKeyScope[],
    status: key.status as CredentialStatus,
  };
}

async function rotateApiKey(
  db: DB,
  keyId: string,
  input: RotateApiKeyInput,
  tenantId: string,
): Promise<ApiKeyWithSecret> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyId, keyId), eq(apiKeys.tenantId, tenantId)));

  if (!key) {
    throw createAppError(ErrorCodes.API_KEY_NOT_FOUND, 'API key not found');
  }

  if (key.status === CredentialStatus.REVOKED) {
    throw createAppError(ErrorCodes.API_KEY_REVOKED, 'Cannot rotate a revoked API key');
  }

  if (key.status === CredentialStatus.ROTATING) {
    throw createAppError(
      ErrorCodes.API_KEY_ROTATION_IN_PROGRESS,
      'API key rotation already in progress',
    );
  }

  if (key.status === CredentialStatus.EXPIRED || (key.expiresAt && key.expiresAt < new Date())) {
    throw createAppError(ErrorCodes.API_KEY_EXPIRED, 'Cannot rotate an expired API key');
  }

  const newSecret = generateSecret(getKeyPrefix(key.type as CredentialType));
  const newSecretHash = await hashSecret(newSecret);

  const rotationGracePeriodDays = input.rotationGracePeriodDays ?? DEFAULT_GRACE_PERIOD;
  const rotationGraceEndsAt = new Date();
  rotationGraceEndsAt.setDate(rotationGraceEndsAt.getDate() + rotationGracePeriodDays);

  const [updated] = await db
    .update(apiKeys)
    .set({
      previousSecretHash: key.secretHash,
      secretHash: newSecretHash,
      status: CredentialStatus.ROTATING,
      rotationGracePeriodDays: String(rotationGracePeriodDays),
      rotationGraceEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.id, key.id))
    .returning();

  if (!updated) {
    throw createAppError(ErrorCodes.INTERNAL_ERROR, 'Failed to rotate API key');
  }

  return {
    ...mapDbToResponse(updated),
    secret: newSecret,
  };
}

async function revokeApiKey(
  db: DB,
  keyId: string,
  input: RevokeApiKeyInput,
  revokedBy: string,
  tenantId: string,
): Promise<ApiKeyResponse> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyId, keyId), eq(apiKeys.tenantId, tenantId)));

  if (!key) {
    throw createAppError(ErrorCodes.API_KEY_NOT_FOUND, 'API key not found');
  }

  if (key.status === CredentialStatus.REVOKED) {
    return mapDbToResponse(key);
  }

  const [updated] = await db
    .update(apiKeys)
    .set({
      status: CredentialStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy,
      revocationReason: input.reason ?? null,
      previousSecretHash: null,
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.id, key.id))
    .returning();

  if (!updated) {
    throw createAppError(ErrorCodes.INTERNAL_ERROR, 'Failed to revoke API key');
  }

  return mapDbToResponse(updated);
}

async function deleteApiKey(db: DB, keyId: string, tenantId: string): Promise<void> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyId, keyId), eq(apiKeys.tenantId, tenantId)));

  if (!key) {
    throw createAppError(ErrorCodes.API_KEY_NOT_FOUND, 'API key not found');
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, key.id));
}

async function updateApiKeyLastUsed(db: DB, keyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.keyId, keyId));
}

interface DbApiKey {
  id: string;
  keyId: string;
  tenantId: string;
  name: string;
  type: string;
  ownerType: string;
  ownerId: string | null;
  secretHash: string;
  previousSecretHash: string | null;
  scopes: unknown;
  status: string;
  expiresAt: Date | null;
  rotationGracePeriodDays: string;
  rotationGraceEndsAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
  metadata: unknown;
}

function mapDbToResponse(key: DbApiKey): ApiKeyResponse {
  return {
    id: key.id,
    keyId: key.keyId,
    name: key.name,
    type: key.type as CredentialType,
    ownerType: key.ownerType as CredentialOwnerType,
    ownerId: key.ownerId,
    tenantId: key.tenantId,
    scopes:
      typeof key.scopes === 'string'
        ? (JSON.parse(key.scopes) as readonly ApiKeyScope[])
        : (key.scopes as readonly ApiKeyScope[]),
    status: key.status as CredentialStatus,
    expiresAt: key.expiresAt,
    rotationGracePeriodDays: parseInt(key.rotationGracePeriodDays, 10),
    rotationGraceEndsAt: key.rotationGraceEndsAt,
    lastUsedAt: key.lastUsedAt,
    createdBy: key.createdBy,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    revokedAt: key.revokedAt,
  };
}

export const apiKeyService = {
  createApiKey,
  listApiKeys,
  getApiKeyById,
  getApiKeyByIdForAdmin,
  validateApiKey,
  rotateApiKey,
  revokeApiKey,
  deleteApiKey,
  updateApiKeyLastUsed,
};
