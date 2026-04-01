import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { validateCsrf } from '../auth/csrf.js'; // eslint-disable-line import-x/no-restricted-paths

import * as phishingService from './phishing-simulation.service.js';

export async function registerPhishingSimulationResultRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/v1/admin/simulations/:id/results',
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
      const { format } = request.query as { format?: 'csv' | 'json' };

      try {
        const data = await phishingService.exportSimulationResults(tenantId, id, format ?? 'json');

        if (format === 'csv') {
          reply.header('Content-Type', 'text/csv');
          reply.header(
            'Content-Disposition',
            `attachment; filename="simulation-${id}-results.csv"`,
          );
          reply.header('X-Download-Options', 'noopen');
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
}
