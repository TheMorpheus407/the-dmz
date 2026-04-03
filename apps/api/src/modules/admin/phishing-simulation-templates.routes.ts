import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { validateCsrf } from '../auth/index.js';

import * as phishingService from './phishing-simulation.service.js';

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

const templateListQuerySchema = z.object({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  includeBuiltIn: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export async function registerPhishingSimulationTemplateRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/admin/simulations/templates',
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requireRole('tenant_admin', 'super_admin'),
      ],
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
}
