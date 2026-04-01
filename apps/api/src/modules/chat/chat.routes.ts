import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  sendMessage,
  getMessages,
  deleteMessage,
  reportMessage,
  listChannels,
  getChannel,
} from './chat.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const channelTypeSchema = z.enum(['party', 'guild', 'direct']);

const sendMessageBodySchema = z.object({
  content: z.string().min(1).max(280),
});

const sendMessageResponseSchema = z.object({
  success: z.boolean(),
  messageId: z.string().uuid().optional(),
  moderationStatus: z.enum(['approved', 'flagged', 'rejected']).optional(),
  rateLimited: z.boolean().optional(),
  retryAfterMs: z.number().optional(),
  error: z.string().optional(),
});

const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().datetime().optional(),
});

const chatMessageSchema = z.object({
  messageId: z.string().uuid(),
  channelId: z.string().uuid(),
  senderPlayerId: z.string().uuid(),
  content: z.string().max(280),
  moderationStatus: z.enum(['approved', 'flagged', 'rejected']),
  isDeleted: z.boolean(),
  createdAt: z.string().datetime(),
});

const getMessagesResponseSchema = z.object({
  success: z.boolean(),
  messages: z.array(chatMessageSchema).optional(),
  error: z.string().optional(),
});

const deleteMessageResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

const reportMessageBodySchema = z.object({
  reason: z.string().min(1).max(500),
});

const reportMessageResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

const chatChannelSchema = z.object({
  channelId: z.string().uuid(),
  tenantId: z.string().uuid(),
  channelType: channelTypeSchema,
  partyId: z.string().uuid().nullable(),
  guildId: z.string().uuid().nullable(),
  name: z.string().max(100).nullable(),
  createdAt: z.string().datetime(),
});

const listChannelsResponseSchema = z.object({
  success: z.boolean(),
  channels: z.array(chatChannelSchema).optional(),
  error: z.string().optional(),
});

const getChannelResponseSchema = z.object({
  success: z.boolean(),
  channel: chatChannelSchema.optional(),
  error: z.string().optional(),
});

export async function chatRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.get(
    '/api/v1/chat/channels',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: listChannelsResponseSchema,
          ...errorResponseSchemas,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const result = await listChannels(config, user.tenantId, user.userId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: result.error ?? 'Failed to list channels',
          statusCode: 403,
        });
      }

      return result;
    },
  );

  fastify.get(
    '/api/v1/chat/channels/:channelId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          channelId: z.string().uuid(),
        }),
        response: {
          200: getChannelResponseSchema,
          ...errorResponseSchemas,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { channelId } = request.params as { channelId: string };

      const result = await getChannel(config, user.tenantId, channelId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Channel not found',
          statusCode: 404,
        });
      }

      return result;
    },
  );

  fastify.get(
    '/api/v1/chat/channels/:channelId/messages',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          channelId: z.string().uuid(),
        }),
        querystring: getMessagesQuerySchema,
        response: {
          200: getMessagesResponseSchema,
          ...errorResponseSchemas,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { channelId } = request.params as { channelId: string };
      const { limit, cursor } = request.query as { limit: number; cursor?: string };

      const result = await getMessages(
        config,
        user.tenantId,
        user.userId,
        channelId,
        limit,
        cursor,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: result.error ?? 'Failed to get messages',
          statusCode: 403,
        });
      }

      return result;
    },
  );

  fastify.post(
    '/api/v1/chat/channels/:channelId/messages',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          channelId: z.string().uuid(),
        }),
        body: sendMessageBodySchema,
        response: {
          200: sendMessageResponseSchema,
          ...errorResponseSchemas,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { channelId } = request.params as { channelId: string };
      const { content } = request.body as { content: string };

      const result = await sendMessage(
        config,
        user.tenantId,
        user.userId,
        {
          channelId,
          content,
        },
        undefined,
        fastify.eventBus,
      );

      if (!result.success) {
        if (result.rateLimited) {
          reply.header('Retry-After', String(Math.ceil((result.retryAfterMs ?? 2000) / 1000)));
          throw new AppError({
            code: ErrorCodes.RATE_LIMIT_EXCEEDED,
            message: result.error ?? 'Rate limit exceeded',
            statusCode: 429,
          });
        }

        throw new AppError({
          code: ErrorCodes.VALIDATION_FAILED,
          message: result.error ?? 'Failed to send message',
          statusCode: 400,
        });
      }

      return result;
    },
  );

  fastify.delete(
    '/api/v1/chat/channels/:channelId/messages/:messageId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          channelId: z.string().uuid(),
          messageId: z.string().uuid(),
        }),
        response: {
          200: deleteMessageResponseSchema,
          ...errorResponseSchemas,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { channelId, messageId } = request.params as {
        channelId: string;
        messageId: string;
      };

      const result = await deleteMessage(
        config,
        user.tenantId,
        user.userId,
        channelId,
        messageId,
        fastify.eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: result.error ?? 'Failed to delete message',
          statusCode: 403,
        });
      }

      return result;
    },
  );

  fastify.post(
    '/api/v1/chat/channels/:channelId/report',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          channelId: z.string().uuid(),
        }),
        querystring: z.object({
          messageId: z.string().uuid(),
        }),
        body: reportMessageBodySchema,
        response: {
          200: reportMessageResponseSchema,
          ...errorResponseSchemas,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { channelId } = request.params as { channelId: string };
      const { reason } = request.body as { reason: string };
      const { messageId } = request.query as { messageId: string };

      const result = await reportMessage(
        config,
        user.tenantId,
        user.userId,
        channelId,
        messageId,
        reason,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.VALIDATION_FAILED,
          message: result.error ?? 'Failed to report message',
          statusCode: 400,
        });
      }

      return result;
    },
  );
}
