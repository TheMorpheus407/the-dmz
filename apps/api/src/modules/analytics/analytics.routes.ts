import { z } from 'zod';

import type { FastifyPluginAsync } from 'fastify';

const metricsResponseSchema = z.object({
  eventsIngested: z.number(),
  eventsFailed: z.number(),
  eventsRetried: z.number(),
  queueDepth: z.number(),
  processingLatencyMs: z.number(),
  lastProcessedAt: z.string().nullable(),
});

const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  details: z.record(z.unknown()),
});

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const health = fastify.analytics.getHealth();
      return reply.send(health);
    },
  );

  fastify.get(
    '/metrics',
    {
      schema: {
        response: {
          200: metricsResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const metrics = fastify.analytics.getMetrics();
      return reply.send({
        ...metrics,
        lastProcessedAt: metrics.lastProcessedAt?.toISOString() ?? null,
      });
    },
  );
};

export { analyticsRoutes };
