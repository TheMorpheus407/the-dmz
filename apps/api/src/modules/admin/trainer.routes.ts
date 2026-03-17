import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { COMPETENCY_DOMAINS, type CompetencyDomain } from '@the-dmz/shared';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';

import {
  getCompetencyDistribution,
  getErrorPatterns,
  getLearnersByDomain,
  getCampaignCompletion,
  getTrainerDashboardData,
  type DateRange,
} from './trainer.service.js';

interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

interface DomainParams {
  domain: string;
}

interface ThresholdQuery {
  threshold?: number;
}

export const registerTrainerRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Querystring: DateRangeQuery }>(
    '/admin/trainer/dashboard',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: DateRangeQuery }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { startDate, endDate } = request.query;

        let dateRange: DateRange | undefined;
        if (startDate && endDate) {
          dateRange = {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          };
        }

        const data = await getTrainerDashboardData(tenantId, dateRange);

        return reply.code(200).send({
          success: true,
          data,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'TRAINER_DASHBOARD_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Querystring: DateRangeQuery }>(
    '/admin/trainer/competencies',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: DateRangeQuery }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { startDate, endDate } = request.query;

        let dateRange: DateRange | undefined;
        if (startDate && endDate) {
          dateRange = {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          };
        }

        const competencies = await getCompetencyDistribution(tenantId, dateRange);

        return reply.code(200).send({
          success: true,
          data: competencies,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'COMPETENCIES_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Querystring: DateRangeQuery }>(
    '/admin/trainer/errors',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: DateRangeQuery }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { startDate, endDate } = request.query;

        let dateRange: DateRange | undefined;
        if (startDate && endDate) {
          dateRange = {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          };
        }

        const errorPatterns = await getErrorPatterns(tenantId, dateRange);

        return reply.code(200).send({
          success: true,
          data: errorPatterns,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'ERROR_PATTERNS_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Params: DomainParams; Querystring: ThresholdQuery }>(
    '/admin/trainer/learners/:domain',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: COMPETENCY_DOMAINS },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            threshold: { type: 'number', minimum: 0, maximum: 100, default: 50 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: DomainParams; Querystring: ThresholdQuery }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { domain } = request.params;
        const { threshold = 50 } = request.query;

        if (!COMPETENCY_DOMAINS.includes(domain as CompetencyDomain)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'INVALID_DOMAIN',
              message: 'Invalid competency domain',
            },
          });
        }

        const learners = await getLearnersByDomain(tenantId, domain as CompetencyDomain, threshold);

        return reply.code(200).send({
          success: true,
          data: learners,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'LEARNERS_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<Record<string, never>>(
    '/admin/trainer/campaigns',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;

        const campaigns = await getCampaignCompletion(tenantId);

        return reply.code(200).send({
          success: true,
          data: campaigns,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CAMPAIGNS_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );
};
