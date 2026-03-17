import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  createFeatureFlag,
  getFeatureFlagById,
  getFeatureFlagByKey,
  listFeatureFlags,
  updateFeatureFlag,
  deleteFeatureFlag,
  setTenantOverride,
  getActiveFlagsForTenant,
  evaluateFlag,
  type CreateFeatureFlagInput,
  type UpdateFeatureFlagInput,
  type FeatureFlagOverrideInput,
} from './feature-flags.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const createFeatureFlagSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  key: z.string().min(1).max(128),
  enabledByDefault: z.boolean().optional().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).optional().default(0),
  userSegments: z.array(z.record(z.unknown())).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const updateFeatureFlagSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  enabledByDefault: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  userSegments: z.array(z.record(z.unknown())).optional(),
  isActive: z.boolean().optional(),
});

const tenantOverrideSchema = z.object({
  tenantId: z.string().uuid(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
});

const featureFlagResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  enabledByDefault: z.boolean(),
  rolloutPercentage: z.number().int(),
  tenantOverrides: z.record(z.unknown()),
  userSegments: z.array(z.record(z.unknown())),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const featureFlagListResponseSchema = z.array(featureFlagResponseSchema);

const featureFlagWithOverrideResponseSchema = featureFlagResponseSchema.extend({
  override: z
    .object({
      id: z.string().uuid(),
      flagId: z.string().uuid(),
      tenantId: z.string().uuid(),
      enabled: z.boolean(),
      rolloutPercentage: z.number().int().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
    .nullable(),
});

const activeFlagsResponseSchema = z.record(z.boolean());

export async function featureFlagsRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.get(
    '/admin/features',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: z
          .object({
            includeInactive: z.boolean().optional(),
          })
          .optional(),
        response: {
          200: featureFlagListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as { includeInactive?: boolean } | undefined;

      const options = query?.includeInactive === true ? { includeInactive: true } : undefined;

      const flags = await listFeatureFlags(config, user.tenantId, options);

      return flags.map((flag) => ({
        ...flag,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
      }));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/admin/features/:id',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: featureFlagWithOverrideResponseSchema,
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

      const flag = await getFeatureFlagById(config, user.tenantId, id);

      if (!flag) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Feature flag not found',
          statusCode: 404,
        });
      }

      return {
        ...flag,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
      };
    },
  );

  fastify.post(
    '/admin/features',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createFeatureFlagSchema,
        response: {
          201: featureFlagResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as CreateFeatureFlagInput;

      const existingFlag = await getFeatureFlagByKey(config, user.tenantId, body.key);
      if (existingFlag) {
        throw new AppError({
          code: ErrorCodes.CONFLICT,
          message: 'Feature flag with this key already exists',
          statusCode: 409,
        });
      }

      const flag = await createFeatureFlag(config, user.tenantId, body, user.userId);

      return {
        ...flag,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
      };
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/admin/features/:id',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updateFeatureFlagSchema,
        response: {
          200: featureFlagResponseSchema,
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
      const body = request.body as UpdateFeatureFlagInput;

      const flag = await updateFeatureFlag(config, user.tenantId, id, body, user.userId);

      if (!flag) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Feature flag not found',
          statusCode: 404,
        });
      }

      return {
        ...flag,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
      };
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/admin/features/:id',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          204: z.undefined(),
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

      const deleted = await deleteFeatureFlag(config, user.tenantId, id, user.userId);

      if (!deleted) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Feature flag not found',
          statusCode: 404,
        });
      }

      return _reply.status(204).send();
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/admin/features/:id/override',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: tenantOverrideSchema,
        response: {
          201: z.object({
            id: z.string().uuid(),
            flagId: z.string().uuid(),
            tenantId: z.string().uuid(),
            enabled: z.boolean(),
            rolloutPercentage: z.number().int().nullable(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
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
      const body = request.body as FeatureFlagOverrideInput;

      const override = await setTenantOverride(config, user.tenantId, id, body, user.userId);

      return {
        ...override,
        createdAt: override.createdAt.toISOString(),
        updatedAt: override.updatedAt.toISOString(),
      };
    },
  );

  fastify.get(
    '/features',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: activeFlagsResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const flags = await getActiveFlagsForTenant(config, user.tenantId);

      return flags;
    },
  );

  fastify.get<{ Params: { key: string } }>(
    '/features/:key',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          key: z.string().min(1).max(128),
        }),
        response: {
          200: z.object({
            key: z.string(),
            enabled: z.boolean(),
          }),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { key } = request.params;

      const enabled = await evaluateFlag(config, user.tenantId, key, user.userId);

      return {
        key,
        enabled,
      };
    },
  );
}
