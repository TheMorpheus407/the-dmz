import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import {
  type CreateApiKeyInput,
  type RevokeApiKeyInput,
  type RotateApiKeyInput,
} from '@the-dmz/shared/auth/api-key-contract';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';
import {
  createApiKeyJsonSchema,
  rotateApiKeyJsonSchema,
  revokeApiKeyJsonSchema,
  apiKeyResponseJsonSchema,
  apiKeyListResponseJsonSchema,
  apiKeyWithSecretJsonSchema,
} from '@the-dmz/shared/schemas';
import type { AuthenticatedUserWithMfa } from '@the-dmz/shared/types/auth';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { preAuthTenantResolver } from '../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { createAppError } from '../../shared/middleware/error-handler.js';

import { apiKeyService } from './api-key.service.js';
import {
  createAuthApiKeyCreatedEvent,
  createAuthApiKeyRotatedEvent,
  createAuthApiKeyRevokedEvent,
} from './auth.events.js';

async function apiKeyRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: {
      cursor?: string;
      limit?: number;
      ownerType?: string;
      ownerId?: string;
      status?: string;
    };
  }>(
    '/auth/api-keys',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
      schema: {
        response: {
          200: apiKeyListResponseJsonSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          cursor?: string;
          limit?: number;
          ownerType?: string;
          ownerId?: string;
          status?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId } = user;
      const db = getDatabaseClient();

      const queryOptions: {
        cursor?: string;
        limit?: number;
        ownerType?: 'service' | 'user';
        ownerId?: string;
        status?: 'active' | 'rotating' | 'revoked' | 'expired';
      } = {};
      if (request.query.cursor) queryOptions.cursor = request.query.cursor;
      if (request.query.limit) queryOptions.limit = request.query.limit;
      if (request.query.ownerType)
        queryOptions.ownerType = request.query.ownerType as 'service' | 'user';
      if (request.query.ownerId) queryOptions.ownerId = request.query.ownerId;
      if (request.query.status)
        queryOptions.status = request.query.status as 'active' | 'rotating' | 'revoked' | 'expired';

      const result = await apiKeyService.listApiKeys(db, tenantId, queryOptions);

      return reply.send(result);
    },
  );

  fastify.post<{
    Body: CreateApiKeyInput;
  }>(
    '/auth/api-keys',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
      schema: {
        body: createApiKeyJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Body: CreateApiKeyInput;
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const db = getDatabaseClient();

      const result = await apiKeyService.createApiKey(db, request.body, userId, tenantId);

      const eventBus = fastify.eventBus;
      const eventPayload: {
        keyId: string;
        name: string;
        tenantId: string;
        ownerType: string;
        ownerId?: string;
        scopes: string[];
        createdBy: string;
      } = {
        keyId: result.keyId,
        name: result.name,
        tenantId,
        ownerType: result.ownerType,
        scopes: JSON.parse(JSON.stringify(result.scopes)) as string[],
        createdBy: userId,
      };
      if (result.ownerId) {
        eventPayload.ownerId = result.ownerId;
      }
      eventBus.publish(
        createAuthApiKeyCreatedEvent({
          source: 'api-key.service',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: eventPayload,
        }),
      );

      return reply.code(201).send(result);
    },
  );

  fastify.get<{
    Params: { keyId: string };
  }>(
    '/auth/api-keys/:keyId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
      schema: {
        params: {
          type: 'object',
          properties: {
            keyId: { type: 'string', format: 'uuid' },
          },
          required: ['keyId'],
        },
        response: {
          200: apiKeyResponseJsonSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { keyId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId } = user;
      const { keyId } = request.params;
      const db = getDatabaseClient();

      const result = await apiKeyService.getApiKeyById(db, keyId, tenantId);

      if (!result) {
        throw createAppError(ErrorCodes.API_KEY_NOT_FOUND, 'API key not found');
      }

      return reply.send(result);
    },
  );

  fastify.post<{
    Params: { keyId: string };
    Body: RotateApiKeyInput;
  }>(
    '/auth/api-keys/:keyId/rotate',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
      schema: {
        params: {
          type: 'object',
          properties: {
            keyId: { type: 'string', format: 'uuid' },
          },
          required: ['keyId'],
        },
        body: rotateApiKeyJsonSchema,
        response: {
          200: apiKeyWithSecretJsonSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { keyId: string };
        Body: RotateApiKeyInput;
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { keyId } = request.params;
      const db = getDatabaseClient();

      const result = await apiKeyService.rotateApiKey(db, keyId, request.body, tenantId);

      const eventBus = fastify.eventBus;
      const rotatePayload: {
        keyId: string;
        name: string;
        tenantId: string;
        ownerType: string;
        ownerId?: string;
        rotatedBy: string;
      } = {
        keyId: result.keyId,
        name: result.name,
        tenantId,
        ownerType: result.ownerType,
        rotatedBy: userId,
      };
      if (result.ownerId) {
        rotatePayload.ownerId = result.ownerId;
      }
      eventBus.publish(
        createAuthApiKeyRotatedEvent({
          source: 'api-key.service',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: rotatePayload,
        }),
      );

      return reply.send(result);
    },
  );

  fastify.post<{
    Params: { keyId: string };
    Body: RevokeApiKeyInput;
  }>(
    '/auth/api-keys/:keyId/revoke',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
      schema: {
        params: {
          type: 'object',
          properties: {
            keyId: { type: 'string', format: 'uuid' },
          },
          required: ['keyId'],
        },
        body: revokeApiKeyJsonSchema,
        response: {
          200: apiKeyResponseJsonSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { keyId: string };
        Body: RevokeApiKeyInput;
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { keyId } = request.params;
      const db = getDatabaseClient();

      const result = await apiKeyService.revokeApiKey(db, keyId, request.body, userId, tenantId);

      const eventBus = fastify.eventBus;
      const revokePayload: {
        keyId: string;
        name: string;
        tenantId: string;
        ownerType: string;
        ownerId?: string;
        revokedBy: string;
        reason?: string;
      } = {
        keyId: result.keyId,
        name: result.name,
        tenantId,
        ownerType: result.ownerType,
        revokedBy: userId,
      };
      if (result.ownerId) {
        revokePayload.ownerId = result.ownerId;
      }
      if (request.body.reason) {
        revokePayload.reason = request.body.reason;
      }
      eventBus.publish(
        createAuthApiKeyRevokedEvent({
          source: 'api-key.service',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: revokePayload,
        }),
      );

      return reply.send(result);
    },
  );

  fastify.delete<{
    Params: { keyId: string };
  }>(
    '/auth/api-keys/:keyId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
      schema: {
        params: {
          type: 'object',
          properties: {
            keyId: { type: 'string', format: 'uuid' },
          },
          required: ['keyId'],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { keyId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId } = user;
      const { keyId } = request.params;
      const db = getDatabaseClient();

      await apiKeyService.deleteApiKey(db, keyId, tenantId);

      return reply.code(204).send();
    },
  );
}

export default apiKeyRoutes;
