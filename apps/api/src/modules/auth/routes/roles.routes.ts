import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { authGuard, requirePermission } from '../../../shared/middleware/authorization.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { validateCsrf } from '../csrf.js';
import { idempotency } from '../../../shared/middleware/idempotency.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerRolesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/auth/roles',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.rolesListResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) => handlers.handleRolesList(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.get<{ Params: { roleId: string } }>(
    '/auth/roles/:roleId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.roleIdParamJsonSchema,
        response: {
          200: schemas.roleDetailsResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    (request, reply) =>
      handlers.handleRoleDetails(request, reply, { config, eventBus: fastify.eventBus }),
  );

  fastify.post(
    '/auth/roles',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'role:create'),
        idempotency,
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: schemas.roleCreateBodyJsonSchema,
        response: {
          201: schemas.roleCreateResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    (request, reply) =>
      handlers.handleRoleCreate(request, reply, { config, eventBus: fastify.eventBus }),
  );

  fastify.post<{ Params: { roleId: string } }>(
    '/auth/roles/:roleId/assign',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'role:assign'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.roleIdParamJsonSchema,
        body: schemas.roleAssignBodyJsonSchema,
        response: {
          201: schemas.roleAssignResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    (request, reply) =>
      handlers.handleRoleAssign(request, reply, { config, eventBus: fastify.eventBus }),
  );

  fastify.patch<{ Params: { roleId: string } }>(
    '/auth/roles/:roleId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'role:write'),
        idempotency,
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.roleIdParamJsonSchema,
        body: schemas.roleUpdateBodyJsonSchema,
        response: {
          200: schemas.roleAssignResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    (request, reply) =>
      handlers.handleRoleUpdate(request, reply, { config, eventBus: fastify.eventBus }),
  );
};
