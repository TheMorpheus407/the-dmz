import { eq, and } from 'drizzle-orm';

import {
  CredentialStatus,
  type ApiKeyResponse,
  type RevokeApiKeyInput,
} from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

import { apiKeys } from '../../db/schema/auth/api-keys.js';
import { createAppError } from '../../shared/middleware/error-handler.js';

import { mapDbToResponse } from './api-key-repo.js';

import type { DB } from '../../shared/database/connection.js';

export async function revokeApiKey(
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
