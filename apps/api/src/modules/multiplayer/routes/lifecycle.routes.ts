import { z } from 'zod';

import { authGuard } from '../../../shared/middleware/authorization.js';
import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../../shared/middleware/error-handler.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { createCoopSessionService } from '../coop-session.service.js';
import { createCoopSessionSchema, coopSessionResultSchema } from '../coop-session.schemas.js';

import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../../auth/index.js';

export const registerLifecycleRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post(
    '/api/v1/coop/sessions',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createCoopSessionSchema,
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const input = request.body as z.infer<typeof createCoopSessionSchema>;
      const db = getDatabaseClient(config);
      const eventBus = fastify.eventBus;
      const service = createCoopSessionService(config, db, eventBus);

      const result = await service.createSession(user.tenantId, user.userId, {
        partyId: input.partyId,
        seed: input.seed,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to create co-op session',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.get<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
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
      const db = getDatabaseClient(config);
      const eventBus = fastify.eventBus;
      const service = createCoopSessionService(config, db, eventBus);

      const result = await service.getSession(user.tenantId, sessionId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Co-op session not found',
          statusCode: 404,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/end',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
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
      const db = getDatabaseClient(config);
      const eventBus = fastify.eventBus;
      const service = createCoopSessionService(config, db, eventBus);

      const result = await service.endSession(user.tenantId, sessionId, user.userId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to end session',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.delete<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
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
      const db = getDatabaseClient(config);
      const eventBus = fastify.eventBus;
      const service = createCoopSessionService(config, db, eventBus);

      const result = await service.abandonSession(user.tenantId, sessionId, user.userId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to abandon session',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );
};
