import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  createLtiPlatform,
  getLtiPlatformById,
  listLtiPlatforms,
  updateLtiPlatform,
  deleteLtiPlatform,
  type CreateLtiPlatformInput,
  type UpdateLtiPlatformInput,
} from './lti.service.js';
import {
  createLtiPlatformSchema,
  updateLtiPlatformSchema,
  ltiPlatformResponseSchema,
  ltiPlatformListResponseSchema,
} from './admin-lti-schemas.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

function getConfig(request: FastifyRequest): AppConfig {
  return request.server.config;
}

export async function registerAdminLtiPlatforms(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/admin/lti/platforms',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            includeInactive: { type: 'boolean' },
          },
        },
        response: {
          200: ltiPlatformListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const platforms = await listLtiPlatforms(getConfig(request), user.tenantId);

      return platforms.map((platform) => ({
        ...platform,
        createdAt: platform.createdAt.toISOString(),
        updatedAt: platform.updatedAt.toISOString(),
        lastValidatedAt: platform.lastValidatedAt?.toISOString() ?? null,
      }));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/admin/lti/platforms/:id',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: ltiPlatformResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      const platform = await getLtiPlatformById(getConfig(request), user.tenantId, id);

      if (!platform) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI platform not found',
          statusCode: 404,
        });
      }

      return {
        ...platform,
        createdAt: platform.createdAt.toISOString(),
        updatedAt: platform.updatedAt.toISOString(),
        lastValidatedAt: platform.lastValidatedAt?.toISOString() ?? null,
      };
    },
  );

  fastify.post(
    '/admin/lti/platforms',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createLtiPlatformSchema,
        response: {
          201: ltiPlatformResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          409: errorResponseSchemas.Conflict,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as CreateLtiPlatformInput;

      const platform = await createLtiPlatform(getConfig(request), user.tenantId, body);

      return {
        ...platform,
        createdAt: platform.createdAt.toISOString(),
        updatedAt: platform.updatedAt.toISOString(),
        lastValidatedAt: platform.lastValidatedAt?.toISOString() ?? null,
      };
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/admin/lti/platforms/:id',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: updateLtiPlatformSchema,
        response: {
          200: ltiPlatformResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;
      const body = request.body as UpdateLtiPlatformInput;

      const platform = await updateLtiPlatform(getConfig(request), user.tenantId, id, body);

      if (!platform) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI platform not found',
          statusCode: 404,
        });
      }

      return {
        ...platform,
        createdAt: platform.createdAt.toISOString(),
        updatedAt: platform.updatedAt.toISOString(),
        lastValidatedAt: platform.lastValidatedAt?.toISOString() ?? null,
      };
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/admin/lti/platforms/:id',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: { type: 'null' },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      const deleted = await deleteLtiPlatform(getConfig(request), user.tenantId, id);

      if (!deleted) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI platform not found',
          statusCode: 404,
        });
      }

      return _reply.status(204).send();
    },
  );
}
