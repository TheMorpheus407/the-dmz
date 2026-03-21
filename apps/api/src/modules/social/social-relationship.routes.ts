import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { validateCsrf } from '../auth/index.js'; // eslint-disable-line import-x/no-restricted-paths
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  listFriends,
  listPendingFriendRequests,
  blockPlayer,
  unblockPlayer,
  listBlockedPlayers,
  mutePlayer,
  unmutePlayer,
  listMutedPlayers,
  getRelationshipStatus,
  getRelationshipCounts,
} from './social-relationship.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const friendRequestSchema = z.object({
  playerId: z.string().uuid(),
});

const friendRequestActionSchema = z.object({
  playerId: z.string().uuid(),
});

const relationshipResponseSchema = z.object({
  relationshipId: z.string().uuid(),
  tenantId: z.string().uuid(),
  requesterId: z.string().uuid(),
  addresseeId: z.string().uuid(),
  relationshipType: z.enum(['friend', 'block', 'mute']),
  status: z.enum(['pending', 'accepted', 'rejected']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const relationshipListResponseSchema = z.array(relationshipResponseSchema);

const relationshipStatusResponseSchema = z.object({
  relationshipType: z.enum(['friend', 'block', 'mute']).nullable(),
  status: z.enum(['pending', 'accepted', 'rejected']).nullable(),
});

const relationshipCountsResponseSchema = z.object({
  friends: z.number().int(),
  blocked: z.number().int(),
  muted: z.number().int(),
});

export async function socialRelationshipRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.post(
    '/api/v1/social/friends/request',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }],
        body: friendRequestSchema,
        response: {
          200: relationshipResponseSchema,
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
        relationshipType: rel.relationshipType as 'friend',
        status: rel.status as 'pending',
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
        body: friendRequestActionSchema,
        response: {
          200: relationshipResponseSchema,
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
      const { playerId } = request.body as z.infer<typeof friendRequestActionSchema>;

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
        relationshipType: rel.relationshipType as 'friend',
        status: rel.status as 'accepted',
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
        body: friendRequestActionSchema,
        response: {
          200: relationshipResponseSchema,
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
      const { playerId } = request.body as z.infer<typeof friendRequestActionSchema>;

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
        relationshipType: rel.relationshipType as 'friend',
        status: rel.status as 'rejected',
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
          200: relationshipListResponseSchema,
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
        relationshipType: rel.relationshipType as 'friend',
        status: rel.status as 'accepted',
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
          200: relationshipListResponseSchema,
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
        relationshipType: rel.relationshipType as 'friend',
        status: rel.status as 'pending',
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      }));
    },
  );

  fastify.post<{ Params: { playerId: string } }>(
    '/api/v1/social/block/:playerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        response: {
          200: relationshipResponseSchema,
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

      const result = await blockPlayer(config, user.tenantId, user.userId, playerId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to block player',
          statusCode: 400,
        });
      }

      const rel = result.relationship!;
      return {
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: rel.relationshipType as 'block',
        status: rel.status as 'accepted',
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      };
    },
  );

  fastify.delete<{ Params: { playerId: string } }>(
    '/api/v1/social/block/:playerId',
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

      const result = await unblockPlayer(config, user.tenantId, user.userId, playerId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to unblock player',
          statusCode: 400,
        });
      }

      return { success: true };
    },
  );

  fastify.get(
    '/api/v1/social/blocked',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: relationshipListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const relationships = await listBlockedPlayers(config, user.tenantId, user.userId);

      return relationships.map((rel) => ({
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: rel.relationshipType as 'block',
        status: rel.status as 'accepted',
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      }));
    },
  );

  fastify.post<{ Params: { playerId: string } }>(
    '/api/v1/social/mute/:playerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        response: {
          200: relationshipResponseSchema,
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

      const result = await mutePlayer(config, user.tenantId, user.userId, playerId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to mute player',
          statusCode: 400,
        });
      }

      const rel = result.relationship!;
      return {
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: rel.relationshipType as 'mute',
        status: rel.status as 'accepted',
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      };
    },
  );

  fastify.delete<{ Params: { playerId: string } }>(
    '/api/v1/social/mute/:playerId',
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

      const result = await unmutePlayer(config, user.tenantId, user.userId, playerId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to unmute player',
          statusCode: 400,
        });
      }

      return { success: true };
    },
  );

  fastify.get(
    '/api/v1/social/muted',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: relationshipListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const relationships = await listMutedPlayers(config, user.tenantId, user.userId);

      return relationships.map((rel) => ({
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: rel.relationshipType as 'mute',
        status: rel.status as 'accepted',
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      }));
    },
  );

  fastify.get<{ Params: { playerId: string } }>(
    '/api/v1/social/relationships/:playerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        response: {
          200: relationshipStatusResponseSchema,
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

      const relationship = await getRelationshipStatus(
        config,
        user.tenantId,
        user.userId,
        playerId,
      );

      if (!relationship) {
        return {
          relationshipType: null,
          status: null,
        };
      }

      return {
        relationshipType: relationship.relationshipType,
        status: relationship.status,
      };
    },
  );

  fastify.get(
    '/api/v1/social/relationships/counts',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: relationshipCountsResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const counts = await getRelationshipCounts(config, user.tenantId, user.userId);

      return counts;
    },
  );
}
