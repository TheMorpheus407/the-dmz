import { eq, and } from 'drizzle-orm';

import {
  CredentialStatus,
  type CredentialType,
  DEFAULT_ROTATION_GRACE_PERIOD_DAYS,
  type ApiKeyWithSecret,
  type RotateApiKeyInput,
} from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

import { apiKeys } from '../../db/schema/auth/api-keys.js';
import { createAppError } from '../../shared/middleware/error-handler.js';

import { hashSecret, getKeyPrefix, generateSecret } from './api-key-crypto.js';
import { mapDbToResponse } from './api-key-repo.js';

import type { DB } from '../../shared/database/connection.js';

const DEFAULT_GRACE_PERIOD = DEFAULT_ROTATION_GRACE_PERIOD_DAYS;

export async function rotateApiKey(
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
