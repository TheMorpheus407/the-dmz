import {
  hasAllScopePermissions,
  type ApiKeyScope,
  type ApiKeyPermission,
} from '@the-dmz/shared/auth/api-key-contract';

import { getDatabaseClient } from '../database/connection.js';
import { apiKeyService } from '../../modules/auth/api-key.service.js';

import { createAppError, ErrorCodes } from './error-handler.js';

import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyAuth?: {
      keyId: string;
      tenantId: string;
      ownerType: string;
      ownerId?: string;
      scopes: readonly ApiKeyScope[];
    };
  }
}

export interface ApiKeyAuthOptions {
  requiredPermissions?: ApiKeyPermission[];
}

export function createApiKeyAuthMiddleware(options: ApiKeyAuthOptions = {}) {
  const { requiredPermissions = [] } = options;

  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw createAppError(ErrorCodes.API_KEY_INVALID, 'Missing API key authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
      throw createAppError(ErrorCodes.API_KEY_INVALID, 'Invalid authorization header format');
    }

    const credentials = parts[1];
    if (!credentials) {
      throw createAppError(ErrorCodes.API_KEY_INVALID, 'Invalid API key credentials');
    }

    const colonIndex = credentials.indexOf(':');

    if (colonIndex === -1) {
      throw createAppError(ErrorCodes.API_KEY_INVALID, 'Invalid API key format');
    }

    const keyId = credentials.substring(0, colonIndex);
    const secret = credentials.substring(colonIndex + 1);

    if (!keyId || !secret) {
      throw createAppError(ErrorCodes.API_KEY_INVALID, 'Invalid API key credentials');
    }

    const db = getDatabaseClient();
    const validationResult = await apiKeyService.validateApiKey(db, keyId, secret);

    if (!validationResult.valid || !validationResult.keyId || !validationResult.tenantId) {
      if (validationResult.error?.code === ErrorCodes.API_KEY_INVALID) {
        throw createAppError(ErrorCodes.API_KEY_INVALID, 'Invalid API key');
      }
      if (validationResult.error?.code === ErrorCodes.API_KEY_REVOKED) {
        throw createAppError(ErrorCodes.API_KEY_REVOKED, 'API key has been revoked');
      }
      if (validationResult.error?.code === ErrorCodes.API_KEY_EXPIRED) {
        throw createAppError(ErrorCodes.API_KEY_EXPIRED, 'API key has expired');
      }
      if (validationResult.error?.code === ErrorCodes.API_KEY_ROTATION_GRACE_EXPIRED) {
        throw createAppError(
          ErrorCodes.API_KEY_ROTATION_GRACE_EXPIRED,
          'API key rotation grace period has expired',
        );
      }
      throw createAppError(ErrorCodes.API_KEY_INVALID, 'API key validation failed');
    }

    if (requiredPermissions.length > 0 && validationResult.scopes) {
      const hasPermission = hasAllScopePermissions(validationResult.scopes, requiredPermissions);
      if (!hasPermission) {
        throw createAppError(
          ErrorCodes.API_KEY_INSUFFICIENT_SCOPE,
          'Insufficient scope permissions',
        );
      }
    }

    const authInfo: {
      keyId: string;
      tenantId: string;
      ownerType: string;
      ownerId?: string;
      scopes: readonly ApiKeyScope[];
    } = {
      keyId: validationResult.keyId,
      tenantId: validationResult.tenantId,
      ownerType: validationResult.ownerType ?? 'service',
      scopes: validationResult.scopes ?? [],
    };

    if (validationResult.ownerId) {
      authInfo.ownerId = validationResult.ownerId;
    }

    request.apiKeyAuth = authInfo;
  };
}

export const apiKeyAuthMiddleware = createApiKeyAuthMiddleware();
