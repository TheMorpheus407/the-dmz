import { z } from 'zod';

import { authGuard } from '../../../shared/middleware/authorization.js';
import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../../shared/middleware/error-handler.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { createCoopSessionService } from '../coop-session.service.js';
import { startCoopSessionSchema, coopSessionResultSchema } from '../coop-session.schemas.js';

import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../../auth/index.js';

export const registerSessionRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/:sessionId/start',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: startCoopSessionSchema,
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
      const input = request.body as z.infer<typeof startCoopSessionSchema>;
      const db = getDatabaseClient(config);
      const eventBus = fastify.eventBus;
      const service = createCoopSessionService(config, db, eventBus);

      const result = await service.startSession(user.tenantId, sessionId, user.userId, {
        scenarioId: input.scenarioId,
        difficultyTier: input.difficultyTier,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to start co-op session',
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
          scenarioId: result.session!.scenarioId,
          difficultyTier: result.session!.difficultyTier,
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
    '/api/v1/coop/sessions/:sessionId/advance-day',
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

      const result = await service.advanceDay(user.tenantId, sessionId, user.userId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to advance day',
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
