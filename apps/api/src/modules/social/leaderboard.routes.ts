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
  listEnterpriseLeaderboards,
  getEnterpriseLeaderboardEntries,
  getPlayerEnterprisePosition,
  getDepartmentLeaderboard,
  getCorporationLeaderboard,
  getTeamSummary,
  updatePrivacyLevel,
} from './leaderboard.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const scopeSchema = z.enum(['global', 'regional', 'guild', 'tenant', 'friends']);
const rankingCategorySchema = z.enum([
  'overall',
  'accuracy',
  'incident_response',
  'resource_efficiency',
  'speed',
]);
const timeFrameSchema = z.enum(['daily', 'weekly', 'seasonal']);

const leaderboardResponseSchema = z.object({
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

const leaderboardListResponseSchema = z.object({
  success: z.boolean(),
  leaderboards: z.array(leaderboardResponseSchema),
});

const leaderboardEntryResponseSchema = z.object({
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

const leaderboardEntriesResponseSchema = z.object({
  success: z.boolean(),
  entries: z.array(leaderboardEntryResponseSchema),
  totalCount: z.number().int().optional(),
});

const playerRankResponseSchema = z.object({
  leaderboardId: z.string().uuid(),
  scope: z.string(),
  region: z.string().nullable(),
  rankingCategory: z.string(),
  timeFrame: z.string(),
  rank: z.number().int(),
  score: z.number().int(),
});

const playerRanksResponseSchema = z.object({
  success: z.boolean(),
  ranks: z.array(playerRankResponseSchema),
});

const playerPositionResponseSchema = z.object({
  success: z.boolean(),
  rank: z.number().int(),
  score: z.number().int(),
});

const leaderboardsQuerySchema = z.object({
  scope: scopeSchema.optional(),
  seasonId: z.string().optional(),
  rankingCategory: rankingCategorySchema.optional(),
  timeFrame: timeFrameSchema.optional(),
});

const leaderboardEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const friendsLeaderboardQuerySchema = z.object({
  seasonId: z.string().default('season-1'),
  rankingCategory: rankingCategorySchema.default('overall'),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

const guildLeaderboardQuerySchema = z.object({
  guildId: z.string().uuid(),
  seasonId: z.string().default('season-1'),
  rankingCategory: rankingCategorySchema.default('overall'),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

const enterpriseScopeSchema = z.enum(['department', 'tenant', 'corporation']);
const privacyLevelSchema = z.enum(['full_name', 'pseudonym', 'anonymous_aggregate']);
const leaderboardTypeSchema = z.enum([
  'accuracy',
  'response_time',
  'incident_resolution',
  'verification_discipline',
  'composite',
]);

const enterpriseLeaderboardResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  scope: z.string(),
  orgUnitId: z.string().uuid().nullable(),
  corporationId: z.string().uuid().nullable(),
  leaderboardType: z.string(),
  resetCadence: z.string(),
  currentSeasonId: z.string(),
  privacyLevel: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const enterpriseLeaderboardListResponseSchema = z.object({
  success: z.boolean(),
  leaderboards: z.array(enterpriseLeaderboardResponseSchema),
});

const enterpriseLeaderboardEntryResponseSchema = z.object({
  id: z.string().uuid(),
  leaderboardId: z.string().uuid(),
  playerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
  corporationId: z.string().uuid().nullable(),
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
});

const enterpriseLeaderboardEntriesResponseSchema = z.object({
  success: z.boolean(),
  entries: z.array(enterpriseLeaderboardEntryResponseSchema),
  totalCount: z.number().int().optional(),
});

const teamSummaryResponseSchema = z.object({
  success: z.boolean(),
  teamId: z.string().uuid(),
  averageScore: z.number().int(),
  totalPlayers: z.number().int(),
  topPerformers: z.array(
    z.object({
      score: z.number().int(),
      rank: z.number().int(),
    }),
  ),
});

const updatePrivacyLevelBodySchema = z.object({
  privacyLevel: privacyLevelSchema,
});

const enterpriseLeaderboardsQuerySchema = z.object({
  scope: enterpriseScopeSchema.optional(),
  departmentId: z.string().uuid().optional(),
  corporationId: z.string().uuid().optional(),
});

const enterpriseLeaderboardEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  departmentId: z.string().uuid().optional(),
  corporationId: z.string().uuid().optional(),
});

const departmentLeaderboardQuerySchema = z.object({
  leaderboardType: leaderboardTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

const corporationLeaderboardQuerySchema = z.object({
  leaderboardType: leaderboardTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export async function leaderboardRoutes(
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

  fastify.get(
    '/api/v1/leaderboards/enterprise',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: enterpriseLeaderboardsQuerySchema.optional(),
        response: {
          200: enterpriseLeaderboardListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as z.infer<typeof enterpriseLeaderboardsQuerySchema> | undefined;

      const result = await listEnterpriseLeaderboards(config, user.tenantId, {
        ...(query?.scope !== undefined ? { scope: query.scope } : {}),
        ...(query?.departmentId !== undefined ? { departmentId: query.departmentId } : {}),
        ...(query?.corporationId !== undefined ? { corporationId: query.corporationId } : {}),
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to list enterprise leaderboards',
          statusCode: 500,
        });
      }

      return {
        success: true,
        leaderboards:
          result.leaderboards?.map((lb) => ({
            id: lb.id,
            tenantId: lb.tenantId,
            scope: lb.scope,
            orgUnitId: lb.orgUnitId,
            corporationId: lb.corporationId,
            leaderboardType: lb.leaderboardType,
            resetCadence: lb.resetCadence,
            currentSeasonId: lb.currentSeasonId,
            privacyLevel: lb.privacyLevel,
            isActive: lb.isActive,
            createdAt: lb.createdAt.toISOString(),
            updatedAt: lb.updatedAt.toISOString(),
          })) ?? [],
      };
    },
  );

  fastify.get<{ Params: { leaderboardId: string } }>(
    '/api/v1/leaderboards/enterprise/:leaderboardId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          leaderboardId: z.string().uuid(),
        }),
        querystring: enterpriseLeaderboardEntriesQuerySchema.optional(),
        response: {
          200: enterpriseLeaderboardEntriesResponseSchema,
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
      const query = request.query as
        | z.infer<typeof enterpriseLeaderboardEntriesQuerySchema>
        | undefined;

      const result = await getEnterpriseLeaderboardEntries(config, user.tenantId, leaderboardId, {
        ...(query?.limit !== undefined ? { limit: query.limit } : {}),
        ...(query?.offset !== undefined ? { offset: query.offset } : {}),
        ...(query?.departmentId !== undefined ? { departmentId: query.departmentId } : {}),
        ...(query?.corporationId !== undefined ? { corporationId: query.corporationId } : {}),
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to get enterprise leaderboard entries',
          statusCode: 404,
        });
      }

      return {
        success: true,
        entries:
          result.leaderboards?.map((e) => ({
            id: e.id,
            leaderboardId: e.leaderboardId,
            playerId: e.playerId,
            tenantId: e.tenantId,
            departmentId: e.departmentId,
            corporationId: e.corporationId,
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
          })) ?? [],
        totalCount: result.totalCount,
      };
    },
  );

  fastify.get<{ Params: { leaderboardId: string } }>(
    '/api/v1/leaderboards/enterprise/:leaderboardId/me',
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

      const result = await getPlayerEnterprisePosition(
        config,
        user.tenantId,
        user.userId,
        leaderboardId,
      );

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

  fastify.get<{ Params: { leaderboardId: string; deptId: string } }>(
    '/api/v1/leaderboards/enterprise/:leaderboardId/department/:deptId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          leaderboardId: z.string().uuid(),
          deptId: z.string().uuid(),
        }),
        querystring: departmentLeaderboardQuerySchema.optional(),
        response: {
          200: enterpriseLeaderboardEntriesResponseSchema,
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
      const { deptId } = request.params;
      const query = request.query as z.infer<typeof departmentLeaderboardQuerySchema> | undefined;

      const result = await getDepartmentLeaderboard(config, user.tenantId, deptId, {
        ...(query?.leaderboardType !== undefined ? { leaderboardType: query.leaderboardType } : {}),
        ...(query?.limit !== undefined ? { limit: query.limit } : {}),
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to get department leaderboard',
          statusCode: 404,
        });
      }

      return {
        success: true,
        entries:
          result.leaderboards?.map((e) => ({
            id: e.id,
            leaderboardId: e.leaderboardId,
            playerId: e.playerId,
            tenantId: e.tenantId,
            departmentId: e.departmentId,
            corporationId: e.corporationId,
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
          })) ?? [],
        totalCount: result.totalCount,
      };
    },
  );

  fastify.get<{ Params: { leaderboardId: string; corpId: string } }>(
    '/api/v1/leaderboards/enterprise/:leaderboardId/corporation/:corpId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          leaderboardId: z.string().uuid(),
          corpId: z.string().uuid(),
        }),
        querystring: corporationLeaderboardQuerySchema.optional(),
        response: {
          200: enterpriseLeaderboardEntriesResponseSchema,
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
      const { corpId } = request.params;
      const query = request.query as z.infer<typeof corporationLeaderboardQuerySchema> | undefined;

      const result = await getCorporationLeaderboard(config, user.tenantId, corpId, {
        ...(query?.leaderboardType !== undefined ? { leaderboardType: query.leaderboardType } : {}),
        ...(query?.limit !== undefined ? { limit: query.limit } : {}),
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to get corporation leaderboard',
          statusCode: 404,
        });
      }

      return {
        success: true,
        entries:
          result.leaderboards?.map((e) => ({
            id: e.id,
            leaderboardId: e.leaderboardId,
            playerId: e.playerId,
            tenantId: e.tenantId,
            departmentId: e.departmentId,
            corporationId: e.corporationId,
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
          })) ?? [],
        totalCount: result.totalCount,
      };
    },
  );

  fastify.get<{ Params: { leaderboardId: string; teamId: string } }>(
    '/api/v1/leaderboards/enterprise/:leaderboardId/team/:teamId/summary',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          leaderboardId: z.string().uuid(),
          teamId: z.string().uuid(),
        }),
        response: {
          200: teamSummaryResponseSchema,
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
      const { leaderboardId, teamId } = request.params;

      const result = await getTeamSummary(config, user.tenantId, teamId, leaderboardId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to get team summary',
          statusCode: 404,
        });
      }

      return {
        success: true,
        teamId: result.teamId,
        averageScore: result.averageScore,
        totalPlayers: result.totalPlayers,
        topPerformers: result.topPerformers,
      };
    },
  );

  fastify.patch<{ Params: { leaderboardId: string } }>(
    '/api/v1/leaderboards/enterprise/:leaderboardId/privacy',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          leaderboardId: z.string().uuid(),
        }),
        body: updatePrivacyLevelBodySchema,
        response: {
          200: z.object({ success: z.boolean() }),
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
      const body = request.body as z.infer<typeof updatePrivacyLevelBodySchema>;

      if (user.role !== 'admin' && user.role !== 'owner') {
        throw new AppError({
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: 'Only admins can update privacy settings',
          statusCode: 403,
        });
      }

      const result = await updatePrivacyLevel(
        config,
        user.tenantId,
        leaderboardId,
        body.privacyLevel,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to update privacy level',
          statusCode: 404,
        });
      }

      return { success: true };
    },
  );
}
