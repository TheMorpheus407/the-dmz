import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { authGuard, requirePermission } from '../../../shared/middleware/authorization.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { validateCsrf } from '../csrf.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerAdminSessionsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post<{
    Body: { userId?: string; email?: string; sourceType: string; ssoProviderId?: string };
  }>(
    '/auth/admin/sessions/revoke',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: schemas.federatedRevocationBodyJsonSchema,
        response: {
          200: schemas.federatedRevocationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) =>
      handlers.handleFederatedSessionRevoke(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.delete<{ Params: { userId: string } }>(
    '/auth/admin/sessions/:userId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.userIdParamJsonSchema,
        response: {
          200: schemas.sessionRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) =>
      handlers.handleAdminSessionRevokeByUser(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.get<{
    Querystring: { userId?: string; status?: string; cursor?: string; limit?: number };
  }>(
    '/auth/admin/sessions',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:read'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: schemas.sessionListQueryJsonSchema,
        response: {
          200: schemas.sessionListResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleAdminSessionList(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/auth/admin/sessions/:sessionId/revoke',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.sessionIdParamJsonSchema,
        response: {
          200: schemas.sessionSingleRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) =>
      handlers.handleAdminSessionRevokeSingle(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.delete<{ Params: { userId: string } }>(
    '/auth/admin/sessions/user/:userId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.userIdParamJsonSchema,
        response: {
          200: schemas.sessionUserAllRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) =>
      handlers.handleAdminSessionRevokeUserAll(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.delete(
    '/auth/admin/sessions',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'sessions:revoke:tenant'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.sessionTenantAllRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) =>
      handlers.handleAdminSessionRevokeTenantAll(request, { config, eventBus: fastify.eventBus }),
  );
};
