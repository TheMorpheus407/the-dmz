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
  createLtiLineItem,
  getLtiLineItemById,
  listLtiLineItems,
  updateLtiLineItem,
  deleteLtiLineItem,
  createLtiDeepLinkContent,
  getLtiDeepLinkContentById,
  listLtiDeepLinkContent,
  updateLtiDeepLinkContent,
  deleteLtiDeepLinkContent,
  createLtiScore,
  listLtiScores,
  listLtiSessions,
  type CreateLtiPlatformInput,
  type UpdateLtiPlatformInput,
  type CreateLtiLineItemInput,
  type UpdateLtiLineItemInput,
  type CreateLtiScoreInput,
  type CreateLtiDeepLinkContentInput,
  type UpdateLtiDeepLinkContentInput,
} from './lti.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

function getConfig(request: FastifyRequest): AppConfig {
  return request.server.config;
}

const createLtiPlatformSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    platformUrl: { type: 'string', maxLength: 2048 },
    clientId: { type: 'string', minLength: 1, maxLength: 255 },
    deploymentId: { type: 'string', maxLength: 255 },
    publicKeysetUrl: { type: 'string', maxLength: 2048 },
    authTokenUrl: { type: 'string', maxLength: 2048 },
    authLoginUrl: { type: 'string', maxLength: 2048 },
    toolUrl: { type: 'string', maxLength: 2048 },
  },
  required: ['name', 'platformUrl', 'clientId', 'publicKeysetUrl', 'authTokenUrl', 'authLoginUrl'],
};

const updateLtiPlatformSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    platformUrl: { type: 'string', maxLength: 2048 },
    clientId: { type: 'string', minLength: 1, maxLength: 255 },
    deploymentId: { type: 'string', maxLength: 255 },
    publicKeysetUrl: { type: 'string', maxLength: 2048 },
    authTokenUrl: { type: 'string', maxLength: 2048 },
    authLoginUrl: { type: 'string', maxLength: 2048 },
    toolUrl: { type: 'string', maxLength: 2048 },
    isActive: { type: 'boolean' },
  },
};

const ltiPlatformResponseSchema = {
  type: 'object',
  properties: {
    platformId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    platformUrl: { type: 'string' },
    clientId: { type: 'string' },
    deploymentId: { type: 'string', nullable: true },
    publicKeysetUrl: { type: 'string' },
    authTokenUrl: { type: 'string' },
    authLoginUrl: { type: 'string' },
    jwks: { type: 'object' },
    toolUrl: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    lastValidationStatus: { type: 'string', nullable: true },
    lastValidatedAt: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'platformId',
    'tenantId',
    'name',
    'platformUrl',
    'clientId',
    'deploymentId',
    'publicKeysetUrl',
    'authTokenUrl',
    'authLoginUrl',
    'jwks',
    'toolUrl',
    'isActive',
    'lastValidationStatus',
    'lastValidatedAt',
    'createdAt',
    'updatedAt',
  ],
};

const ltiPlatformListResponseSchema = {
  type: 'array',
  items: ltiPlatformResponseSchema,
};

const createLtiLineItemSchema = {
  type: 'object',
  properties: {
    platformId: { type: 'string', format: 'uuid' },
    resourceLinkId: { type: 'string', maxLength: 255 },
    label: { type: 'string', minLength: 1, maxLength: 255 },
    scoreMaximum: { type: 'integer', minimum: 1, maximum: 1000 },
    resourceId: { type: 'string', maxLength: 255 },
    tag: { type: 'string', maxLength: 255 },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
  required: ['platformId', 'label'],
};

const updateLtiLineItemSchema = {
  type: 'object',
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 255 },
    scoreMaximum: { type: 'integer', minimum: 1, maximum: 1000 },
    resourceId: { type: 'string', maxLength: 255 },
    tag: { type: 'string', maxLength: 255 },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
};

const ltiLineItemResponseSchema = {
  type: 'object',
  properties: {
    lineItemId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    platformId: { type: 'string', format: 'uuid' },
    resourceLinkId: { type: 'string', nullable: true },
    label: { type: 'string' },
    scoreMaximum: { type: 'number' },
    resourceId: { type: 'string', nullable: true },
    tag: { type: 'string', nullable: true },
    startDate: { type: 'string', format: 'date-time', nullable: true },
    endDate: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'lineItemId',
    'tenantId',
    'platformId',
    'resourceLinkId',
    'label',
    'scoreMaximum',
    'resourceId',
    'tag',
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
  ],
};

const ltiLineItemListResponseSchema = {
  type: 'array',
  items: ltiLineItemResponseSchema,
};

