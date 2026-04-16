import { randomUUID } from 'crypto';

import * as argon2 from 'argon2';

import {
  isValidScope,
  isValidScopeCombination,
  getAllowedScopes,
  type OAuthScope,
  type OAuthTokenResponse,
} from '@the-dmz/shared/auth/oauth-scope-contract';

import { getDatabaseClient } from '../../shared/database/connection.js';

import {
  createOAuthClient as createOAuthClientInRepo,
  findOAuthClientByClientId,
  findOAuthClientByClientIdOnly as findOAuthClientByClientIdOnlyInRepo,
  findOAuthClientsByTenantId,
  rotateOAuthClientSecret as rotateOAuthClientSecretInRepo,
  revokeOAuthClient as revokeOAuthClientInRepo,
  updateOAuthClientLastUsed,
  deleteOAuthClient as deleteOAuthClientInRepo,
} from './auth.repo.js';
import {
  OAuthClientExpiredError,
  OAuthClientRevokedError,
  OAuthInsufficientScopeError,
  OAuthInvalidClientError,
} from './auth.errors.js';
import { hashPassword } from './auth-crypto.js';
import { signJWT, verifyJWT } from './jwt-keys.service.js';

import type { AppConfig } from '../../config.js';

const OAUTH_TOKEN_EXPIRY_SECONDS = 3600;

const generateOAuthSecret = (): string => {
  return randomUUID() + '-' + randomUUID();
};

export interface CreateOAuthClientResult {
  clientId: string;
  clientSecret: string;
  name: string;
  tenantId: string;
  scopes: string[];
  expiresAt: Date | null;
}

export const createOAuthClient = async (
  config: AppConfig,
  data: {
    name: string;
    tenantId: string;
    scopes: readonly string[];
  },
): Promise<CreateOAuthClientResult> => {
  const db = getDatabaseClient(config);

  const validScopes = data.scopes.filter((s) => isValidScope(s));
  if (validScopes.length === 0) {
    throw new Error('At least one valid scope is required');
  }

  const allowedScopes = getAllowedScopes('scim');
  if (!isValidScopeCombination(validScopes, allowedScopes)) {
    throw new Error('Invalid scope combination');
  }

  const clientSecret = generateOAuthSecret();
  const secretHash = await hashPassword(clientSecret);

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const client = await createOAuthClientInRepo(db, {
    tenantId: data.tenantId,
    name: data.name,
    secretHash,
    scopes: validScopes.join(' '),
    expiresAt,
  });

  return {
    clientId: client.clientId,
    clientSecret,
    name: client.name,
    tenantId: client.tenantId,
    scopes: validScopes,
    expiresAt: client.expiresAt,
  };
};

export interface OAuthClientInfo {
  clientId: string;
  name: string;
  tenantId: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

export const listOAuthClients = async (
  config: AppConfig,
  tenantId: string,
): Promise<OAuthClientInfo[]> => {
  const db = getDatabaseClient(config);

  const clients = await findOAuthClientsByTenantId(db, tenantId);

  return clients.map((client) => ({
    clientId: client.clientId,
    name: client.name,
    tenantId: client.tenantId,
    scopes: client.scopes.split(' '),
    createdAt: client.createdAt,
    expiresAt: client.expiresAt,
    revokedAt: client.revokedAt,
    lastUsedAt: client.lastUsedAt,
  }));
};

export const findOAuthClientByClientIdOnly = async (
  config: AppConfig,
  clientId: string,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  secretHash: string;
  previousSecretHash: string | null;
  rotationGracePeriodHours: string;
  rotationGraceEndsAt: Date | null;
  scopes: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
} | null> => {
  const db = getDatabaseClient(config);
  return findOAuthClientByClientIdOnlyInRepo(db, clientId);
};

export const rotateOAuthClientSecret = async (
  config: AppConfig,
  clientId: string,
  tenantId: string,
): Promise<{ clientSecret: string }> => {
  const db = getDatabaseClient(config);

  const clientSecret = generateOAuthSecret();
  const secretHash = await hashPassword(clientSecret);

  await rotateOAuthClientSecretInRepo(db, clientId, tenantId, secretHash);

  return { clientSecret };
};

export const revokeOAuthClient = async (
  config: AppConfig,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);

