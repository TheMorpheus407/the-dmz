import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  listActiveEndorsementTags,
  submitEndorsement,
  getReceivedEndorsements,
  getGivenEndorsements,
  getEndorsementSummary,
  type EndorsementSubmission,
} from './endorsement.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const endorsementSubmissionSchema = z.object({
  endorsedPlayerId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).min(1).max(3),
});

const endorsementTagSchema = z.object({
  id: z.string().uuid(),
  tagKey: z.string(),
  displayName: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

const endorsementSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  endorserPlayerId: z.string().uuid(),
  endorsedPlayerId: z.string().uuid(),
  tagId: z.string().uuid(),
  tenantId: z.string().uuid(),
  seasonId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  tag: endorsementTagSchema,
});

const endorsementListResponseSchema = z.object({
  data: z.array(endorsementSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});

const endorsementSummarySchema = z.object({
  playerId: z.string().uuid(),
  totalReceived: z.number(),
  totalGiven: z.number(),
  tagBreakdown: z.array(
    z.object({
      tagKey: z.string(),
      displayName: z.string(),
      count: z.number(),
      recentCount: z.number(),
    }),
  ),
  endorsementRate: z.number(),
});

export async function endorsementRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.get(
    '/api/v1/social/endorsement-tags',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(endorsementTagSchema),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (_request, _reply) => {
      const tags = await listActiveEndorsementTags(config);

      return tags.map((tag) => ({
        id: tag.id,
        tagKey: tag.tagKey,
        displayName: tag.displayName,
        description: tag.description,
        isActive: tag.isActive,
        createdAt: tag.createdAt.toISOString(),
      }));
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/social/sessions/:sessionId/endorsements',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: endorsementSubmissionSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            endorsementId: z.string().uuid().optional(),
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
      const { sessionId } = request.params;
      const { endorsedPlayerId, tagIds } = request.body as z.infer<
        typeof endorsementSubmissionSchema
      >;

      const submission: EndorsementSubmission = {
        sessionId,
        endorsedPlayerId,
        tagIds,
      };

      const result = await submitEndorsement(config, user.tenantId, user.userId, submission);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to submit endorsement',
          statusCode: 400,
        });
      }

      return {
        success: true,
        endorsementId: result.endorsement?.id,
      };
    },
  );

  fastify.get<{ Params: { playerId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/api/v1/players/:playerId/endorsements/received',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        querystring: z.object({
          page: z.string().regex(/^\d+$/).optional(),
          pageSize: z.string().regex(/^\d+$/).optional(),
        }),
        response: {
          200: endorsementListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { playerId } = request.params;
      const page = parseInt(request.query.page ?? '1', 10);
      const pageSize = parseInt(request.query.pageSize ?? '20', 10);

      const result = await getReceivedEndorsements(config, user.tenantId, playerId, page, pageSize);

      return {
        data: result.data.map((e) => ({
          id: e.id,
          sessionId: e.sessionId,
          endorserPlayerId: e.endorserPlayerId,
          endorsedPlayerId: e.endorsedPlayerId,
          tagId: e.tagId,
          tenantId: e.tenantId,
          seasonId: e.seasonId,
          createdAt: e.createdAt.toISOString(),
          tag: {
            id: e.tag.id,
            tagKey: e.tag.tagKey,
            displayName: e.tag.displayName,
            description: e.tag.description,
            isActive: e.tag.isActive,
            createdAt: e.tag.createdAt.toISOString(),
          },
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      };
    },
  );

  fastify.get<{ Params: { playerId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/api/v1/players/:playerId/endorsements/given',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        querystring: z.object({
          page: z.string().regex(/^\d+$/).optional(),
          pageSize: z.string().regex(/^\d+$/).optional(),
        }),
        response: {
          200: endorsementListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { playerId } = request.params;
      const page = parseInt(request.query.page ?? '1', 10);
      const pageSize = parseInt(request.query.pageSize ?? '20', 10);

      const result = await getGivenEndorsements(config, user.tenantId, playerId, page, pageSize);

      return {
        data: result.data.map((e) => ({
          id: e.id,
          sessionId: e.sessionId,
          endorserPlayerId: e.endorserPlayerId,
          endorsedPlayerId: e.endorsedPlayerId,
          tagId: e.tagId,
          tenantId: e.tenantId,
          seasonId: e.seasonId,
          createdAt: e.createdAt.toISOString(),
          tag: {
            id: e.tag.id,
            tagKey: e.tag.tagKey,
            displayName: e.tag.displayName,
            description: e.tag.description,
            isActive: e.tag.isActive,
            createdAt: e.tag.createdAt.toISOString(),
          },
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      };
    },
  );

  fastify.get<{ Params: { playerId: string } }>(
    '/api/v1/players/:playerId/endorsements/summary',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        response: {
          200: endorsementSummarySchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { playerId } = request.params;

      const summary = await getEndorsementSummary(config, user.tenantId, playerId);

      return summary;
    },
  );
}
