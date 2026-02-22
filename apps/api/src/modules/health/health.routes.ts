import {
  healthQueryJsonSchema,
  healthResponseJsonSchema,
  readinessResponseJsonSchema,
} from '@the-dmz/shared/schemas';

import { getHealth, getReadiness } from './health.service.js';

import type { FastifyInstance } from 'fastify';

export const registerHealthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/health',
    {
      config: {
        rateLimit: false,
      },
      schema: {
        querystring: healthQueryJsonSchema,
        response: {
          200: healthResponseJsonSchema,
        },
      },
    },
    async () => getHealth(),
  );

  fastify.get(
    '/ready',
    {
      config: {
        rateLimit: false,
      },
      schema: {
        querystring: healthQueryJsonSchema,
        response: {
          200: readinessResponseJsonSchema,
          503: readinessResponseJsonSchema,
        },
      },
    },
    async (_request, reply) => {
      const readiness = await getReadiness(fastify.db, fastify.redis);
      if (readiness.status !== 'ok') {
        reply.code(503);
      }

      return readiness;
    },
  );
};
