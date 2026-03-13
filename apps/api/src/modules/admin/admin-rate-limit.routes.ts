import { getRateLimitStatus } from '../../shared/middleware/rate-limiter.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitQuery {
  tenantId?: string;
  userId?: string;
}

export const registerAdminRateLimitRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Querystring: RateLimitQuery }>(
    '/admin/rate-limit/status',
    {
      config: {
        rateLimit: false,
      },
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  store: { type: 'string', enum: ['redis', 'memory'] },
                  redisAvailable: { type: 'boolean' },
                  strictMode: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest<{ Querystring: RateLimitQuery }>, _reply: FastifyReply) => {
      const status = getRateLimitStatus();

      if (!status) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_NOT_INITIALIZED',
            message: 'Rate limiter not initialized',
            details: {},
          },
        };
      }

      return {
        success: true,
        data: status,
      };
    },
  );
};
