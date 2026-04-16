import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  listLeaderboards,
  getLeaderboardEntries,
  getPlayerRanks,
  getPlayerPosition,
  getFriendsLeaderboard,
  getGuildLeaderboard,
} from './leaderboard.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

export const scopeSchema = z.enum(['global', 'regional', 'guild', 'tenant', 'friends']);
export const rankingCategorySchema = z.enum([
  'overall',
  'accuracy',
  'incident_response',
  'resource_efficiency',
  'speed',
]);
export const timeFrameSchema = z.enum(['daily', 'weekly', 'seasonal']);

export const leaderboardResponseSchema = z.object({
  leaderboardId: z.string().uuid(),
  scope: z.string(),
  region: z.string().nullable(),
  seasonId: z.string(),
  rankingCategory: z.string(),
  timeFrame: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const leaderboardListResponseSchema = z.object({
  success: z.boolean(),
  leaderboards: z.array(leaderboardResponseSchema),
});

export const leaderboardEntryResponseSchema = z.object({
  entryId: z.string().uuid(),
  leaderboardId: z.string().uuid(),
  playerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  score: z.number().int(),
  rank: z.number().int(),
  metrics: z.object({
    accuracy: z.number(),
    avgDecisionTime: z.number(),
    incidentsResolved: z.number(),
    resourceEfficiency: z.number(),
  }),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  updatedAt: z.string().datetime(),
  displayName: z.string().optional(),
  avatarId: z.string().nullable().optional(),
  privacyMode: z.string().optional(),
});

export const leaderboardEntriesResponseSchema = z.object({
  success: z.boolean(),
  entries: z.array(leaderboardEntryResponseSchema),
  totalCount: z.number().int().optional(),
});

export const playerRankResponseSchema = z.object({
  leaderboardId: z.string().uuid(),
  scope: z.string(),
  region: z.string().nullable(),
  rankingCategory: z.string(),
  timeFrame: z.string(),
  rank: z.number().int(),
  score: z.number().int(),
});

export const playerRanksResponseSchema = z.object({
  success: z.boolean(),
  ranks: z.array(playerRankResponseSchema),
});

export const playerPositionResponseSchema = z.object({
  success: z.boolean(),
  rank: z.number().int(),
  score: z.number().int(),
});

export const leaderboardsQuerySchema = z.object({
  scope: scopeSchema.optional(),
  seasonId: z.string().optional(),
  rankingCategory: rankingCategorySchema.optional(),
  timeFrame: timeFrameSchema.optional(),
});

export const leaderboardEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const friendsLeaderboardQuerySchema = z.object({
  seasonId: z.string().default('season-1'),
  rankingCategory: rankingCategorySchema.default('overall'),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const guildLeaderboardQuerySchema = z.object({
  guildId: z.string().uuid(),
  seasonId: z.string().default('season-1'),
  rankingCategory: rankingCategorySchema.default('overall'),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export async function registerConsumerLeaderboardRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.get(
    '/api/v1/leaderboards',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: leaderboardsQuerySchema.optional(),
        response: {
          200: leaderboardListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as z.infer<typeof leaderboardsQuerySchema> | undefined;

      const result = await listLeaderboards(config, user.tenantId, {
        scope: query?.scope,
        seasonId: query?.seasonId,
        rankingCategory: query?.rankingCategory,
        timeFrame: query?.timeFrame,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to list leaderboards',
          statusCode: 500,
        });
      }

      return {
        success: true,
        leaderboards:
          result.leaderboards?.map((lb) => ({
            leaderboardId: lb.leaderboardId,
            scope: lb.scope,
            region: lb.region,
            seasonId: lb.seasonId,
            rankingCategory: lb.rankingCategory,
            timeFrame: lb.timeFrame,
            isActive: lb.isActive,
            createdAt: lb.createdAt.toISOString(),
            updatedAt: lb.updatedAt.toISOString(),
          })) ?? [],
      };
    },
  );

  fastify.get<{ Params: { leaderboardId: string } }>(
    '/api/v1/leaderboards/:leaderboardId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          leaderboardId: z.string().uuid(),
        }),
        querystring: leaderboardEntriesQuerySchema.optional(),
        response: {
          200: leaderboardEntriesResponseSchema,
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
      const { leaderboardId } = request.params;
      const query = request.query as z.infer<typeof leaderboardEntriesQuerySchema> | undefined;

      const result = await getLeaderboardEntries(config, user.tenantId, leaderboardId, {
        limit: query?.limit,
        offset: query?.offset,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to get leaderboard entries',
          statusCode: 404,
        });
      }

      return {
        success: true,
        entries:
          result.entries?.map((e) => ({
            entryId: e.entryId,
            leaderboardId: e.leaderboardId,
            playerId: e.playerId,
            tenantId: e.tenantId,
            score: e.score,
            rank: e.rank,
            metrics: e.metrics as {
              accuracy: number;
              avgDecisionTime: number;
              incidentsResolved: number;
              resourceEfficiency: number;
            },
            periodStart: e.periodStart.toISOString(),
            periodEnd: e.periodEnd.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
            displayName: e.displayName,
            avatarId: e.avatarId,
            privacyMode: e.privacyMode,
          })) ?? [],
        totalCount: result.totalCount,
      };
    },
  );

  fastify.get(
    '/api/v1/leaderboards/me',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: playerRanksResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const result = await getPlayerRanks(config, user.tenantId, user.userId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to get player ranks',
          statusCode: 500,
        });
      }

      return {
        success: true,
        ranks:
          result.ranks?.map((r) => ({
            leaderboardId: r.leaderboardId,
            scope: r.scope,
            region: r.region,
            rankingCategory: r.rankingCategory,
            timeFrame: r.timeFrame,
            rank: r.rank,
            score: r.score,
          })) ?? [],
      };
    },
  );

  fastify.get<{ Params: { leaderboardId: string } }>(
    '/api/v1/leaderboards/me/position/:leaderboardId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          leaderboardId: z.string().uuid(),
        }),
        response: {
          200: playerPositionResponseSchema,
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
      const { leaderboardId } = request.params;

      const result = await getPlayerPosition(config, user.tenantId, user.userId, leaderboardId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to get player position',
          statusCode: 404,
        });
      }

      return {
        success: true,
        rank: result.rank!,
        score: result.score!,
      };
    },
  );

  fastify.get(
    '/api/v1/leaderboards/friends',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: friendsLeaderboardQuerySchema.optional(),
        response: {
          200: leaderboardEntriesResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as z.infer<typeof friendsLeaderboardQuerySchema> | undefined;

      const result = await getFriendsLeaderboard(config, user.tenantId, user.userId, {
        seasonId: query?.seasonId ?? 'season-1',
        rankingCategory: query?.rankingCategory ?? 'overall',
        limit: query?.limit,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to get friends leaderboard',
          statusCode: 500,
        });
      }

      return {
        success: true,
        entries:
          result.entries?.map((e) => ({
            entryId: e.entryId,
            leaderboardId: e.leaderboardId,
            playerId: e.playerId,
            tenantId: e.tenantId,
            score: e.score,
            rank: e.rank,
            metrics: e.metrics as {
              accuracy: number;
              avgDecisionTime: number;
              incidentsResolved: number;
              resourceEfficiency: number;
            },
            periodStart: e.periodStart.toISOString(),
            periodEnd: e.periodEnd.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
            displayName: e.displayName,
            avatarId: e.avatarId,
            privacyMode: e.privacyMode,
          })) ?? [],
      };
    },
  );

  fastify.get<{ Params: { guildId: string } }>(
    '/api/v1/leaderboards/guild/:guildId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          guildId: z.string().uuid(),
        }),
        querystring: guildLeaderboardQuerySchema.omit({ guildId: true }).optional(),
        response: {
          200: leaderboardEntriesResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { guildId } = request.params;
      const query = request.query as z.infer<typeof guildLeaderboardQuerySchema> | undefined;

      const result = await getGuildLeaderboard(config, user.tenantId, guildId, {
        seasonId: query?.seasonId ?? 'season-1',
        rankingCategory: query?.rankingCategory ?? 'overall',
        limit: query?.limit,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to get guild leaderboard',
          statusCode: 500,
        });
      }

      return {
        success: true,
        entries:
          result.entries?.map((e) => ({
            entryId: e.entryId,
            leaderboardId: e.leaderboardId,
            playerId: e.playerId,
            tenantId: e.tenantId,
            score: e.score,
            rank: e.rank,
            metrics: e.metrics as {
              accuracy: number;
              avgDecisionTime: number;
              incidentsResolved: number;
              resourceEfficiency: number;
            },
            periodStart: e.periodStart.toISOString(),
            periodEnd: e.periodEnd.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
            displayName: e.displayName,
            avatarId: e.avatarId,
            privacyMode: e.privacyMode,
          })) ?? [],
      };
    },
  );
}
