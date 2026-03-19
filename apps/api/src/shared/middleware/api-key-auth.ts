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
      serviceAccountId?: string;
      scopes: readonly ApiKeyScope[];
      ipAllowlist?: readonly string[];
      refererRestrictions?: readonly string[];
      rateLimitRequestsPerWindow?: number;
      rateLimitWindowMs?: number;
    };
  }
}

export interface ApiKeyAuthOptions {
  requiredPermissions?: ApiKeyPermission[];
}

function getClientIp(request: FastifyRequest): string | null {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    if (ips) {
      const firstIp = ips.split(',')[0];
      return firstIp ? firstIp.trim() : null;
    }
  }
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? (realIp[0] ?? null) : realIp;
  }
  return request.ip ?? null;
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number) as [number, number, number, number];
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split('/') as [string, string];
  const range = parts[0];
  const bitsStr = parts[1];
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1);

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

function validateIpAllowlist(
  clientIp: string | null,
  allowlist: readonly string[] | undefined,
): boolean {
  if (!allowlist || allowlist.length === 0) {
    return true;
  }
  if (!clientIp) {
    return false;
  }
  return allowlist.some((pattern) => {
    if (pattern.includes('/')) {
      return isIpInCidr(clientIp, pattern);
    }
    return clientIp === pattern;
  });
}

function validateRefererRestrictions(
  referer: string | null,
  restrictions: readonly string[] | undefined,
): boolean {
  if (!restrictions || restrictions.length === 0) {
    return true;
  }
  if (!referer) {
    return false;
  }
  return restrictions.some((pattern) => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$');
    return regex.test(referer);
  });
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

    if (validationResult.ipAllowlist && validationResult.ipAllowlist.length > 0) {
      const clientIp = getClientIp(request);
      if (!validateIpAllowlist(clientIp, validationResult.ipAllowlist)) {
        throw createAppError(ErrorCodes.API_KEY_INVALID, 'IP address not allowed');
      }
    }

    if (validationResult.refererRestrictions && validationResult.refererRestrictions.length > 0) {
      const referer = request.headers.referer ?? null;
      if (!validateRefererRestrictions(referer, validationResult.refererRestrictions)) {
        throw createAppError(ErrorCodes.API_KEY_INVALID, 'Referer not allowed');
      }
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
      serviceAccountId?: string;
      scopes: readonly ApiKeyScope[];
      ipAllowlist?: readonly string[];
      refererRestrictions?: readonly string[];
      rateLimitRequestsPerWindow?: number;
      rateLimitWindowMs?: number;
    } = {
      keyId: validationResult.keyId,
      tenantId: validationResult.tenantId,
      ownerType: validationResult.ownerType ?? 'service',
      scopes: validationResult.scopes ?? [],
    };

    if (validationResult.ownerId) {
      authInfo.ownerId = validationResult.ownerId;
    }

    if (validationResult.serviceAccountId) {
      authInfo.serviceAccountId = validationResult.serviceAccountId;
    }

    if (validationResult.ipAllowlist) {
      authInfo.ipAllowlist = validationResult.ipAllowlist;
    }

    if (validationResult.refererRestrictions) {
      authInfo.refererRestrictions = validationResult.refererRestrictions;
    }

    if (validationResult.rateLimitRequestsPerWindow !== undefined) {
      authInfo.rateLimitRequestsPerWindow = validationResult.rateLimitRequestsPerWindow;
    }

    if (validationResult.rateLimitWindowMs !== undefined) {
      authInfo.rateLimitWindowMs = validationResult.rateLimitWindowMs;
    }

    request.apiKeyAuth = authInfo;
  };
}

export const apiKeyAuthMiddleware = createApiKeyAuthMiddleware();
