import * as argon2 from 'argon2';

import {
  CredentialStatus,
  type CredentialOwnerType,
  type ApiKeyScope,
  type ApiKeyValidationResult,
} from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

import {
  parseJsonField,
  getApiKeyByIdRaw,
  updateApiKeyStatus,
  updateApiKeyStatusWithLastUsed,
} from './api-key-repo.js';

import type { DB } from '../../shared/database/connection.js';

export async function validateApiKey(
  db: DB,
  keyId: string,
  secret: string,
): Promise<ApiKeyValidationResult> {
  const key = await getApiKeyByIdRaw(db, keyId);

  if (!key) {
    return {
      valid: false,
      error: {
        code: ErrorCodes.API_KEY_INVALID,
        message: 'Invalid API key',
      },
    };
  }

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
    return buildRevokedValidationResult(key);
  }

  if (key.status === CredentialStatus.EXPIRED || (key.expiresAt && key.expiresAt < new Date())) {
    await updateApiKeyStatus(db, key.id, CredentialStatus.EXPIRED);
    return buildExpiredValidationResult(key);
  }

  if (
    key.status === CredentialStatus.ROTATING &&
    key.rotationGraceEndsAt &&
    key.rotationGraceEndsAt < new Date()
  ) {
    await updateApiKeyStatus(db, key.id, CredentialStatus.EXPIRED);
    return buildRotationGraceExpiredValidationResult(key);
  }

  if (key.status === CredentialStatus.ROTATING) {
    if (previousValid) {
      return buildRotatingValidationResult(key);
    }
    return {
      valid: false,
      error: {
        code: ErrorCodes.API_KEY_INVALID,
        message: 'Invalid API key',
      },
    };
  }

  await updateApiKeyStatusWithLastUsed(db, key.id, key.status as CredentialStatus);
  return buildActiveValidationResult(key);
}

function buildRevokedValidationResult(key: {
  keyId: string;
  tenantId: string;
  ownerType: string;
  ownerId: string | null;
  serviceAccountId: string | null;
  status: string;
  ipAllowlist: unknown;
  refererRestrictions: unknown;
  rateLimitRequestsPerWindow: unknown;
  rateLimitWindowMs: unknown;
}): ApiKeyValidationResult {
  const baseResult = {
    valid: false as const,
    keyId: key.keyId,
    tenantId: key.tenantId,
    ownerType: key.ownerType as CredentialOwnerType,
    scopes: key.scopes as readonly ApiKeyScope[],
    status: key.status as CredentialStatus,
    error: {
      code: ErrorCodes.API_KEY_REVOKED,
      message: 'API key has been revoked',
    },
  };
  const additionalProps: Partial<ApiKeyValidationResult> = {};
  if (key.ownerId !== null) {
    additionalProps.ownerId = key.ownerId;
  }
  if (key.serviceAccountId !== null) {
    additionalProps.serviceAccountId = key.serviceAccountId;
  }
  const parsedIpAllowlist = parseJsonField<readonly string[]>(key.ipAllowlist);
  if (parsedIpAllowlist !== undefined) {
    additionalProps.ipAllowlist = parsedIpAllowlist;
  }
  const parsedReferer = parseJsonField<readonly string[]>(key.refererRestrictions);
  if (parsedReferer !== undefined) {
    additionalProps.refererRestrictions = parsedReferer;
  }
  const parsedRateLimitRequests = parseJsonField<number>(key.rateLimitRequestsPerWindow);
  if (parsedRateLimitRequests !== undefined) {
    additionalProps.rateLimitRequestsPerWindow = parsedRateLimitRequests;
  }
  const parsedRateLimitWindow = parseJsonField<number>(key.rateLimitWindowMs);
  if (parsedRateLimitWindow !== undefined) {
    additionalProps.rateLimitWindowMs = parsedRateLimitWindow;
  }
  return { ...baseResult, ...additionalProps };
}

function buildExpiredValidationResult(key: {
  keyId: string;
  tenantId: string;
  ownerType: string;
  ownerId: string | null;
  serviceAccountId: string | null;
  ipAllowlist: unknown;
  refererRestrictions: unknown;
  rateLimitRequestsPerWindow: unknown;
  rateLimitWindowMs: unknown;
}): ApiKeyValidationResult {
  const result: ApiKeyValidationResult = {
    valid: false,
    keyId: key.keyId,
    tenantId: key.tenantId,
    ownerType: key.ownerType as CredentialOwnerType,
    scopes: key.scopes as readonly ApiKeyScope[],
    status: CredentialStatus.EXPIRED,
    error: {
      code: ErrorCodes.API_KEY_EXPIRED,
      message: 'API key has expired',
    },
  };
  if (key.ownerId !== null) {
    result.ownerId = key.ownerId;
  }
  if (key.serviceAccountId !== null) {
    result.serviceAccountId = key.serviceAccountId;
  }
  const parsedIpAllowlist = parseJsonField<readonly string[]>(key.ipAllowlist);
  if (parsedIpAllowlist !== undefined) {
    result.ipAllowlist = parsedIpAllowlist;
  }
  const parsedReferer = parseJsonField<readonly string[]>(key.refererRestrictions);
  if (parsedReferer !== undefined) {
    result.refererRestrictions = parsedReferer;
  }
  const parsedRateLimitRequests = parseJsonField<number>(key.rateLimitRequestsPerWindow);
  if (parsedRateLimitRequests !== undefined) {
    result.rateLimitRequestsPerWindow = parsedRateLimitRequests;
  }
  const parsedRateLimitWindow = parseJsonField<number>(key.rateLimitWindowMs);
  if (parsedRateLimitWindow !== undefined) {
    result.rateLimitWindowMs = parsedRateLimitWindow;
  }
  return result;
}