const createLtiDeepLinkContentSchema = {
  type: 'object',
  properties: {
    platformId: { type: 'string', format: 'uuid' },
    contentType: { type: 'string', minLength: 1, maxLength: 50 },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    url: { type: 'string', maxLength: 2048, format: 'uri' },
    lineItemId: { type: 'string', format: 'uuid' },
    customParams: { type: 'object' },
    available: { type: 'boolean' },
  },
  required: ['platformId', 'contentType', 'title'],
};

const updateLtiDeepLinkContentSchema = {
  type: 'object',
  properties: {
    contentType: { type: 'string', minLength: 1, maxLength: 50 },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    url: { type: 'string', maxLength: 2048, format: 'uri' },
    lineItemId: { type: 'string', format: 'uuid' },
    customParams: { type: 'object' },
    available: { type: 'boolean' },
  },
};

const ltiDeepLinkContentResponseSchema = {
  type: 'object',
  properties: {
    contentId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    platformId: { type: 'string', format: 'uuid' },
    contentType: { type: 'string' },
    title: { type: 'string' },
    url: { type: 'string', nullable: true },
    lineItemId: { type: 'string', format: 'uuid', nullable: true },
    customParams: { type: 'object' },
    available: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'contentId',
    'tenantId',
    'platformId',
    'contentType',
    'title',
    'url',
    'lineItemId',
    'customParams',
    'available',
    'createdAt',
    'updatedAt',
  ],
};

const ltiDeepLinkContentListResponseSchema = {
  type: 'array',
  items: ltiDeepLinkContentResponseSchema,
};

const createLtiScoreSchema = {
  type: 'object',
  properties: {
    lineItemId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', minLength: 1, maxLength: 255 },
    scoreGiven: { type: 'number', minimum: 0 },
    scoreMaximum: { type: 'integer', minimum: 1, maximum: 1000 },
    activityProgress: { type: 'string' },
    gradingProgress: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
  },
  required: ['lineItemId', 'userId'],
};

const ltiScoreResponseSchema = {
  type: 'object',
  properties: {
    scoreId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    lineItemId: { type: 'string', format: 'uuid' },
    userId: { type: 'string' },
    scoreGiven: { type: 'string', nullable: true },
    scoreMaximum: { type: 'number' },
    activityProgress: { type: 'string' },
    gradingProgress: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'scoreId',
    'tenantId',
    'lineItemId',
    'userId',
    'scoreGiven',
    'scoreMaximum',
    'activityProgress',
    'gradingProgress',
    'timestamp',
    'createdAt',
  ],
};

const ltiScoreListResponseSchema = {
  type: 'array',
  items: ltiScoreResponseSchema,
};

const ltiSessionResponseSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    platformId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', nullable: true },
    resourceLinkId: { type: 'string', nullable: true },
    contextId: { type: 'string', nullable: true },
    roles: { type: 'array', items: { type: 'object' } },
    launchId: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'sessionId',
    'tenantId',
    'platformId',
    'userId',
    'resourceLinkId',
    'contextId',
    'roles',
    'launchId',
    'createdAt',
  ],
};

const ltiSessionListResponseSchema = {
  type: 'array',
  items: ltiSessionResponseSchema,
};

export async function registerAdminLtiRoutes(fastify: FastifyInstance): Promise<void> {
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

  fastify.get(
    '/admin/lti/scores',
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
            lineItemId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: ltiScoreListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as { lineItemId?: string } | undefined;

      const scores = await listLtiScores(getConfig(request), user.tenantId, query?.lineItemId);

      return scores.map((score) => ({
        ...score,
        timestamp: score.timestamp.toISOString(),
        createdAt: score.createdAt.toISOString(),
      }));
    },
  );

  fastify.post(
    '/admin/lti/scores',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createLtiScoreSchema,
        response: {
          201: ltiScoreResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as CreateLtiScoreInput;

      const score = await createLtiScore(getConfig(request), user.tenantId, {
        lineItemId: body.lineItemId,
        userId: body.userId,
        ...(body.scoreGiven !== undefined && { scoreGiven: body.scoreGiven }),
        ...(body.scoreMaximum !== undefined && { scoreMaximum: body.scoreMaximum }),
        ...(body.activityProgress && { activityProgress: body.activityProgress }),
        ...(body.gradingProgress && { gradingProgress: body.gradingProgress }),
        ...(body.timestamp && { timestamp: body.timestamp }),
      });

      return {
        ...score,
        timestamp: score.timestamp.toISOString(),
        createdAt: score.createdAt.toISOString(),
      };
    },
  );

  fastify.get(
    '/admin/lti/sessions',
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
          200: ltiSessionListResponseSchema,
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

      const sessions = await listLtiSessions(getConfig(request), user.tenantId, query?.platformId);

      return sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
      }));
    },
  );
}
