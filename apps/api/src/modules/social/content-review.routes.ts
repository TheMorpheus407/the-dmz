import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  submitReport,
  getModerationQueue,
  getReportById,
  assignModerator,
  resolveReport,
} from './moderation.service.js';
import { checkRateLimit } from './rate-limit.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

interface ModeratorUser extends AuthenticatedUser {
  role: 'moderator' | 'admin';
}

const reportTypeSchema = z.enum(['harassment', 'spam', 'cheating', 'content', 'other']);
const reportStatusSchema = z.enum([
  'pending',
  'under_review',
  'resolved_actioned',
  'resolved_dismissed',
]);
const reportResolutionSchema = z.enum([
  'warning',
  'mute',
  'content_removal',
  'restriction',
  'dismissed',
]);

const contentReferenceSchema = z.object({
  type: z.string(),
  id: z.string(),
});

const evidenceSchema = z.object({
  messageIds: z.array(z.string()).optional(),
  timestamps: z.array(z.string()).optional(),
  screenshots: z.array(z.string()).optional(),
});

const submitReportBodySchema = z.object({
  reportedPlayerId: z.string().uuid(),
  reportType: reportTypeSchema,
  contentReference: contentReferenceSchema.optional(),
  evidence: evidenceSchema.optional(),
  description: z.string().max(500).optional(),
});

const moderationQueueQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  reportType: reportTypeSchema.optional(),
  assignedModeratorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const reportIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const assignModeratorBodySchema = z.object({
  moderatorId: z.string().uuid(),
});

const resolveReportBodySchema = z.object({
  resolution: reportResolutionSchema,
  actionType: z.string().optional(),
  reason: z.string().max(280).optional(),
  expiresAt: z.string().datetime().optional(),
});

const reportResponseSchema = z.object({
  success: z.boolean(),
  reportId: z.string().uuid().optional(),
  error: z.string().optional(),
});