function buildRotationGraceExpiredValidationResult(key: {
  keyId: string;
  tenantId: string;
  ownerType: string;
  ownerId: string | null;
  serviceAccountId: string | null;
  ipAllowlist: unknown;
  refererRestrictions: unknown;
  rateLimitRequestsPerWindow: unknown;
  rateLimitWindowMs: unknown;
}): ApiKeyValidationResult {
  const result: ApiKeyValidationResult = {
    valid: false,
    keyId: key.keyId,
    tenantId: key.tenantId,
    ownerType: key.ownerType as CredentialOwnerType,
    scopes: key.scopes as readonly ApiKeyScope[],
    status: CredentialStatus.EXPIRED,
    error: {
      code: ErrorCodes.API_KEY_ROTATION_GRACE_EXPIRED,
      message: 'API key rotation grace period has expired',
    },
  };
  if (key.ownerId !== null) {
    result.ownerId = key.ownerId;
  }
  if (key.serviceAccountId !== null) {
    result.serviceAccountId = key.serviceAccountId;
  }
  const parsedIpAllowlist = parseJsonField<readonly string[]>(key.ipAllowlist);
  if (parsedIpAllowlist !== undefined) {
    result.ipAllowlist = parsedIpAllowlist;
  }
  const parsedReferer = parseJsonField<readonly string[]>(key.refererRestrictions);
  if (parsedReferer !== undefined) {
    result.refererRestrictions = parsedReferer;
  }
  const parsedRateLimitRequests = parseJsonField<number>(key.rateLimitRequestsPerWindow);
  if (parsedRateLimitRequests !== undefined) {
    result.rateLimitRequestsPerWindow = parsedRateLimitRequests;
  }
  const parsedRateLimitWindow = parseJsonField<number>(key.rateLimitWindowMs);
  if (parsedRateLimitWindow !== undefined) {
    result.rateLimitWindowMs = parsedRateLimitWindow;
  }
  return result;
}

function buildRotatingValidationResult(key: {
  keyId: string;
  tenantId: string;
  ownerType: string;
  ownerId: string | null;
  serviceAccountId: string | null;
  status: string;
  ipAllowlist: unknown;
  refererRestrictions: unknown;
  rateLimitRequestsPerWindow: unknown;
  rateLimitWindowMs: unknown;
}): ApiKeyValidationResult {
  const result: ApiKeyValidationResult = {
    valid: true,
    keyId: key.keyId,
    tenantId: key.tenantId,
    ownerType: key.ownerType as CredentialOwnerType,
    scopes: key.scopes as readonly ApiKeyScope[],
    status: CredentialStatus.ROTATING,
  };
  if (key.ownerId !== null) {
    result.ownerId = key.ownerId;
  }
  if (key.serviceAccountId !== null) {
    result.serviceAccountId = key.serviceAccountId;
  }
  const parsedIpAllowlist = parseJsonField<readonly string[]>(key.ipAllowlist);
  if (parsedIpAllowlist !== undefined) {
    result.ipAllowlist = parsedIpAllowlist;
  }
  const parsedReferer = parseJsonField<readonly string[]>(key.refererRestrictions);
  if (parsedReferer !== undefined) {
    result.refererRestrictions = parsedReferer;
  }
  const parsedRateLimitRequests = parseJsonField<number>(key.rateLimitRequestsPerWindow);
  if (parsedRateLimitRequests !== undefined) {
    result.rateLimitRequestsPerWindow = parsedRateLimitRequests;
  }
  const parsedRateLimitWindow = parseJsonField<number>(key.rateLimitWindowMs);
  if (parsedRateLimitWindow !== undefined) {
    result.rateLimitWindowMs = parsedRateLimitWindow;
  }
  return result;
}

function buildActiveValidationResult(key: {
  keyId: string;
  tenantId: string;
  ownerType: string;
  ownerId: string | null;
  serviceAccountId: string | null;
  status: string;
  ipAllowlist: unknown;
  refererRestrictions: unknown;
  rateLimitRequestsPerWindow: unknown;
  rateLimitWindowMs: unknown;
}): ApiKeyValidationResult {
  const result: ApiKeyValidationResult = {
    valid: true,
    keyId: key.keyId,
    tenantId: key.tenantId,
    ownerType: key.ownerType as CredentialOwnerType,
    scopes: key.scopes as readonly ApiKeyScope[],
    status: key.status as CredentialStatus,
  };
  if (key.ownerId !== null) {
    result.ownerId = key.ownerId;
  }
  if (key.serviceAccountId !== null) {
    result.serviceAccountId = key.serviceAccountId;
  }
  const parsedIpAllowlist = parseJsonField<readonly string[]>(key.ipAllowlist);
  if (parsedIpAllowlist !== undefined) {
    result.ipAllowlist = parsedIpAllowlist;
  }
  const parsedReferer = parseJsonField<readonly string[]>(key.refererRestrictions);
  if (parsedReferer !== undefined) {
    result.refererRestrictions = parsedReferer;
  }
  const parsedRateLimitRequests = parseJsonField<number>(key.rateLimitRequestsPerWindow);
  if (parsedRateLimitRequests !== undefined) {
    result.rateLimitRequestsPerWindow = parsedRateLimitRequests;
  }
  const parsedRateLimitWindow = parseJsonField<number>(key.rateLimitWindowMs);
  if (parsedRateLimitWindow !== undefined) {
    result.rateLimitWindowMs = parsedRateLimitWindow;
  }
  return result;
}
