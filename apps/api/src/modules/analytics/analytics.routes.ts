import { z } from 'zod';

import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import { PhishingMetricsService } from './phishing-metrics.service.js';
import { DecisionQualityService } from './decision-quality.service.js';
import { metricsCache } from './metrics-cache.js';

import type { FastifyPluginAsync } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js'; // eslint-disable-line import-x/no-restricted-paths

const protectedRoutePreHandlers = [authGuard, tenantContext, tenantStatusGuard];
const analyticsReadRoutePreHandlers = [
  ...protectedRoutePreHandlers,
  requirePermission('analytics', 'read'),
];

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

const dateRangeSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .optional();

const phishingMetricsRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  dateRange: dateRangeSchema,
});

const phishingMetricsResponseSchema = z.object({
  clickRate: z.number(),
  reportRate: z.number(),
  falsePositiveRate: z.number(),
  meanTimeToReportSeconds: z.number().nullable(),
  meanTimeToDecisionSeconds: z.number().nullable(),
  suspiciousIndicatorFlaggingRate: z.number(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  sampleSize: z.number(),
});

const scoringRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  dateRange: dateRangeSchema,
});

const decisionQualityScoreSchema = z.object({
  overallScore: z.number(),
  weightedCorrectness: z.number(),
  difficultyAdjustedScore: z.number(),
  contextWeightedScore: z.number(),
  competencyBreakdown: z.record(z.string(), z.number()),
  experienceLevel: z.enum(['new', 'intermediate', 'experienced', 'expert']),
  evidenceCount: z.number(),
});

const scoringResponseSchema = z.object({
  userId: z.string().uuid(),
  scores: decisionQualityScoreSchema,
  percentileRank: z.number().optional(),
  trend: z.enum(['improving', 'declining', 'stable']).optional(),
  previousScore: z.number().optional(),
});

const scoringListResponseSchema = z.array(scoringResponseSchema);

const trendsRequestSchema = z.object({
  weeks: z.number().min(1).max(12).optional(),
  months: z.number().min(1).max(12).optional(),
});

const trendPeriodSchema = z.object({
  period: z.string(),
  averageScore: z.number(),
  playerCount: z.number(),
  weekOverWeekChange: z.number().optional(),
  monthOverMonthChange: z.number().optional(),
});

const trendsResponseSchema = z.object({
  weeklyTrends: z.array(trendPeriodSchema),
  monthlyTrends: z.array(trendPeriodSchema),
  improvementRate: z.number(),
  decliningRate: z.number(),
  stableRate: z.number(),
});

declare module 'fastify' {
  interface FastifyInstance {
    phishingMetrics: PhishingMetricsService;
    decisionQuality: DecisionQualityService;
  }
}

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('phishingMetrics', new PhishingMetricsService(fastify.db));
  fastify.decorate('decisionQuality', new DecisionQualityService(fastify.db));

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

  fastify.post(
    '/phishing',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        body: phishingMetricsRequestSchema,
        querystring: z.object({
          targetTenantId: z.string().uuid().optional(),
        }),
        response: {
          200: phishingMetricsResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { targetTenantId } = request.query as { targetTenantId?: string };
      const tenantId =
        user.role === 'super_admin' && targetTenantId ? targetTenantId : user.tenantId;

      if (user.role !== 'super_admin' && targetTenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'AUTH_FORBIDDEN',
            message: 'Target tenant override not permitted',
            details: {},
          },
        });
      }

      const { userId, dateRange } = request.body as z.infer<typeof phishingMetricsRequestSchema>;

      const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : undefined;
      const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : undefined;

      const cacheKey = `phishing:${tenantId}:${userId ?? 'all'}:${startDate?.toISOString() ?? 'default'}:${endDate?.toISOString() ?? 'now'}`;

      const cached = metricsCache.get<z.infer<typeof phishingMetricsResponseSchema>>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      const metrics = await fastify.phishingMetrics.computeAggregatedMetrics(
        tenantId,
        startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate ?? new Date(),
      );

      metricsCache.set(cacheKey, metrics, 60000);

      return reply.send(metrics);
    },
  );

  fastify.post(
    '/scoring',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        body: scoringRequestSchema,
        querystring: z.object({
          targetTenantId: z.string().uuid().optional(),
        }),
        response: {
          200: z.union([scoringResponseSchema, scoringListResponseSchema]),
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { targetTenantId } = request.query as { targetTenantId?: string };
      const tenantId =
        user.role === 'super_admin' && targetTenantId ? targetTenantId : user.tenantId;

      if (user.role !== 'super_admin' && targetTenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'AUTH_FORBIDDEN',
            message: 'Target tenant override not permitted',
            details: {},
          },
        });
      }

      const { userId, dateRange } = request.body as z.infer<typeof scoringRequestSchema>;

      const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : undefined;
      const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : undefined;

      if (userId) {
        const cacheKey = `scoring:${tenantId}:${userId}:${startDate?.toISOString() ?? 'default'}:${endDate?.toISOString() ?? 'now'}`;

        const cached = metricsCache.get<z.infer<typeof scoringResponseSchema>>(cacheKey);
        if (cached) {
          return reply.send(cached);
        }

        const scoreInput: { tenantId: string; userId: string; startDate?: Date; endDate?: Date } = {
          tenantId,
          userId,
        };
        if (startDate) scoreInput.startDate = startDate;
        if (endDate) scoreInput.endDate = endDate;

        const score = await fastify.decisionQuality.computePlayerScore(scoreInput);

        if (!score) {
          return reply.status(404).send({ error: 'Player not found' });
        }

        metricsCache.set(cacheKey, score, 60000);

        return reply.send(score);
      }

      const scores = await fastify.decisionQuality.computeAllPlayerScores(tenantId);
      return reply.send(scores);
    },
  );

  fastify.post(
    '/trends',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        body: trendsRequestSchema,
        querystring: z.object({
          targetTenantId: z.string().uuid().optional(),
        }),
        response: {
          200: trendsResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { targetTenantId } = request.query as { targetTenantId?: string };
      const tenantId =
        user.role === 'super_admin' && targetTenantId ? targetTenantId : user.tenantId;

      if (user.role !== 'super_admin' && targetTenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'AUTH_FORBIDDEN',
            message: 'Target tenant override not permitted',
            details: {},
          },
        });
      }

      const { weeks, months } = request.body as z.infer<typeof trendsRequestSchema>;

      const cacheKey = `trends:${tenantId}:${weeks ?? 4}:${months ?? 3}`;

      const cached = metricsCache.get<z.infer<typeof trendsResponseSchema>>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      const trends = await fastify.decisionQuality.computeTrends(tenantId, weeks ?? 4, months ?? 3);

      metricsCache.set(cacheKey, trends, 300000);

      return reply.send(trends);
    },
  );
};

export { analyticsRoutes };