const reportDetailSchema = z.object({
  id: z.string().uuid(),
  reporterPlayerId: z.string().uuid(),
  reportedPlayerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  reportType: z.string(),
  contentReference: z.record(z.unknown()).nullable(),
  evidence: z.record(z.unknown()).nullable(),
  description: z.string().nullable(),
  status: z.string(),
  assignedModeratorId: z.string().uuid().nullable(),
  resolution: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

const moderationQueueResponseSchema = z.object({
  success: z.boolean(),
  items: z.array(reportDetailSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export {
  reportTypeSchema,
  reportStatusSchema,
  reportResolutionSchema,
  contentReferenceSchema,
  evidenceSchema,
  submitReportBodySchema,
  moderationQueueQuerySchema,
  reportIdParamsSchema,
  assignModeratorBodySchema,
  resolveReportBodySchema,
  reportResponseSchema,
  reportDetailSchema,
  moderationQueueResponseSchema,
};

export function isModerator(user: AuthenticatedUser): user is ModeratorUser {
  return user.role === 'moderator' || user.role === 'admin';
}

export async function contentReviewRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.post<{ Body: z.infer<typeof submitReportBodySchema> }>(
    '/api/v1/social/reports',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: submitReportBodySchema,
        response: {
          200: reportResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body;

      const rateLimitResult = await checkRateLimit(
        config,
        user.tenantId,
        user.userId,
        'report_submit',
      );

      if (!rateLimitResult.allowed) {
        reply.header(
          'Retry-After',
          String(Math.ceil((rateLimitResult.retryAfterMs ?? 3600) / 1000)),
        );
        throw new AppError({
          code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: 'Report rate limit exceeded',
          statusCode: 429,
        });
      }

      const result = await submitReport(config, user.tenantId, {
        reporterPlayerId: user.userId,
        reportedPlayerId: body.reportedPlayerId,
        reportType: body.reportType,
        contentReference: body.contentReference,
        evidence: body.evidence,
        description: body.description,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to submit report',
          statusCode: 400,
        });
      }

      return {
        success: true,
        reportId: result.reportId,
      };
    },
  );

  fastify.get<{ Querystring: z.infer<typeof moderationQueueQuerySchema> }>(
    '/api/v1/moderation/reports',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: moderationQueueQuerySchema,
        response: {
          200: moderationQueueResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      if (!isModerator(user)) {
        throw new AppError({
          code: ErrorCodes.AUTH_INSUFFICIENT_PERMS,
          message: 'Moderator role required',
          statusCode: 403,
        });
      }

      const { status, reportType, assignedModeratorId, page, pageSize } = request.query;

      const result = await getModerationQueue(
        config,
        user.tenantId,
        { status, reportType, assignedModeratorId },
        page,
        pageSize,
      );

      return {
        success: true,
        items: result.items.map((r) => ({
          id: r.id,
          reporterPlayerId: r.reporterPlayerId,
          reportedPlayerId: r.reportedPlayerId,
          tenantId: r.tenantId,
          reportType: r.reportType,
          contentReference: r.contentReference,
          evidence: r.evidence,
          description: r.description,
          status: r.status,
          assignedModeratorId: r.assignedModeratorId,
          resolution: r.resolution,
          resolvedAt: r.resolvedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    },
  );

  fastify.get<{ Params: z.infer<typeof reportIdParamsSchema> }>(
    '/api/v1/moderation/reports/:id',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: reportIdParamsSchema,
        response: {
          200: z.object({ success: z.boolean(), report: reportDetailSchema.nullable() }),
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      if (!isModerator(user)) {
        throw new AppError({
          code: ErrorCodes.AUTH_INSUFFICIENT_PERMS,
          message: 'Moderator role required',
          statusCode: 403,
        });
      }

      const report = await getReportById(config, user.tenantId, request.params.id);

      return {
        success: true,
        report: report
          ? {
              id: report.id,
              reporterPlayerId: report.reporterPlayerId,
              reportedPlayerId: report.reportedPlayerId,
              tenantId: report.tenantId,
              reportType: report.reportType,
              contentReference: report.contentReference,
              evidence: report.evidence,
              description: report.description,
              status: report.status,
              assignedModeratorId: report.assignedModeratorId,
              resolution: report.resolution,
              resolvedAt: report.resolvedAt?.toISOString() ?? null,
              createdAt: report.createdAt.toISOString(),
            }
          : null,
      };
    },
  );

  fastify.patch<{
    Params: z.infer<typeof reportIdParamsSchema>;
    Body: z.infer<typeof assignModeratorBodySchema>;
  }>(
    '/api/v1/moderation/reports/:id/assign',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: reportIdParamsSchema,
        body: assignModeratorBodySchema,
        response: {
          200: z.object({ success: z.boolean(), error: z.string().optional() }),
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      if (!isModerator(user)) {
        throw new AppError({
          code: ErrorCodes.AUTH_INSUFFICIENT_PERMS,
          message: 'Moderator role required',
          statusCode: 403,
        });
      }

      const result = await assignModerator(
        config,
        user.tenantId,
        request.params.id,
        request.body.moderatorId,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to assign moderator',
          statusCode: 404,
        });
      }

      return { success: true };
    },
  );

  fastify.post<{
    Params: z.infer<typeof reportIdParamsSchema>;
    Body: z.infer<typeof resolveReportBodySchema>;
  }>(
    '/api/v1/moderation/reports/:id/resolve',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: reportIdParamsSchema,
        body: resolveReportBodySchema,
        response: {
          200: z.object({ success: z.boolean(), error: z.string().optional() }),
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      if (!isModerator(user)) {
        throw new AppError({
          code: ErrorCodes.AUTH_INSUFFICIENT_PERMS,
          message: 'Moderator role required',
          statusCode: 403,
        });
      }

      const { resolution, actionType, reason, expiresAt } = request.body;

      const result = await resolveReport(
        config,
        user.tenantId,
        request.params.id,
        user.userId,
        resolution,
        actionType,
        reason,
        expiresAt ? new Date(expiresAt) : undefined,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Failed to resolve report',
          statusCode: 404,
        });
      }

      return { success: true };
    },
  );
}
