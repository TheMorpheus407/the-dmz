import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  createLtiLineItem,
  getLtiLineItemById,
  listLtiLineItems,
  updateLtiLineItem,
  deleteLtiLineItem,
  type CreateLtiLineItemInput,
  type UpdateLtiLineItemInput,
} from './lti.service.js';
import {
  createLtiLineItemSchema,
  updateLtiLineItemSchema,
  ltiLineItemResponseSchema,
  ltiLineItemListResponseSchema,
} from './admin-lti-schemas.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

function getConfig(request: FastifyRequest): AppConfig {
  return request.server.config;
}

export async function registerAdminLtiLineItems(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/admin/lti/lineitems',
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
          },
        },
        response: {
          200: ltiLineItemListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as { platformId?: string } | undefined;

      const lineItems = await listLtiLineItems(
        getConfig(request),
        user.tenantId,
        query?.platformId,
      );

      return lineItems.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        startDate: item.startDate?.toISOString() ?? null,
        endDate: item.endDate?.toISOString() ?? null,
      }));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/admin/lti/lineitems/:id',
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
          200: ltiLineItemResponseSchema,
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

      const lineItem = await getLtiLineItemById(getConfig(request), user.tenantId, id);

      if (!lineItem) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI line item not found',
          statusCode: 404,
        });
      }

      return {
        ...lineItem,
        createdAt: lineItem.createdAt.toISOString(),
        updatedAt: lineItem.updatedAt.toISOString(),
        startDate: lineItem.startDate?.toISOString() ?? null,
        endDate: lineItem.endDate?.toISOString() ?? null,
      };
    },
  );

  fastify.post(
    '/admin/lti/lineitems',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createLtiLineItemSchema,
        response: {
          201: ltiLineItemResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as CreateLtiLineItemInput;

      const lineItem = await createLtiLineItem(getConfig(request), user.tenantId, {
        platformId: body.platformId,
        ...(body.resourceLinkId && { resourceLinkId: body.resourceLinkId }),
        label: body.label,
        ...(body.scoreMaximum !== undefined && { scoreMaximum: body.scoreMaximum }),
        ...(body.resourceId && { resourceId: body.resourceId }),
        ...(body.tag && { tag: body.tag }),
        ...(body.startDate && { startDate: body.startDate }),
        ...(body.endDate && { endDate: body.endDate }),
      });

      return {
        ...lineItem,
        createdAt: lineItem.createdAt.toISOString(),
        updatedAt: lineItem.updatedAt.toISOString(),
        startDate: lineItem.startDate?.toISOString() ?? null,
        endDate: lineItem.endDate?.toISOString() ?? null,
      };
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/admin/lti/lineitems/:id',
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
        body: updateLtiLineItemSchema,
        response: {
          200: ltiLineItemResponseSchema,
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
      const body = request.body as UpdateLtiLineItemInput;

      const lineItem = await updateLtiLineItem(getConfig(request), user.tenantId, id, {
        ...(body.label && { label: body.label }),
        ...(body.scoreMaximum !== undefined && { scoreMaximum: body.scoreMaximum }),
        ...(body.resourceId && { resourceId: body.resourceId }),
        ...(body.tag && { tag: body.tag }),
        ...(body.startDate && { startDate: body.startDate }),
        ...(body.endDate && { endDate: body.endDate }),
      });

      if (!lineItem) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI line item not found',
          statusCode: 404,
        });
      }

      return {
        ...lineItem,
        createdAt: lineItem.createdAt.toISOString(),
        updatedAt: lineItem.updatedAt.toISOString(),
        startDate: lineItem.startDate?.toISOString() ?? null,
        endDate: lineItem.endDate?.toISOString() ?? null,
      };
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/admin/lti/lineitems/:id',
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

      const deleted = await deleteLtiLineItem(getConfig(request), user.tenantId, id);

      if (!deleted) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'LTI line item not found',
          statusCode: 404,
        });
      }

      return _reply.status(204).send();
    },
  );
}
