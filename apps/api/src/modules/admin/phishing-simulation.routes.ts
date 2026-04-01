import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { validateCsrf } from '../auth/csrf.js'; // eslint-disable-line import-x/no-restricted-paths

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

const simulationListQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export async function registerPhishingSimulationRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/admin/simulations',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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

  fastify.put(
    '/api/v1/admin/simulations/:id/audience',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
}
