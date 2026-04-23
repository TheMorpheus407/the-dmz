import { randomUUID } from 'crypto';

import { eq, and, desc } from 'drizzle-orm';

import {
  CredentialStatus,
  CredentialType,
  CredentialOwnerType,
  DEFAULT_ROTATION_GRACE_PERIOD_DAYS,
  type ApiKeyScope,
  type ApiKeyResponse,
  type ApiKeyWithSecret,
  type ApiKeyListResponse,
  type CreateApiKeyInput,
} from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';
import { DEFAULT_PAGINATION_LIMIT } from '@the-dmz/shared/utils';

import { apiKeys } from '../../db/schema/auth/api-keys.js';
import { createAppError } from '../../shared/middleware/error-handler.js';

import { generateSecret, hashSecret, getKeyPrefix } from './api-key-crypto.js';

import type { DB } from '../../shared/database/connection.js';

const DEFAULT_GRACE_PERIOD = DEFAULT_ROTATION_GRACE_PERIOD_DAYS;

export interface DbApiKey {
  id: string;
  keyId: string;
  tenantId: string;
  name: string;
  type: string;
  ownerType: string;
  ownerId: string | null;
  serviceAccountId: string | null;
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
  ipAllowlist: unknown;
  refererRestrictions: unknown;
  rateLimitRequestsPerWindow: unknown;
  rateLimitWindowMs: unknown;
}

export function parseJsonField<T>(field: unknown): T | undefined {
  if (field === null || field === undefined) {
    return undefined;
  }
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return undefined;
    }
  }
  return field as T;
}

export function mapDbToResponse(key: DbApiKey): ApiKeyResponse {
  return {
    id: key.id,
    keyId: key.keyId,
    name: key.name,
    type: key.type as CredentialType,
    ownerType: key.ownerType as CredentialOwnerType,
    ownerId: key.ownerId,
    serviceAccountId: key.serviceAccountId,
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
    ipAllowlist: parseJsonField<readonly string[]>(key.ipAllowlist) ?? null,
    refererRestrictions: parseJsonField<readonly string[]>(key.refererRestrictions) ?? null,
    rateLimitRequestsPerWindow: parseJsonField<number>(key.rateLimitRequestsPerWindow) ?? null,
    rateLimitWindowMs: parseJsonField<number>(key.rateLimitWindowMs) ?? null,
  };
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

export async function createApiKey(
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
      serviceAccountId: input.serviceAccountId ?? null,
      secretHash,
      scopes: input.scopes as unknown as string,
      status: CredentialStatus.ACTIVE,
      expiresAt,
      rotationGracePeriodDays: String(rotationGracePeriodDays),
      rotationGraceEndsAt,
      createdBy,
      metadata: input.metadata ?? null,
      ipAllowlist: input.ipAllowlist ?? null,
      refererRestrictions: input.refererRestrictions ?? null,
      rateLimitRequestsPerWindow: input.rateLimitRequestsPerWindow ?? null,
      rateLimitWindowMs: input.rateLimitWindowMs ?? null,
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

export async function listApiKeys(
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
  const limit = options?.limit ?? DEFAULT_PAGINATION_LIMIT;

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

export async function getApiKeyById(
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

export async function getApiKeyByIdForAdmin(db: DB, keyId: string): Promise<ApiKeyResponse | null> {
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyId, keyId));

  return key ? mapDbToResponse(key) : null;
}

export async function deleteApiKey(db: DB, keyId: string, tenantId: string): Promise<void> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyId, keyId), eq(apiKeys.tenantId, tenantId)));

  if (!key) {
    throw createAppError(ErrorCodes.API_KEY_NOT_FOUND, 'API key not found');
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, key.id));
}

export async function updateApiKeyLastUsed(db: DB, keyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.keyId, keyId));
}

export async function getApiKeyByIdRaw(db: DB, keyId: string): Promise<DbApiKey | null> {
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyId, keyId));
  return key ?? null;
}

export async function updateApiKeyStatus(
  db: DB,
  id: string,
  status: CredentialStatus,
): Promise<void> {
  await db.update(apiKeys).set({ status, updatedAt: new Date() }).where(eq(apiKeys.id, id));
}

export async function updateApiKeyStatusWithLastUsed(
  db: DB,
  id: string,
  status: CredentialStatus,
): Promise<void> {
  await db
    .update(apiKeys)
    .set({ status, lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