  await revokeOAuthClientInRepo(db, clientId, tenantId);
};

export const deleteOAuthClient = async (
  config: AppConfig,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  const db = getDatabaseClient(config);
  await deleteOAuthClientInRepo(db, clientId, tenantId);
};

const validateClientNotRevoked = (client: { revokedAt: Date | null }): void => {
  if (client.revokedAt) {
    throw new OAuthClientRevokedError();
  }
};

const validateClientNotExpired = (client: { expiresAt: Date | null }): void => {
  if (client.expiresAt && new Date() > client.expiresAt) {
    throw new OAuthClientExpiredError();
  }
};

const validateClientCredentials = async (
  client: {
    secretHash: string;
    previousSecretHash: string | null;
    rotationGraceEndsAt: Date | null;
  },
  clientSecret: string,
): Promise<void> => {
  const isValid = await argon2.verify(client.secretHash, clientSecret);
  if (isValid) return;

  if (client.rotationGraceEndsAt && client.rotationGraceEndsAt < new Date()) {
    throw new OAuthInvalidClientError();
  }
  const previousValid = client.previousSecretHash
    ? await argon2.verify(client.previousSecretHash, clientSecret)
    : false;
  if (!previousValid) {
    throw new OAuthInvalidClientError();
  }
};

export const issueClientCredentialsToken = async (
  config: AppConfig,
  data: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    scope?: string;
  },
): Promise<OAuthTokenResponse> => {
  const db = getDatabaseClient(config);

  const client = await findOAuthClientByClientId(db, data.clientId, data.tenantId);

  if (!client) {
    throw new OAuthInvalidClientError();
  }

  validateClientNotRevoked(client);
  validateClientNotExpired(client);
  await validateClientCredentials(client, data.clientSecret);

  const allowedScopes = client.scopes.split(' ');
  let requestedScopes: string[];

  if (data.scope) {
    requestedScopes = data.scope.split(' ');
    if (
      !isValidScopeCombination(requestedScopes, allowedScopes as unknown as readonly OAuthScope[])
    ) {
      throw new OAuthInsufficientScopeError(data.scope, allowedScopes.join(' '));
    }
  } else {
    requestedScopes = allowedScopes;
  }

  await updateOAuthClientLastUsed(db, data.clientId, data.tenantId);

  const accessToken = await signOAuthJWT(config, {
    clientId: client.clientId,
    tenantId: client.tenantId,
    scopes: requestedScopes,
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: OAUTH_TOKEN_EXPIRY_SECONDS,
    scope: requestedScopes.join(' '),
  };
};

const signOAuthJWT = async (
  config: AppConfig,
  payload: {
    clientId: string;
    tenantId: string;
    scopes: string[];
  },
): Promise<string> => {
  return signJWT(config, {
    sub: payload.clientId,
    tenantId: payload.tenantId,
    scopes: payload.scopes,
    type: 'oauth_client_credentials',
  });
};

export const verifyOAuthToken = async (
  config: AppConfig,
  token: string,
): Promise<{
  clientId: string;
  tenantId: string;
  scopes: string[];
}> => {
  try {
    const { payload } = await verifyJWT(config, token);
    const jwtPayload = payload as unknown as {
      sub: string;
      tenantId: string;
      scopes: string[];
      type?: string;
    };

    if (!jwtPayload.sub || !jwtPayload.tenantId || !jwtPayload.scopes) {
      throw new Error('Invalid token payload');
    }

    if (jwtPayload.type !== 'oauth_client_credentials') {
      throw new Error('Invalid token type');
    }

    return {
      clientId: jwtPayload.sub,
      tenantId: jwtPayload.tenantId,
      scopes: jwtPayload.scopes,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid token payload') {
      throw error;
    }
    if (error instanceof Error && error.message === 'Invalid token type') {
      throw error;
    }
    throw new Error('Invalid or expired token');
  }
};

export const hasRequiredOAuthScope = (
  tokenScopes: readonly string[],
  requiredScope: string,
): boolean => {
  return tokenScopes.includes(requiredScope);
};
