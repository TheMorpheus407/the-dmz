import { z } from 'zod';

import { authGuard } from '../../../shared/middleware/authorization.js';
import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../../shared/middleware/error-handler.js';
import {
  getSessionRoleConfig,
  getRolePermissionsForSession,
  overrideSessionRoleConfig,
  type RoleConfigOverrideInput,
  DEFAULT_PERMISSION_MATRIX,
} from '../permissions/index.js';

import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../../auth/index.js';

export const registerPermissionsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get<{ Params: { sessionId: string } }>(
    '/api/v1/coop/:sessionId/permissions',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            config: z.record(z.unknown()),
            error: z.string().optional(),
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
      const { sessionId } = request.params;

      const result = await getSessionRoleConfig(config, user.tenantId, sessionId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Session not found',
          statusCode: 404,
        });
      }

      return {
        success: true,
        config: result.config ?? DEFAULT_PERMISSION_MATRIX,
      };
    },
  );

  fastify.get<{ Params: { sessionId: string; role: string } }>(
    '/api/v1/coop/:sessionId/permissions/:role',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
          role: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            config: z.record(z.unknown()).optional(),
            error: z.string().optional(),
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
      const { sessionId, role } = request.params;

      const validRoles = ['triage_lead', 'verification_lead'] as const;
      if (!validRoles.includes(role as (typeof validRoles)[number])) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Invalid role specified',
          statusCode: 400,
        });
      }

      const result = await getRolePermissionsForSession(
        config,
        user.tenantId,
        sessionId,
        role as 'triage_lead' | 'verification_lead',
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Session not found',
          statusCode: 404,
        });
      }

      return {
        success: true,
        config: result.config,
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/:sessionId/permissions/override',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: z.object({
          roles: z.record(z.record(z.array(z.string()))).optional(),
          authorityRole: z.string().optional(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            config: z.record(z.unknown()).optional(),
            error: z.string().optional(),
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
      const { sessionId } = request.params;
      const input = request.body as RoleConfigOverrideInput;
      const eventBus = fastify.eventBus;

      const result = await overrideSessionRoleConfig(
        config,
        user.tenantId,
        sessionId,
        user.userId,
        input,
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to override role config',
          statusCode: 400,
        });
      }

      return {
        success: true,
        config: result.config,
      };
    },
  );
};
