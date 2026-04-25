import { seasonListResponseJsonSchema, seasonResponseJsonSchema } from '@the-dmz/shared/schemas';

import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';

import * as seasonsService from './seasons.service.js';

import type { AuthenticatedUser } from '../../game/session/index.js';
import type { FastifyInstance } from 'fastify';

export const registerSeasonRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/content/seasons',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            seasonNumber: { type: 'integer', minimum: 1 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: seasonListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        seasonNumber?: number;
        isActive?: boolean;
      };

      const seasons = await seasonsService.listSeasons(config, user.tenantId, query);

      return { data: seasons };
    },
  );

  fastify.get(
    '/content/seasons/:id',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: seasonResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params as { id: string };

      const season = await seasonsService.getSeason(config, user.tenantId, id);

      if (!season) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Season not found',
            details: {},
          },
        });
      }

      return { data: season };
    },
  );
};
