import { OAuthInsufficientScopeError, OAuthScope } from '@the-dmz/shared/auth/oauth-scope-contract';

// eslint-disable-next-line import-x/no-restricted-paths
import { verifyOAuthToken } from '../auth/index.js';
// eslint-disable-next-line import-x/no-restricted-paths
import { createOAuthScopeDeniedEvent } from '../auth/auth.events.js';

import type { FastifyRequest, FastifyReply } from 'fastify';

export interface OAuthAuthenticatedRequest extends FastifyRequest {
  oauthClient?: {
    clientId: string;
    tenantId: string;
    scopes: readonly string[];
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    oauthClient?: {
      clientId: string;
      tenantId: string;
      scopes: readonly string[];
    };
  }
}

export const oauthGuard = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  const config = request.server.config;

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('OAuth unauthorized: Missing or invalid authorization header');
  }

  const bearerValue = authHeader.substring(7);

  try {
    const oauthPayload = await verifyOAuthToken(config, bearerValue);
    request.oauthClient = {
      clientId: oauthPayload.clientId,
      tenantId: oauthPayload.tenantId,
      scopes: oauthPayload.scopes,
    };
  } catch {
    throw new Error('OAuth unauthorized: Invalid or expired OAuth token');
  }
};

export const requireScope = (requiredScope: OAuthScope) => {
  return (request: FastifyRequest, reply: FastifyReply): void => {
    const client = request.oauthClient;

    if (!client) {
      reply.code(401).send({
        success: false,
        error: {
          code: 'OAUTH_INVALID_TOKEN',
          message: 'OAuth token not validated',
        },
      });
      return;
    }

    const hasScope = client.scopes.includes(requiredScope);

    if (!hasScope) {
      const eventBus = request.server.eventBus;
      eventBus.publish(
        createOAuthScopeDeniedEvent({
          source: 'scim-module',
          correlationId: request.id,
          tenantId: client.tenantId,
          version: 1,
          payload: {
            clientId: client.clientId,
            tenantId: client.tenantId,
            requestedScope: requiredScope,
            requiredScope: requiredScope,
          },
        }),
      );

      reply.code(403).send({
        success: false,
        error: {
          code: OAuthInsufficientScopeError.code,
          message: `Required scope: ${requiredScope}. Available scopes: ${client.scopes.join(', ')}`,
        },
      });
      return;
    }
  };
};

export const requireReadScope = requireScope(OAuthScope.SCIM_READ);
export const requireWriteScope = requireScope(OAuthScope.SCIM_WRITE);
