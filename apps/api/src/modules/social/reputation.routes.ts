import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  getReputation,
  getReputationPublic,
  getReputationHistory,
  getReputationLeaderboard,
  type ReputationHistoryEntry,
  type ReputationBreakdown,
} from './reputation.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const tierSchema = z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']);

const reputationBreakdownSchema = z.object({
  playerId: z.string().uuid(),
  totalScore: z.number(),
  tier: tierSchema,
  endorsementScore: z.number(),
  completionScore: z.number(),
  reportPenalty: z.number(),
  abandonmentPenalty: z.number(),
  endorsementCount: z.number(),
  sessionCompletionRate: z.number(),
  verifiedReportCount: z.number(),
  abandonedSessionCount: z.number(),
  lastUpdatedAt: z.string().datetime().nullable(),
});

const reputationPublicSchema = z.object({
  playerId: z.string().uuid(),
  tier: tierSchema,
});

const reputationHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  delta: z.number(),
  reason: z.string(),
  referenceId: z.string().uuid().nullable(),
  scoreAfter: z.number(),
  createdAt: z.string().datetime(),
});

const paginatedHistoryResponseSchema = z.object({
  data: z.array(reputationHistoryEntrySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});

export async function reputationRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.get<{ Querystring: { seasonId?: string } }>(
    '/api/v1/players/me/reputation',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          seasonId: z.string().uuid().optional(),
        }),
        response: {
          200: reputationBreakdownSchema,
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
      const seasonId = request.query.seasonId;

      const reputation = await getReputation(config, user.tenantId, user.userId, seasonId);

      if (!reputation) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Reputation not found. The feature may be disabled.',
          statusCode: 404,
        });
      }

      return {
        playerId: reputation.playerId,
        totalScore: reputation.totalScore,
        tier: reputation.tier,
        endorsementScore: reputation.endorsementScore,
        completionScore: reputation.completionScore,
        reportPenalty: reputation.reportPenalty,
        abandonmentPenalty: reputation.abandonmentPenalty,
        endorsementCount: reputation.endorsementCount,
        sessionCompletionRate: reputation.sessionCompletionRate,
        verifiedReportCount: reputation.verifiedReportCount,
        abandonedSessionCount: reputation.abandonedSessionCount,
        lastUpdatedAt: reputation.lastUpdatedAt?.toISOString() ?? null,
      };
    },
  );

  fastify.get<{ Querystring: { seasonId?: string; page?: string; pageSize?: string } }>(
    '/api/v1/players/me/reputation/history',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          seasonId: z.string().uuid().optional(),
          page: z.string().regex(/^\d+$/).optional(),
          pageSize: z.string().regex(/^\d+$/).optional(),
        }),
        response: {
          200: paginatedHistoryResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { seasonId, page, pageSize } = request.query;

      const result = await getReputationHistory(
        config,
        user.tenantId,
        user.userId,
        parseInt(page ?? '1', 10),
        parseInt(pageSize ?? '20', 10),
        seasonId,
      );

      return {
        data: result.data.map((entry: ReputationHistoryEntry) => ({
          id: entry.id,
          delta: entry.delta,
          reason: entry.reason,
          referenceId: entry.referenceId,
          scoreAfter: entry.scoreAfter,
          createdAt: entry.createdAt.toISOString(),
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      };
    },
  );

  fastify.get<{ Params: { playerId: string }; Querystring: { seasonId?: string } }>(
    '/api/v1/players/:playerId/reputation',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        querystring: z.object({
          seasonId: z.string().uuid().optional(),
        }),
        response: {
          200: reputationPublicSchema,
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
      const { playerId } = request.params;
      const seasonId = request.query.seasonId;

      const reputation = await getReputationPublic(config, user.tenantId, playerId, seasonId);

      if (!reputation) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Reputation not found for this player',
          statusCode: 404,
        });
      }

      return {
        playerId: reputation.playerId,
        tier: reputation.tier,
      };
    },
  );

  fastify.get<{ Querystring: { seasonId?: string; page?: string; pageSize?: string } }>(
    '/api/v1/reputation/leaderboard',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          seasonId: z.string().uuid().optional(),
          page: z.string().regex(/^\d+$/).optional(),
          pageSize: z.string().regex(/^\d+$/).optional(),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                playerId: z.string().uuid(),
                tier: tierSchema,
                totalScore: z.number(),
                rank: z.number(),
              }),
            ),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
            hasMore: z.boolean(),
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
      const { seasonId, page, pageSize } = request.query;

      const result = await getReputationLeaderboard(
        config,
        user.tenantId,
        parseInt(page ?? '1', 10),
        parseInt(pageSize ?? '20', 10),
        seasonId,
      );

      return {
        data: result.data.map((entry: ReputationBreakdown & { rank: number }) => ({
          playerId: entry.playerId,
          tier: entry.tier,
          totalScore: entry.totalScore,
          rank: entry.rank,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      };
    },
  );
}
