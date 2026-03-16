import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import * as auditService from './audit.service.js';

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

type AuditLogQueryParams = z.infer<typeof AuditLogQuerySchema>;
type RetentionConfigBody = z.infer<typeof RetentionConfigSchema>;

export const registerAuditRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/audit/logs',
    {
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
    async (request: FastifyRequest<{ Querystring: AuditLogQueryParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
      }

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

  fastify.get('/audit/logs/actions', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
    }

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
  });

  fastify.get(
    '/audit/logs/resource-types',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
      }

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

  fastify.get(
    '/audit/verify',
    {
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
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
      }

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

  fastify.get('/audit/retention', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
    }

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
  });

  fastify.put(
    '/audit/retention',
    {
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
    async (request: FastifyRequest<{ Body: RetentionConfigBody }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        });
      }

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
};
