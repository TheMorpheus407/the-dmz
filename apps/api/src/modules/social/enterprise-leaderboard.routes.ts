import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
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

export const enterpriseScopeSchema = z.enum(['department', 'tenant', 'corporation']);
export const privacyLevelSchema = z.enum(['full_name', 'pseudonym', 'anonymous_aggregate']);
export const leaderboardTypeSchema = z.enum([
  'accuracy',
  'response_time',
  'incident_resolution',
  'verification_discipline',
  'composite',
]);

export const enterpriseLeaderboardResponseSchema = z.object({
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

export const enterpriseLeaderboardListResponseSchema = z.object({
  success: z.boolean(),
  leaderboards: z.array(enterpriseLeaderboardResponseSchema),
});

export const enterpriseLeaderboardEntryResponseSchema = z.object({
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

export const enterpriseLeaderboardEntriesResponseSchema = z.object({
  success: z.boolean(),
  entries: z.array(enterpriseLeaderboardEntryResponseSchema),
  totalCount: z.number().int().optional(),
});

export const teamSummaryResponseSchema = z.object({
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

export const updatePrivacyLevelBodySchema = z.object({
  privacyLevel: privacyLevelSchema,
});

export const enterpriseLeaderboardsQuerySchema = z.object({
  scope: enterpriseScopeSchema.optional(),
  departmentId: z.string().uuid().optional(),
  corporationId: z.string().uuid().optional(),
});

export const enterpriseLeaderboardEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  departmentId: z.string().uuid().optional(),
  corporationId: z.string().uuid().optional(),
});

export const departmentLeaderboardQuerySchema = z.object({
  leaderboardType: leaderboardTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const corporationLeaderboardQuerySchema = z.object({
  leaderboardType: leaderboardTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export async function registerEnterpriseLeaderboardRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
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
          200: z.object({
            success: z.boolean(),
            rank: z.number().int(),
            score: z.number().int(),
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
