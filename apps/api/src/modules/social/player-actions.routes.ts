import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import { getPlayerModerationHistory, getModerationActions } from './moderation.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const reportTypeSchema = z.enum(['harassment', 'spam', 'cheating', 'content', 'other']);
const reportStatusSchema = z.enum([
  'pending',
  'under_review',
  'resolved_actioned',
  'resolved_dismissed',
]);

const moderationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const moderationQueueQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  reportType: reportTypeSchema.optional(),
  assignedModeratorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const playerIdParamsSchema = z.object({
  playerId: z.string().uuid(),
});

const actionHistoryResponseSchema = z.object({
  success: z.boolean(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      playerId: z.string().uuid(),
      moderatorId: z.string().uuid(),
      tenantId: z.string().uuid(),
      actionType: z.string(),
      reason: z.string().nullable(),
      reportId: z.string().uuid().nullable(),
      expiresAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
});

export {
  moderationHistoryQuerySchema,
  moderationQueueQuerySchema,
  playerIdParamsSchema,
  actionHistoryResponseSchema,
};

export async function playerActionsRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.get<{
    Params: z.infer<typeof playerIdParamsSchema>;
    Querystring: z.infer<typeof moderationHistoryQuerySchema>;
  }>(
    '/api/v1/moderation/players/:playerId/history',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: playerIdParamsSchema,
        querystring: moderationHistoryQuerySchema,
        response: {
          200: actionHistoryResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      if (user.role !== 'moderator' && user.role !== 'admin') {
        throw new AppError({
          code: ErrorCodes.AUTH_INSUFFICIENT_PERMS,
          message: 'Moderator role required',
          statusCode: 403,
        });
      }

      const { limit } = request.query;

      const actions = await getPlayerModerationHistory(
        config,
        user.tenantId,
        request.params.playerId,
        limit,
      );

      return {
        success: true,
        items: actions.map((a) => ({
          id: a.id,
          playerId: a.playerId,
          moderatorId: a.moderatorId,
          tenantId: a.tenantId,
          actionType: a.actionType,
          reason: a.reason,
          reportId: a.reportId,
          expiresAt: a.expiresAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    },
  );

  fastify.get<{ Querystring: z.infer<typeof moderationQueueQuerySchema> }>(
    '/api/v1/moderation/actions',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: moderationQueueQuerySchema,
        response: {
          200: z.object({
            success: z.boolean(),
            items: z.array(
              z.object({
                id: z.string().uuid(),
                playerId: z.string().uuid(),
                moderatorId: z.string().uuid(),
                tenantId: z.string().uuid(),
                actionType: z.string(),
                reason: z.string().nullable(),
                reportId: z.string().uuid().nullable(),
                expiresAt: z.string().datetime().nullable(),
                createdAt: z.string().datetime(),
              }),
            ),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
            totalPages: z.number(),
          }),
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      if (user.role !== 'moderator' && user.role !== 'admin') {
        throw new AppError({
          code: ErrorCodes.AUTH_INSUFFICIENT_PERMS,
          message: 'Moderator role required',
          statusCode: 403,
        });
      }

      const { page, pageSize } = request.query;

      const result = await getModerationActions(config, user.tenantId, page, pageSize);

      return {
        success: true,
        items: result.items.map((a) => ({
          id: a.id,
          playerId: a.playerId,
          moderatorId: a.moderatorId,
          tenantId: a.tenantId,
          actionType: a.actionType,
          reason: a.reason,
          reportId: a.reportId,
          expiresAt: a.expiresAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    },
  );
}
