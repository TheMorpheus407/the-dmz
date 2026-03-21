import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';

import * as phishingService from './phishing-simulation.service.js';

import type { AuthenticatedUser } from '../auth/index.js'; // eslint-disable-line import-x/no-restricted-paths

const simulationInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(65535).optional(),
  templateId: z.string().uuid().optional(),
  difficultyTier: z.number().min(1).max(5).optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  senderName: z.string().max(255).optional(),
  senderEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  includeAttachment: z.boolean().optional(),
  attachmentName: z.string().max(255).optional(),
  trackingEnabled: z.boolean().optional(),
  teachableMomentId: z.string().uuid().optional(),
  scheduledStartDate: z.string().datetime().optional(),
  scheduledEndDate: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
});

const simulationUpdateSchema = simulationInputSchema.partial();

const audienceInputSchema = z.object({
  groupIds: z.array(z.string().uuid()).optional(),
  departments: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  attributeFilters: z.record(z.unknown()).optional(),
});

const templateInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(65535).optional(),
  category: z.string().max(100).optional(),
  difficultyTier: z.number().min(1).max(5).optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  senderName: z.string().max(255).optional(),
  senderEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  mergeTags: z.array(z.string()).optional(),
  includeAttachment: z.boolean().optional(),
  attachmentName: z.string().max(255).optional(),
  indicatorHints: z.array(z.string()).optional(),
  teachableMomentConfig: z.record(z.unknown()).optional(),
});

const teachableMomentInputSchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  indicatorType: z.string().max(100).optional(),
  educationalContent: z.string().min(1),
  whatToDoInstead: z.string().min(1),
  microTrainingCourseId: z.string().uuid().optional(),
});

const simulationListQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const templateListQuerySchema = z.object({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  includeBuiltIn: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export async function registerPhishingSimulationRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/admin/simulations',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;

      let input;
      try {
        input = simulationInputSchema.parse(request.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }
        throw error;
      }

      const user = request.user as AuthenticatedUser;
      const createdBy = user?.userId ?? 'unknown';

      const simulation = await phishingService.createPhishingSimulation(tenantId, {
        name: input.name,
        subject: input.subject,
        body: input.body,
        description: input.description,
        templateId: input.templateId,
        difficultyTier: input.difficultyTier,
        urgencyLevel: input.urgencyLevel,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        replyTo: input.replyTo,
        includeAttachment: input.includeAttachment,
        attachmentName: input.attachmentName,
        trackingEnabled: input.trackingEnabled,
        teachableMomentId: input.teachableMomentId,
        scheduledStartDate: input.scheduledStartDate
          ? new Date(input.scheduledStartDate)
          : undefined,
        scheduledEndDate: input.scheduledEndDate ? new Date(input.scheduledEndDate) : undefined,
        timezone: input.timezone,
        createdBy,
      });

      return reply.code(201).send({
        success: true,
        data: simulation,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const query = simulationListQuerySchema.parse(request.query);

      const result = await phishingService.listPhishingSimulations(tenantId, {
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      });

      return reply.send({
        success: true,
        data: result.simulations,
        total: result.total,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/:id',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      const simulation = await phishingService.getPhishingSimulationById(tenantId, id);

      if (!simulation) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Simulation not found' },
        });
      }

      return reply.send({
        success: true,
        data: simulation,
      });
    },
  );

  fastify.put(
    '/api/v1/admin/simulations/:id',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };
      const input = simulationUpdateSchema.parse(request.body);

      const simulation = await phishingService.updatePhishingSimulation(tenantId, id, {
        name: input.name,
        description: input.description,
        templateId: input.templateId,
        difficultyTier: input.difficultyTier,
        urgencyLevel: input.urgencyLevel,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        replyTo: input.replyTo,
        subject: input.subject,
        body: input.body,
        includeAttachment: input.includeAttachment,
        attachmentName: input.attachmentName,
        trackingEnabled: input.trackingEnabled,
        teachableMomentId: input.teachableMomentId,
        scheduledStartDate: input.scheduledStartDate
          ? new Date(input.scheduledStartDate)
          : undefined,
        scheduledEndDate: input.scheduledEndDate ? new Date(input.scheduledEndDate) : undefined,
        timezone: input.timezone,
      });

      if (!simulation) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Simulation not found' },
        });
      }

      return reply.send({
        success: true,
        data: simulation,
      });
    },
  );

  fastify.delete(
    '/api/v1/admin/simulations/:id',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      await phishingService.deletePhishingSimulation(tenantId, id);

      return reply.code(204).send();
    },
  );

  fastify.post(
    '/api/v1/admin/simulations/:id/launch',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      try {
        const simulation = await phishingService.launchSimulation(tenantId, id);
        return reply.send({
          success: true,
          data: simulation,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to launch simulation';
        return reply.code(400).send({
          success: false,
          error: { code: 'LAUNCH_FAILED', message },
        });
      }
    },
  );

  fastify.post(
    '/api/v1/admin/simulations/:id/pause',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      try {
        const simulation = await phishingService.pauseSimulation(tenantId, id);
        return reply.send({
          success: true,
          data: simulation,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to pause simulation';
        return reply.code(400).send({
          success: false,
          error: { code: 'PAUSE_FAILED', message },
        });
      }
    },
  );

  fastify.post(
    '/api/v1/admin/simulations/:id/resume',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      try {
        const simulation = await phishingService.resumeSimulation(tenantId, id);
        return reply.send({
          success: true,
          data: simulation,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resume simulation';
        return reply.code(400).send({
          success: false,
          error: { code: 'RESUME_FAILED', message },
        });
      }
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/:id/results',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      try {
        const results = await phishingService.getSimulationResults(tenantId, id);
        return reply.send({
          success: true,
          data: results,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get results';
        return reply.code(400).send({
          success: false,
          error: { code: 'RESULTS_FAILED', message },
        });
      }
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/:id/results/summary',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      try {
        const summary = await phishingService.getSimulationResultsSummary(tenantId, id);
        if (!summary) {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Simulation not found' },
          });
        }
        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get results summary';
        return reply.code(400).send({
          success: false,
          error: { code: 'SUMMARY_FAILED', message },
        });
      }
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/:id/results/export',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };
      const { format } = request.query as { format?: 'csv' | 'json' };

      try {
        const data = await phishingService.exportSimulationResults(tenantId, id, format ?? 'json');

        if (format === 'csv') {
          reply.header('Content-Type', 'text/csv');
          reply.header(
            'Content-Disposition',
            `attachment; filename="simulation-${id}-results.csv"`,
          );
        } else {
          reply.header('Content-Type', 'application/json');
        }

        return reply.send(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to export results';
        return reply.code(400).send({
          success: false,
          error: { code: 'EXPORT_FAILED', message },
        });
      }
    },
  );

  fastify.put(
    '/api/v1/admin/simulations/:id/audience',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };
      const input = audienceInputSchema.parse(request.body);

      const audience = await phishingService.setSimulationAudience(tenantId, id, input);
      return reply.send({
        success: true,
        data: audience,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/:id/audience',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const audience = await phishingService.getSimulationAudience(id);

      if (!audience) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Audience not found' },
        });
      }

      return reply.send({
        success: true,
        data: audience,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/:id/eligible-users',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { id } = request.params as { id: string };

      const userIds = await phishingService.getEligibleUsersForSimulation(tenantId, id);
      return reply.send({
        success: true,
        data: { userIds },
      });
    },
  );

  fastify.post(
    '/api/v1/admin/simulations/templates',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const input = templateInputSchema.parse(request.body);

      const template = await phishingService.createPhishingTemplate(tenantId, input);
      return reply.code(201).send({
        success: true,
        data: template,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/templates',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const query = templateListQuerySchema.parse(request.query);

      const result = await phishingService.listPhishingTemplates(tenantId, {
        category: query.category,
        isActive: query.isActive,
        includeBuiltIn: query.includeBuiltIn ?? true,
        limit: query.limit,
        offset: query.offset,
      });

      return reply.send({
        success: true,
        data: result.templates,
        total: result.total,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/templates/:templateId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { templateId } = request.params as { templateId: string };

      const template = await phishingService.getPhishingTemplateById(templateId);

      if (!template) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Template not found' },
        });
      }

      return reply.send({
        success: true,
        data: template,
      });
    },
  );

  fastify.put(
    '/api/v1/admin/simulations/templates/:templateId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { templateId } = request.params as { templateId: string };
      const input = templateInputSchema.partial().parse(request.body);

      try {
        const template = await phishingService.updatePhishingTemplate(
          tenantId,
          templateId,
          input as Partial<phishingService.PhishingSimulationTemplateInput>,
        );
        if (!template) {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Template not found' },
          });
        }
        return reply.send({
          success: true,
          data: template,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update template';
        return reply.code(400).send({
          success: false,
          error: { code: 'UPDATE_FAILED', message },
        });
      }
    },
  );

  fastify.delete(
    '/api/v1/admin/simulations/templates/:templateId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { templateId } = request.params as { templateId: string };

      try {
        await phishingService.deletePhishingTemplate(tenantId, templateId);
        return reply.code(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete template';
        return reply.code(400).send({
          success: false,
          error: { code: 'DELETE_FAILED', message },
        });
      }
    },
  );

  fastify.post(
    '/api/v1/admin/simulations/teachable-moments',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const input = teachableMomentInputSchema.parse(request.body);

      const moment = await phishingService.createTeachableMoment(tenantId, input);
      return reply.code(201).send({
        success: true,
        data: moment,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/teachable-moments',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const query = request.query as { indicatorType?: string; isActive?: boolean };

      const moments = await phishingService.listTeachableMoments(tenantId, {
        indicatorType: query.indicatorType,
        isActive: query.isActive,
      });

      return reply.send({
        success: true,
        data: moments,
      });
    },
  );

  fastify.get(
    '/api/v1/admin/simulations/teachable-moments/:momentId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.tenantContext!;
      const { momentId } = request.params as { momentId: string };

      const moment = await phishingService.getTeachableMomentById(tenantId, momentId);

      if (!moment) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Teachable moment not found' },
        });
      }

      return reply.send({
        success: true,
        data: moment,
      });
    },
  );
}
