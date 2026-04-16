import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';
import { validateCsrf } from '../auth/index.js';

import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  listFriends,
  listPendingFriendRequests,
} from './social-relationship.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

const friendRequestSchema = z.object({
  playerId: z.string().uuid(),
});

export async function friendRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.post(
    '/api/v1/social/friends/request',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }],
        body: friendRequestSchema,
        response: {
          200: z.object({
            relationshipId: z.string().uuid(),
            tenantId: z.string().uuid(),
            requesterId: z.string().uuid(),
            addresseeId: z.string().uuid(),
            relationshipType: z.literal('friend'),
            status: z.literal('pending'),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
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
      const { playerId } = request.body as z.infer<typeof friendRequestSchema>;

      const result = await sendFriendRequest(config, user.tenantId, {
        requesterId: user.userId,
        addresseeId: playerId,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to send friend request',
          statusCode: 400,
        });
      }

      const rel = result.relationship!;
      return {
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: 'friend' as const,
        status: 'pending' as const,
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      };
    },
  );

  fastify.post(
    '/api/v1/social/friends/accept',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }],
        body: friendRequestSchema,
        response: {
          200: z.object({
            relationshipId: z.string().uuid(),
            tenantId: z.string().uuid(),
            requesterId: z.string().uuid(),
            addresseeId: z.string().uuid(),
            relationshipType: z.literal('friend'),
            status: z.literal('accepted'),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
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
      const { playerId } = request.body as z.infer<typeof friendRequestSchema>;

      const result = await acceptFriendRequest(config, user.tenantId, user.userId, playerId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to accept friend request',
          statusCode: 400,
        });
      }

      const rel = result.relationship!;
      return {
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: 'friend' as const,
        status: 'accepted' as const,
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      };
    },
  );

  fastify.post(
    '/api/v1/social/friends/reject',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }],
        body: friendRequestSchema,
        response: {
          200: z.object({
            relationshipId: z.string().uuid(),
            tenantId: z.string().uuid(),
            requesterId: z.string().uuid(),
            addresseeId: z.string().uuid(),
            relationshipType: z.literal('friend'),
            status: z.literal('rejected'),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
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
      const { playerId } = request.body as z.infer<typeof friendRequestSchema>;

      const result = await rejectFriendRequest(config, user.tenantId, user.userId, playerId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to reject friend request',
          statusCode: 400,
        });
      }

      const rel = result.relationship!;
      return {
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: 'friend' as const,
        status: 'rejected' as const,
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      };
    },
  );

  fastify.delete<{ Params: { playerId: string } }>(
    '/api/v1/social/friends/:playerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
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
      const { playerId } = request.params;

      const result = await removeFriend(config, user.tenantId, user.userId, playerId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to remove friend',
          statusCode: 400,
        });
      }

      return { success: true };
    },
  );

  fastify.get(
    '/api/v1/social/friends',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(
            z.object({
              relationshipId: z.string().uuid(),
              tenantId: z.string().uuid(),
              requesterId: z.string().uuid(),
              addresseeId: z.string().uuid(),
              relationshipType: z.literal('friend'),
              status: z.literal('accepted'),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            }),
          ),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const relationships = await listFriends(config, user.tenantId, user.userId);

      return relationships.map((rel) => ({
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: 'friend' as const,
        status: 'accepted' as const,
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      }));
    },
  );

  fastify.get(
    '/api/v1/social/friends/requests',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(
            z.object({
              relationshipId: z.string().uuid(),
              tenantId: z.string().uuid(),
              requesterId: z.string().uuid(),
              addresseeId: z.string().uuid(),
              relationshipType: z.literal('friend'),
              status: z.literal('pending'),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            }),
          ),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const relationships = await listPendingFriendRequests(config, user.tenantId, user.userId);

      return relationships.map((rel) => ({
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: 'friend' as const,
        status: 'pending' as const,
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      }));
    },
  );
}
