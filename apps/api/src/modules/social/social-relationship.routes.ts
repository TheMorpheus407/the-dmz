import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import { getRelationshipStatus, getRelationshipCounts } from './social-relationship.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

export async function socialRelationshipRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
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
          200: z.object({
            relationshipType: z.enum(['friend', 'block', 'mute']).nullable(),
            status: z.enum(['pending', 'accepted', 'rejected']).nullable(),
          }),
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
          200: z.object({
            friends: z.number().int(),
            blocked: z.number().int(),
            muted: z.number().int(),
          }),
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
