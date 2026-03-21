import { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { validateCsrf } from '../auth/index.js'; // eslint-disable-line import-x/no-restricted-paths

import * as auditService from './audit.service.js';

const preHandlerRead = [
  authGuard,
  tenantContext,
  tenantStatusGuard,
  requireRole('tenant_admin', 'super_admin'),
];
const preHandlerWrite = [
  authGuard,
  tenantContext,
  tenantStatusGuard,
  validateCsrf,
  requireRole('tenant_admin', 'super_admin'),
];

const AuditLogQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

const RetentionConfigSchema = z.object({
  retentionYears: z.number().int().min(1).max(7),
  framework: z.string().optional(),
});

const ExportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  format: z.enum(['csv', 'json']).default('csv'),
});

const LegalHoldSchema = z.object({
  enabled: z.boolean(),
});

type AuditLogQueryParams = z.infer<typeof AuditLogQuerySchema>;
type RetentionConfigBody = z.infer<typeof RetentionConfigSchema>;
type ExportQueryParams = z.infer<typeof ExportQuerySchema>;
type LegalHoldBody = z.infer<typeof LegalHoldSchema>;

export const registerAuditRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Querystring: AuditLogQueryParams }>(
    '/audit/logs',
    {
      preHandler: preHandlerRead,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            action: { type: 'string', maxLength: 128 },
            userId: { type: 'string', format: 'uuid' },
            resourceType: { type: 'string', maxLength: 64 },
            resourceId: { type: 'string', format: 'uuid' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      const parsedQuery = AuditLogQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' },
        });
      }

      try {
        const result = await auditService.queryAuditLogs({
          tenantId: tenantContext.tenantId,
          ...parsedQuery.data,
        });

        return reply.send({
          success: true,
          data: {
            logs: result.logs,
            total: result.total,
            limit: parsedQuery.data.limit,
            offset: parsedQuery.data.offset,
          },
        });
      } catch (error) {
        request.log.error(error, 'Failed to query audit logs');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to query audit logs' },
        });
      }
    },
  );

  fastify.get(
    '/audit/logs/actions',
    {
      preHandler: preHandlerRead,
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      try {
        const actions = await auditService.getAuditActions(tenantContext.tenantId);

        return reply.send({
          success: true,
          data: { actions },
        });
      } catch (error) {
        request.log.error(error, 'Failed to get audit actions');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit actions' },
        });
      }
    },
  );

  fastify.get(
    '/audit/logs/resource-types',
    {
      preHandler: preHandlerRead,
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      try {
        const resourceTypes = await auditService.getResourceTypes(tenantContext.tenantId);

        return reply.send({
          success: true,
          data: { resourceTypes },
        });
      } catch (error) {
        request.log.error(error, 'Failed to get resource types');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get resource types' },
        });
      }
    },
  );

  fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>(
    '/audit/verify',
    {
      preHandler: preHandlerRead,
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
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      try {
        const result = await auditService.verifyAuditChain(
          tenantContext.tenantId,
          request.query.startDate,
          request.query.endDate,
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error(error, 'Failed to verify audit chain');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to verify audit chain' },
        });
      }
    },
  );

  fastify.get(
    '/audit/retention',
    {
      preHandler: preHandlerRead,
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      try {
        const config = await auditService.getRetentionConfig(tenantContext.tenantId);

        return reply.send({
          success: true,
          data: config,
        });
      } catch (error) {
        request.log.error(error, 'Failed to get retention config');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get retention config' },
        });
      }
    },
  );

  fastify.put<{ Body: RetentionConfigBody }>(
    '/audit/retention',
    {
      preHandler: preHandlerWrite,
      schema: {
        body: {
          type: 'object',
          required: ['retentionYears'],
          properties: {
            retentionYears: { type: 'integer', minimum: 1, maximum: 7 },
            framework: { type: 'string', maxLength: 64 },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      const parsedBody = RetentionConfigSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_BODY', message: 'Invalid request body' },
        });
      }

      try {
        await auditService.updateRetentionConfig(
          tenantContext.tenantId,
          parsedBody.data.retentionYears,
          parsedBody.data.framework,
        );

        return reply.send({
          success: true,
          data: { message: 'Retention config updated' },
        });
      } catch (error) {
        request.log.error(error, 'Failed to update retention config');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update retention config' },
        });
      }
    },
  );

  fastify.get<{ Querystring: ExportQueryParams }>(
    '/audit/export',
    {
      preHandler: preHandlerRead,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            action: { type: 'string', maxLength: 128 },
            userId: { type: 'string', format: 'uuid' },
            resourceType: { type: 'string', maxLength: 64 },
            format: { type: 'string', enum: ['csv', 'json'], default: 'csv' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      const parsedQuery = ExportQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' },
        });
      }

      const format = parsedQuery.data.format;
      const contentType = format === 'csv' ? 'text/csv' : 'application/x-ndjson';

      reply.raw.writeHead(200, {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="audit-export-${Date.now()}.${format}"`,
        'X-Download-Options': 'noopen',
      });

      try {
        for await (const chunk of auditService.exportAuditLogs({
          tenantId: tenantContext.tenantId,
          startDate: parsedQuery.data.startDate,
          endDate: parsedQuery.data.endDate,
          action: parsedQuery.data.action,
          userId: parsedQuery.data.userId,
          resourceType: parsedQuery.data.resourceType,
          format,
        })) {
          reply.raw.write(chunk);
        }
        reply.raw.end();
      } catch (error) {
        request.log.error(error, 'Failed to export audit logs');
        reply.raw.end();
      }

      return reply;
    },
  );

  fastify.get(
    '/audit/stream',
    {
      preHandler: preHandlerRead,
    },
    async (request, reply) => {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      reply.raw.write('event: connected\ndata: {"status":"connected"}\n\n');

      const heartbeatInterval = setInterval(() => {
        reply.raw.write(
          'event: heartbeat\ndata: {"timestamp":"' + new Date().toISOString() + '"}\n\n',
        );
      }, 30000);

      request.raw.on('close', () => {
        clearInterval(heartbeatInterval);
      });

      reply.raw.on('close', () => {
        clearInterval(heartbeatInterval);
      });

      return reply;
    },
  );

  fastify.get(
    '/audit/legal-hold',
    {
      preHandler: preHandlerRead,
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      try {
        const legalHold = await auditService.getLegalHoldStatus(tenantContext.tenantId);

        return reply.send({
          success: true,
          data: { legalHold },
        });
      } catch (error) {
        request.log.error(error, 'Failed to get legal hold status');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get legal hold status' },
        });
      }
    },
  );

  fastify.put<{ Body: LegalHoldBody }>(
    '/audit/legal-hold',
    {
      preHandler: preHandlerWrite,
      schema: {
        body: {
          type: 'object',
          required: ['enabled'],
          properties: {
            enabled: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantContext = request.tenantContext!;

      const parsedBody = LegalHoldSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_BODY', message: 'Invalid request body' },
        });
      }

      try {
        await auditService.setLegalHold(tenantContext.tenantId, parsedBody.data.enabled);

        return reply.send({
          success: true,
          data: { legalHold: parsedBody.data.enabled },
        });
      } catch (error) {
        request.log.error(error, 'Failed to set legal hold');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to set legal hold' },
        });
      }
    },
  );
};
