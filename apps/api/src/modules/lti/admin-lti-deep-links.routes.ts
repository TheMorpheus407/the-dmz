import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  createLtiDeepLinkContent,
  getLtiDeepLinkContentById,
  listLtiDeepLinkContent,
  updateLtiDeepLinkContent,
  deleteLtiDeepLinkContent,
  type CreateLtiDeepLinkContentInput,
  type UpdateLtiDeepLinkContentInput,
} from './lti.service.js';
import {
  createLtiDeepLinkContentSchema,
  updateLtiDeepLinkContentSchema,
  ltiDeepLinkContentResponseSchema,
  ltiDeepLinkContentListResponseSchema,
} from './admin-lti-schemas.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

function getConfig(request: FastifyRequest): AppConfig {
  return request.server.config;
}

export async function registerAdminLtiDeepLinks(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/admin/lti/deep-link/content',
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
            platformId: { type: 'string', format: 'uuid' },
            available: { type: 'boolean' },
          },
        },
        response: {
          200: ltiDeepLinkContentListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as { platformId?: string; available?: boolean } | undefined;

      const content = await listLtiDeepLinkContent(
        getConfig(request),
        user.tenantId,
        query?.platformId,
        query?.available,
      );

      return content.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/admin/lti/deep-link/content/:id',
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
          200: ltiDeepLinkContentResponseSchema,
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

      const content = await getLtiDeepLinkContentById(getConfig(request), user.tenantId, id);

      if (!content) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI deep link content not found',
          statusCode: 404,
        });
      }

      return {
        ...content,
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.updatedAt.toISOString(),
      };
    },
  );

  fastify.post(
    '/admin/lti/deep-link/content',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createLtiDeepLinkContentSchema,
        response: {
          201: ltiDeepLinkContentResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as CreateLtiDeepLinkContentInput;

      const content = await createLtiDeepLinkContent(getConfig(request), user.tenantId, body);

      return {
        ...content,
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.updatedAt.toISOString(),
      };
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/admin/lti/deep-link/content/:id',
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
        body: updateLtiDeepLinkContentSchema,
        response: {
          200: ltiDeepLinkContentResponseSchema,
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
      const body = request.body as UpdateLtiDeepLinkContentInput;

      const content = await updateLtiDeepLinkContent(getConfig(request), user.tenantId, id, body);

      if (!content) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI deep link content not found',
          statusCode: 404,
        });
      }

      return {
        ...content,
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.updatedAt.toISOString(),
      };
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/admin/lti/deep-link/content/:id',
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

      const deleted = await deleteLtiDeepLinkContent(getConfig(request), user.tenantId, id);

      if (!deleted) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI deep link content not found',
          statusCode: 404,
        });
      }

      return _reply.status(204).send();
    },
  );
}
