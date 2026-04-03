import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { validateCsrf } from '../auth/index.js';

import * as phishingService from './phishing-simulation.service.js';

const teachableMomentInputSchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  indicatorType: z.string().max(100).optional(),
  educationalContent: z.string().min(1),
  whatToDoInstead: z.string().min(1),
  microTrainingCourseId: z.string().uuid().optional(),
});

export async function registerPhishingSimulationTeachableMomentRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/admin/simulations/teachable-moments',
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
