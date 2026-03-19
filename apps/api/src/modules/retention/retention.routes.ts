import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';

import * as retentionService from './retention.service.js';
import { archiveService } from './archive.service.js';
import {
  dataCategories,
  actionOnExpiryOptions,
  DEFAULT_RETENTION_DAYS,
  MIN_AUDIT_RETENTION_DAYS,
} from './retention.types.js';

type AuthenticatedUser = {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
};

const dataCategoryEnum = z.enum(dataCategories);
const actionOnExpiryEnum = z.enum(actionOnExpiryOptions);

const createPolicyBodySchema = z.object({
  dataCategory: dataCategoryEnum,
  retentionDays: z.number().int().min(-1).max(2555),
  actionOnExpiry: actionOnExpiryEnum,
});

const updatePolicyBodySchema = z.object({
  retentionDays: z.number().int().min(-1).max(2555).optional(),
  actionOnExpiry: actionOnExpiryEnum.optional(),
  legalHold: z.boolean().optional(),
});

const applyTemplateBodySchema = z.object({
  templateId: z.string().min(1),
});

const listArchivesQuerySchema = z.object({
  dataCategory: dataCategoryEnum.optional(),
  limit: z.number().int().min(1).max(100).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

const jobHistoryQuerySchema = z.object({
  dataCategory: dataCategoryEnum.optional(),
  limit: z.number().int().min(1).max(100).optional().default(100),
});

export async function retentionRoutes(fastify: FastifyInstance, _config: unknown): Promise<void> {
  fastify.get(
    '/admin/retention/policies',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;

      try {
        const policies = await retentionService.listRetentionPolicies(user.tenantId);

        return reply.send({
          success: true,
          data: policies.map((p) => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          })),
        });
      } catch (error) {
        request.log.error(error, 'Failed to list retention policies');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to list retention policies' },
        });
      }
    },
  );

  fastify.get<{ Params: { dataCategory: string } }>(
    '/admin/retention/policies/:dataCategory',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { dataCategory } = request.params;

      if (!dataCategories.includes(dataCategory as (typeof dataCategories)[number])) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Invalid data category' },
        });
      }

      try {
        const policy = await retentionService.getEffectiveRetentionPolicy(
          user.tenantId,
          dataCategory as (typeof dataCategories)[number],
        );

        return reply.send({
          success: true,
          data: {
            id: policy.id === 'default' ? null : policy.id,
            tenantId: policy.tenantId,
            dataCategory: policy.dataCategory,
            retentionDays: policy.retentionDays,
            actionOnExpiry: policy.actionOnExpiry,
            legalHold: policy.legalHold,
            effectiveRetentionDays: policy.effectiveRetentionDays,
            effectiveAction: policy.effectiveAction,
            isDefault: policy.id === 'default',
          },
        });
      } catch (error) {
        request.log.error(error, 'Failed to get retention policy');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get retention policy' },
        });
      }
    },
  );

  fastify.post<{ Body: z.infer<typeof createPolicyBodySchema> }>(
    '/admin/retention/policies',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body;

      if (!body) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_BODY', message: 'Request body is required' },
        });
      }

      const parsed = createPolicyBodySchema.safeParse(body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_BODY', message: 'Invalid request body' },
        });
      }

      const { dataCategory, retentionDays, actionOnExpiry } = parsed.data;

      if (
        dataCategory === 'audit_logs' &&
        retentionDays > 0 &&
        retentionDays < MIN_AUDIT_RETENTION_DAYS
      ) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_RETENTION',
            message: `Audit logs must be retained for at least ${MIN_AUDIT_RETENTION_DAYS} days (7 years)`,
          },
        });
      }

      try {
        const existing = await retentionService.getRetentionPolicy(user.tenantId, dataCategory);
        if (existing) {
          return reply.code(409).send({
            success: false,
            error: { code: 'CONFLICT', message: 'Policy already exists for this data category' },
          });
        }

        const policy = await retentionService.createRetentionPolicy(
          user.tenantId,
          {
            dataCategory,
            retentionDays,
            actionOnExpiry,
          },
          user.userId,
        );

        return reply.code(201).send({
          success: true,
          data: {
            ...policy,
            createdAt: policy.createdAt.toISOString(),
            updatedAt: policy.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        request.log.error(error, 'Failed to create retention policy');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create retention policy' },
        });
      }
    },
  );

  fastify.patch<{ Params: { dataCategory: string }; Body: z.infer<typeof updatePolicyBodySchema> }>(
    '/admin/retention/policies/:dataCategory',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { dataCategory } = request.params;
      const body = request.body;

      if (!dataCategories.includes(dataCategory as (typeof dataCategories)[number])) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Invalid data category' },
        });
      }

      if (
        body &&
        body.retentionDays !== undefined &&
        dataCategory === 'audit_logs' &&
        body.retentionDays > 0 &&
        body.retentionDays < MIN_AUDIT_RETENTION_DAYS
      ) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_RETENTION',
            message: `Audit logs must be retained for at least ${MIN_AUDIT_RETENTION_DAYS} days (7 years)`,
          },
        });
      }

      try {
        const updateInput: {
          retentionDays?: number;
          actionOnExpiry?: (typeof actionOnExpiryOptions)[number];
          legalHold?: boolean;
        } = {};
        if (body?.retentionDays !== undefined) updateInput.retentionDays = body.retentionDays;
        if (body?.actionOnExpiry !== undefined) updateInput.actionOnExpiry = body.actionOnExpiry;
        if (body?.legalHold !== undefined) updateInput.legalHold = body.legalHold;

        const policy = await retentionService.updateRetentionPolicy(
          user.tenantId,
          dataCategory as (typeof dataCategories)[number],
          updateInput,
        );

        if (!policy) {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Policy not found' },
          });
        }

        return reply.send({
          success: true,
          data: {
            ...policy,
            createdAt: policy.createdAt.toISOString(),
            updatedAt: policy.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        request.log.error(error, 'Failed to update retention policy');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update retention policy' },
        });
      }
    },
  );

  fastify.delete<{ Params: { dataCategory: string } }>(
    '/admin/retention/policies/:dataCategory',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { dataCategory } = request.params;

      if (!dataCategories.includes(dataCategory as (typeof dataCategories)[number])) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Invalid data category' },
        });
      }

      try {
        const deleted = await retentionService.deleteRetentionPolicy(
          user.tenantId,
          dataCategory as (typeof dataCategories)[number],
        );

        if (!deleted) {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Policy not found' },
          });
        }

        return reply.code(204).send();
      } catch (error) {
        request.log.error(error, 'Failed to delete retention policy');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to delete retention policy' },
        });
      }
    },
  );

  fastify.get(
    '/admin/retention/frameworks',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const templates = await retentionService.getComplianceTemplates();

        return reply.send({
          success: true,
          data: templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            retentionDays: t.retentionDays,
          })),
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get compliance frameworks' },
        });
      }
    },
  );

  fastify.post<{ Body: z.infer<typeof applyTemplateBodySchema> }>(
    '/admin/retention/frameworks/apply',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body;

      if (!body) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_BODY', message: 'Request body is required' },
        });
      }

      const parsed = applyTemplateBodySchema.safeParse(body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_BODY', message: 'Invalid request body' },
        });
      }

      try {
        const policies = await retentionService.applyComplianceTemplate(
          user.tenantId,
          parsed.data.templateId,
          user.userId,
        );

        return reply.send({
          success: true,
          data: {
            templateId: parsed.data.templateId,
            policiesCreated: policies.length,
          },
        });
      } catch (error) {
        request.log.error(error, 'Failed to apply compliance template');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to apply compliance template' },
        });
      }
    },
  );

  fastify.get<{ Querystring: z.infer<typeof listArchivesQuerySchema> }>(
    '/admin/retention/archives',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query || {};

      try {
        const result = await archiveService.listArchives(
          user.tenantId,
          query.dataCategory,
          query.limit || 100,
          query.offset || 0,
        );

        return reply.send({
          success: true,
          data: {
            archives: result.archives,
            total: result.total,
            limit: query.limit || 100,
            offset: query.offset || 0,
          },
        });
      } catch (error) {
        request.log.error(error, 'Failed to list archives');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to list archives' },
        });
      }
    },
  );

  fastify.get<{ Params: { archiveId: string } }>(
    '/admin/retention/archives/:archiveId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { archiveId } = request.params;

      try {
        const result = await archiveService.retrieve(user.tenantId, archiveId);

        if (!result.success) {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: result.error || 'Archive not found' },
          });
        }

        return reply.send({
          success: true,
          data: result.data,
        });
      } catch (error) {
        request.log.error(error, 'Failed to retrieve archive');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve archive' },
        });
      }
    },
  );

  fastify.get(
    '/admin/retention/archives/stats',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;

      try {
        const stats = await archiveService.getArchiveStats(user.tenantId);

        return reply.send({
          success: true,
          data: {
            totalArchives: stats.totalArchives,
            byCategory: stats.byCategory,
            totalRetrievals: stats.totalRetrievals,
            oldestArchive: stats.oldestArchive?.toISOString() ?? null,
            newestArchive: stats.newestArchive?.toISOString() ?? null,
          },
        });
      } catch (error) {
        request.log.error(error, 'Failed to get archive stats');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get archive stats' },
        });
      }
    },
  );

  fastify.get<{ Querystring: z.infer<typeof jobHistoryQuerySchema> }>(
    '/admin/retention/job-history',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
    },
    async (request, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query || {};

      try {
        const history = await retentionService.getRetentionJobHistory(
          user.tenantId,
          query.dataCategory,
          query.limit || 100,
        );

        return reply.send({
          success: true,
          data: history,
        });
      } catch (error) {
        request.log.error(error, 'Failed to get retention job history');
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get retention job history' },
        });
      }
    },
  );

  fastify.get(
    '/retention/defaults',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: {
          defaults: DEFAULT_RETENTION_DAYS,
          minAuditRetentionDays: MIN_AUDIT_RETENTION_DAYS,
        },
      });
    },
  );
}
