import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';
import { validateCsrf } from '../auth/index.js';

import { mutePlayer, unmutePlayer, listMutedPlayers } from './social-relationship.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

export async function muteRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
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
          200: z.object({
            relationshipId: z.string().uuid(),
            tenantId: z.string().uuid(),
            requesterId: z.string().uuid(),
            addresseeId: z.string().uuid(),
            relationshipType: z.literal('mute'),
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
        relationshipType: 'mute' as const,
        status: 'accepted' as const,
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
          200: z.array(
            z.object({
              relationshipId: z.string().uuid(),
              tenantId: z.string().uuid(),
              requesterId: z.string().uuid(),
              addresseeId: z.string().uuid(),
              relationshipType: z.literal('mute'),
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

      const relationships = await listMutedPlayers(config, user.tenantId, user.userId);

      return relationships.map((rel) => ({
        relationshipId: rel.relationshipId,
        tenantId: rel.tenantId,
        requesterId: rel.requesterId,
        addresseeId: rel.addresseeId,
        relationshipType: 'mute' as const,
        status: 'accepted' as const,
        createdAt: rel.createdAt.toISOString(),
        updatedAt: rel.updatedAt.toISOString(),
      }));
    },
  );
}
