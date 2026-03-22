import { getRateLimitStatus } from '../../shared/middleware/rate-limiter.js';
import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';

import type { FastifyInstance, FastifyReply } from 'fastify';

export const registerAdminRateLimitRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/admin/rate-limit/status',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
      schema: {
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
    async (_request, _reply: FastifyReply) => {
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
