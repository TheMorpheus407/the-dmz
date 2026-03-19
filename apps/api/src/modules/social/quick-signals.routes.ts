import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  getActiveTemplates,
  sendSignal,
  getSessionSignals,
  getPlayerHistory,
  type SignalSendInput,
} from './quick-signals.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const signalCategorySchema = z.enum(['decision', 'urgency', 'coordination', 'resource']);

const signalTemplateSchema = z.object({
  templateId: z.string().uuid(),
  signalKey: z.string(),
  category: signalCategorySchema,
  icon: z.string().max(10),
  label: z.string().max(50),
  description: z.string().max(200),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

const signalTemplatesResponseSchema = z.object({
  success: z.boolean(),
  templates: z.array(signalTemplateSchema),
});

const sendSignalBodySchema = z.object({
  signalKey: z.string().min(1).max(50),
  sessionId: z.string().uuid().optional(),
  targetPlayerId: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional(),
});

const sendSignalResponseSchema = z.object({
  success: z.boolean(),
  usageId: z.string().uuid().optional(),
  signalKey: z.string().optional(),
  sentAt: z.string().datetime().optional(),
  rateLimited: z.boolean().optional(),
  retryAfterMs: z.number().optional(),
});

const sessionSignalsParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

const sessionSignalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const signalUsageSchema = z.object({
  usageId: z.string().uuid(),
  playerId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  signalKey: z.string(),
  targetPlayerId: z.string().uuid().nullable(),
  sentAt: z.string().datetime(),
  context: z.record(z.unknown()),
});

const sessionSignalsResponseSchema = z.object({
  success: z.boolean(),
  signals: z.array(signalUsageSchema),
});

const playerHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const playerHistoryResponseSchema = z.object({
  success: z.boolean(),
  signals: z.array(signalUsageSchema),
});

export async function quickSignalsRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.get(
    '/api/v1/social/signals/templates',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: signalTemplatesResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const result = await getActiveTemplates(config, user.tenantId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to get signal templates',
          statusCode: 500,
        });
      }

      return {
        success: true,
        templates:
          result.templates?.map((t) => ({
            templateId: t.templateId,
            signalKey: t.signalKey,
            category: t.category,
            icon: t.icon,
            label: t.label,
            description: t.description,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
          })) ?? [],
      };
    },
  );

  fastify.post<{ Body: z.infer<typeof sendSignalBodySchema> }>(
    '/api/v1/social/signals/send',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: sendSignalBodySchema,
        response: {
          200: sendSignalResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          429: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
            retryAfterMs: z.number().optional(),
          }),
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body;

      const input: SignalSendInput = {
        signalKey: body.signalKey,
        ...(body.sessionId !== undefined && { sessionId: body.sessionId }),
        ...(body.targetPlayerId !== undefined && { targetPlayerId: body.targetPlayerId }),
        ...(body.context !== undefined && { context: body.context }),
      };

      const result = await sendSignal(config, user.tenantId, user.userId, input);

      if (!result.success) {
        if (result.rateLimited) {
          reply.header('Retry-After', String(Math.ceil((result.retryAfterMs ?? 60000) / 1000)));
          throw new AppError({
            code: ErrorCodes.RATE_LIMIT_EXCEEDED,
            message: result.error ?? 'Rate limit exceeded',
            statusCode: 429,
          });
        }
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to send signal',
          statusCode: 400,
        });
      }

      return {
        success: true,
        usageId: result.usage?.usageId,
        signalKey: result.usage?.signalKey,
        sentAt: result.usage?.sentAt.toISOString(),
      };
    },
  );

  fastify.get<{
    Params: z.infer<typeof sessionSignalsParamsSchema>;
    Querystring: z.infer<typeof sessionSignalsQuerySchema>;
  }>(
    '/api/v1/social/signals/session/:sessionId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: sessionSignalsParamsSchema,
        querystring: sessionSignalsQuerySchema,
        response: {
          200: sessionSignalsResponseSchema,
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
      const { limit } = request.query;

      const result = await getSessionSignals(config, user.tenantId, sessionId, limit);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to get session signals',
          statusCode: 500,
        });
      }

      return {
        success: true,
        signals:
          result.signals?.map((s) => ({
            usageId: s.usageId,
            playerId: s.playerId,
            sessionId: s.sessionId,
            signalKey: s.signalKey,
            targetPlayerId: s.targetPlayerId,
            sentAt: s.sentAt.toISOString(),
            context: s.context as Record<string, unknown>,
          })) ?? [],
      };
    },
  );

  fastify.get<{ Querystring: z.infer<typeof playerHistoryQuerySchema> }>(
    '/api/v1/social/signals/history',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: playerHistoryQuerySchema,
        response: {
          200: playerHistoryResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { limit } = request.query;

      const result = await getPlayerHistory(config, user.tenantId, user.userId, limit);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INTERNAL_ERROR,
          message: result.error ?? 'Failed to get signal history',
          statusCode: 500,
        });
      }

      return {
        success: true,
        signals:
          result.signals?.map((s) => ({
            usageId: s.usageId,
            playerId: s.playerId,
            sessionId: s.sessionId,
            signalKey: s.signalKey,
            targetPlayerId: s.targetPlayerId,
            sentAt: s.sentAt.toISOString(),
            context: s.context as Record<string, unknown>,
          })) ?? [],
      };
    },
  );
}
