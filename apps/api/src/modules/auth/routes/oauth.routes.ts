import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { authGuard } from '../../../shared/middleware/authorization.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerOauthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.post<{
    Body: { grant_type: string; client_id: string; client_secret: string; scope?: string };
  }>(
    '/auth/oauth/token',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 20,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: schemas.oauthTokenBodyJsonSchema,
        response: {
          200: schemas.oauthTokenResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
        },
      },
    },
    (request) => handlers.handleOAuthToken(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.get(
    '/auth/oauth/clients',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.oauthClientsListResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientsList(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.post<{ Body: { name: string; scopes: string[] } }>(
    '/auth/oauth/clients',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: schemas.oauthClientCreateBodyJsonSchema,
        response: {
          201: schemas.oauthClientCreateResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) =>
      handlers.handleOAuthClientCreate(request, reply, { config, eventBus: fastify.eventBus }),
  );

  fastify.post<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id/rotate',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.oauthClientIdParamJsonSchema,
        response: {
          200: schemas.oauthClientRotateResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientRotate(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.post<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id/revoke',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.oauthClientIdParamJsonSchema,
        response: {
          200: schemas.oauthClientRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientRevoke(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.delete<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.oauthClientIdParamJsonSchema,
        response: {
          200: schemas.oauthClientRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientDelete(request, { config, eventBus: fastify.eventBus }),
  );
};
