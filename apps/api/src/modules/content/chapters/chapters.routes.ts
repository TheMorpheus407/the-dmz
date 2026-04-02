import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';

import * as chaptersService from './chapters.service.js';

// eslint-disable-next-line import-x/no-restricted-paths
import type { AuthenticatedUser } from '../../game/session/game-session.service.js';
import type { FastifyInstance } from 'fastify';

export const registerChapterRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/content/chapters/:seasonId',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            seasonId: { type: 'string', format: 'uuid' },
          },
          required: ['seasonId'],
        },
        querystring: {
          type: 'object',
          properties: {
            act: { type: 'integer', minimum: 1, maximum: 3 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { seasonId } = request.params as { seasonId: string };
      const query = request.query as {
        act?: number;
        isActive?: boolean;
      };

      const chapters = await chaptersService.listChaptersBySeason(
        config,
        user.tenantId,
        seasonId,
        query,
      );

      return { data: chapters };
    },
  );
};
