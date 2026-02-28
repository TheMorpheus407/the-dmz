import { gameSessionBootstrapResponseJsonSchema } from '@the-dmz/shared/schemas';

import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
// eslint-disable-next-line import-x/no-restricted-paths
import { authGuard } from '../../auth/auth.routes.js';
import { idempotency } from '../../../shared/middleware/idempotency.js';

import * as gameSessionService from './game-session.service.js';
import { createGameSessionStartedEvent } from './game-session.events.js';

import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from './game-session.service.js';

export const registerGameSessionRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post(
    '/game/session',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, idempotency],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: gameSessionBootstrapResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const { session, isNew } = await gameSessionService.bootstrapGameSession(config, user);

      if (isNew) {
        const eventBus = fastify.eventBus;
        eventBus.publish(
          createGameSessionStartedEvent({
            source: 'game-module',
            correlationId: request.id,
            tenantId: user.tenantId,
            userId: user.userId,
            version: 1,
            payload: {
              sessionId: session.sessionId,
              userId: user.userId,
              tenantId: user.tenantId,
              day: session.day,
              funds: session.funds,
            },
          }),
        );
      }

      return { data: session };
    },
  );

  fastify.get(
    '/game/session',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: gameSessionBootstrapResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;

      const session = await gameSessionService.getGameSession(config, user);

      if (!session) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'No active game session found',
            details: {},
          },
        });
      }

      return { data: session };
    },
  );
};
