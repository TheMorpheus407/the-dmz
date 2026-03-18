import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';

import {
  createCampaign,
  listCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  setCampaignAudience,
  addCampaignContent,
  removeCampaignContent,
  setCampaignEscalations,
  getCampaignProgress,
  enrollUsersInCampaign,
  getEligibleUsersForCampaign,
  checkInterventionThrottling,
  saveCampaignAsTemplate,
  listCampaignTemplates,
  createCampaignFromTemplate,
  deleteCampaignTemplate,
  updateEnrollmentStatus,
  type CampaignStatus,
  type CampaignType,
  type RecurrencePattern,
  type ContentType,
  type EnrollmentStatus,
  type CampaignContentInput,
  type CampaignEscalationInput,
} from './campaign.service.js';

// eslint-disable-next-line import-x/no-restricted-paths
import type { AuthenticatedUser } from '../auth/auth.types.js';

const campaignStatusEnum = z.enum(['draft', 'active', 'paused', 'completed']);
const campaignTypeEnum = z.enum(['onboarding', 'quarterly', 'annual', 'event-driven']);
const recurrencePatternEnum = z.enum(['one-time', 'weekly', 'monthly', 'quarterly', 'annual']);
const contentTypeEnum = z.enum(['module', 'assessment', 'phishing_simulation']);
const enrollmentStatusEnum = z.enum(['not_started', 'in_progress', 'completed']);

const campaignCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  campaignType: campaignTypeEnum,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
  recurrencePattern: recurrencePatternEnum.optional(),
});

const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  campaignType: campaignTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
  recurrencePattern: recurrencePatternEnum.optional(),
});

const campaignStatusUpdateSchema = z.object({
  status: campaignStatusEnum,
});

const campaignAudienceSchema = z.object({
  groupIds: z.array(z.string().uuid()).optional(),
  departments: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  attributeFilters: z.record(z.unknown()).optional(),
});

const campaignContentSchema = z.object({
  contentType: contentTypeEnum,
  contentItemId: z.string().uuid(),
  orderIndex: z.number().int().optional(),
  dueDays: z.number().int().optional(),
  isPrerequisite: z.boolean().optional(),
});

const campaignEscalationSchema = z.object({
  reminderDays: z.array(z.number().int()).optional(),
  managerNotification: z.boolean().optional(),
  complianceAlert: z.boolean().optional(),
  complianceAlertThreshold: z.number().int().optional(),
});

const campaignListQuerySchema = z.object({
  status: campaignStatusEnum.optional(),
  campaignType: campaignTypeEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const enrollUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
});

const enrollmentStatusUpdateSchema = z.object({
  status: enrollmentStatusEnum,
});

interface CampaignCreateBody {
  name: string;
  description?: string;
  campaignType: CampaignType;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  recurrencePattern?: RecurrencePattern;
}

interface CampaignUpdateBody {
  name?: string;
  description?: string;
  campaignType?: CampaignType;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  recurrencePattern?: RecurrencePattern;
}

interface CampaignStatusUpdateBody {
  status: CampaignStatus;
}

interface CampaignAudienceBody {
  groupIds?: string[];
  departments?: string[];
  locations?: string[];
  roles?: string[];
  attributeFilters?: Record<string, unknown>;
}

interface CampaignContentBody {
  contentType: ContentType;
  contentItemId: string;
  orderIndex?: number;
  dueDays?: number;
  isPrerequisite?: boolean;
}

interface CampaignEscalationBody {
  reminderDays?: number[];
  managerNotification?: boolean;
  complianceAlert?: boolean;
  complianceAlertThreshold?: number;
}

interface CampaignListQuery {
  status?: CampaignStatus;
  campaignType?: CampaignType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface CampaignParams {
  campaignId: string;
}

interface ContentParams {
  campaignId: string;
  contentId: string;
}

interface TemplateParams {
  templateId: string;
}

interface EnrollmentParams {
  enrollmentId: string;
}

interface EnrollmentStatusBody {
  status: EnrollmentStatus;
}

export const registerCampaignRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Body: CampaignCreateBody }>(
    '/admin/campaigns',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'campaignType'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            campaignType: {
              type: 'string',
              enum: ['onboarding', 'quarterly', 'annual', 'event-driven'],
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            timezone: { type: 'string', maxLength: 50 },
            recurrencePattern: {
              type: 'string',
              enum: ['one-time', 'weekly', 'monthly', 'quarterly', 'annual'],
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CampaignCreateBody }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const input = campaignCreateSchema.parse(request.body);

        const user = request.user as AuthenticatedUser;
        const createdBy = user?.userId ?? 'unknown';

        const campaign = await createCampaign(tenantId, {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          createdBy,
        });

        return reply.code(201).send({
          success: true,
          data: {
            campaignId: campaign.campaignId,
            name: campaign.name,
            description: campaign.description,
            status: campaign.status,
            campaignType: campaign.campaignType,
            startDate: campaign.startDate?.toISOString() ?? null,
            endDate: campaign.endDate?.toISOString() ?? null,
            timezone: campaign.timezone,
            recurrencePattern: campaign.recurrencePattern,
            createdAt: campaign.createdAt.toISOString(),
            updatedAt: campaign.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_CREATE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Querystring: CampaignListQuery }>(
    '/admin/campaigns',
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
            status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed'] },
            campaignType: {
              type: 'string',
              enum: ['onboarding', 'quarterly', 'annual', 'event-driven'],
            },
            dateFrom: { type: 'string', format: 'date-time' },
            dateTo: { type: 'string', format: 'date-time' },
            search: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: CampaignListQuery }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const query = campaignListQuerySchema.parse(request.query);

        const result = await listCampaigns(tenantId, {
          ...query,
          dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
          dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        });

        return reply.code(200).send({
          success: true,
          data: {
            campaigns: result.campaigns.map((c) => ({
              campaignId: c.campaignId,
              name: c.name,
              description: c.description,
              status: c.status,
              campaignType: c.campaignType,
              startDate: c.startDate?.toISOString() ?? null,
              endDate: c.endDate?.toISOString() ?? null,
              timezone: c.timezone,
              recurrencePattern: c.recurrencePattern,
              enrollmentCount: c.enrollmentCount ?? 0,
              completedCount: c.completedCount ?? 0,
              createdAt: c.createdAt.toISOString(),
              updatedAt: c.updatedAt.toISOString(),
            })),
            total: result.total,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_LIST_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Params: CampaignParams }>(
    '/admin/campaigns/:campaignId',
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
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: CampaignParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;

        const campaign = await getCampaignById(tenantId, campaignId);

        if (!campaign) {
          return reply.code(404).send({
            success: false,
            error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            campaignId: campaign.campaignId,
            name: campaign.name,
            description: campaign.description,
            status: campaign.status,
            campaignType: campaign.campaignType,
            startDate: campaign.startDate?.toISOString() ?? null,
            endDate: campaign.endDate?.toISOString() ?? null,
            timezone: campaign.timezone,
            recurrencePattern: campaign.recurrencePattern,
            createdBy: campaign.createdBy,
            audience: campaign.audience
              ? {
                  audienceId: campaign.audience.audienceId,
                  groupIds: campaign.audience.groupIds,
                  departments: campaign.audience.departments,
                  locations: campaign.audience.locations,
                  roles: campaign.audience.roles,
                  attributeFilters: campaign.audience.attributeFilters,
                }
              : null,
            content:
              campaign.content?.map((c) => ({
                contentId: c.contentId,
                contentType: c.contentType,
                contentItemId: c.contentItemId,
                orderIndex: c.orderIndex,
                dueDays: c.dueDays,
                isPrerequisite: c.isPrerequisite,
              })) ?? [],
            escalations: campaign.escalations
              ? {
                  escalationId: campaign.escalations.escalationId,
                  reminderDays: campaign.escalations.reminderDays,
                  managerNotification: campaign.escalations.managerNotification,
                  complianceAlert: campaign.escalations.complianceAlert,
                  complianceAlertThreshold: campaign.escalations.complianceAlertThreshold,
                }
              : null,
            enrollmentCount: campaign.enrollmentCount ?? 0,
            completedCount: campaign.completedCount ?? 0,
            createdAt: campaign.createdAt.toISOString(),
            updatedAt: campaign.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_GET_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.put<{ Params: CampaignParams; Body: CampaignUpdateBody }>(
    '/admin/campaigns/:campaignId',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            campaignType: {
              type: 'string',
              enum: ['onboarding', 'quarterly', 'annual', 'event-driven'],
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            timezone: { type: 'string', maxLength: 50 },
            recurrencePattern: {
              type: 'string',
              enum: ['one-time', 'weekly', 'monthly', 'quarterly', 'annual'],
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: CampaignParams; Body: CampaignUpdateBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;
        const input = campaignUpdateSchema.parse(request.body);

        const campaign = await updateCampaign(tenantId, campaignId, {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });

        if (!campaign) {
          return reply.code(404).send({
            success: false,
            error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            campaignId: campaign.campaignId,
            name: campaign.name,
            description: campaign.description,
            status: campaign.status,
            campaignType: campaign.campaignType,
            startDate: campaign.startDate?.toISOString() ?? null,
            endDate: campaign.endDate?.toISOString() ?? null,
            timezone: campaign.timezone,
            recurrencePattern: campaign.recurrencePattern,
            createdAt: campaign.createdAt.toISOString(),
            updatedAt: campaign.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_UPDATE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.patch<{ Params: CampaignParams; Body: CampaignStatusUpdateBody }>(
    '/admin/campaigns/:campaignId/status',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: CampaignParams; Body: CampaignStatusUpdateBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;
        const { status } = campaignStatusUpdateSchema.parse(request.body);

        const campaign = await updateCampaignStatus(tenantId, campaignId, status);

        if (!campaign) {
          return reply.code(404).send({
            success: false,
            error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            campaignId: campaign.campaignId,
            status: campaign.status,
            updatedAt: campaign.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_STATUS_UPDATE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.delete<{ Params: CampaignParams }>(
    '/admin/campaigns/:campaignId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: CampaignParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;

        await deleteCampaign(tenantId, campaignId);

        return reply.code(200).send({
          success: true,
          data: { message: 'Campaign deleted successfully' },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_DELETE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Params: CampaignParams; Body: CampaignAudienceBody }>(
    '/admin/campaigns/:campaignId/audience',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            groupIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            departments: { type: 'array', items: { type: 'string' } },
            locations: { type: 'array', items: { type: 'string' } },
            roles: { type: 'array', items: { type: 'string' } },
            attributeFilters: { type: 'object' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: CampaignParams; Body: CampaignAudienceBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;
        const input = campaignAudienceSchema.parse(request.body);

        const audience = await setCampaignAudience(tenantId, campaignId, input);

        return reply.code(200).send({
          success: true,
          data: {
            audienceId: audience.audienceId,
            groupIds: audience.groupIds,
            departments: audience.departments,
            locations: audience.locations,
            roles: audience.roles,
            attributeFilters: audience.attributeFilters,
            createdAt: audience.createdAt.toISOString(),
            updatedAt: audience.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_AUDIENCE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Params: CampaignParams; Body: CampaignContentBody }>(
    '/admin/campaigns/:campaignId/content',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['contentType', 'contentItemId'],
          properties: {
            contentType: { type: 'string', enum: ['module', 'assessment', 'phishing_simulation'] },
            contentItemId: { type: 'string', format: 'uuid' },
            orderIndex: { type: 'number' },
            dueDays: { type: 'number' },
            isPrerequisite: { type: 'boolean' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: CampaignParams; Body: CampaignContentBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;
        const inputRaw = campaignContentSchema.parse(request.body);

        const input: CampaignContentInput = {
          contentType: inputRaw.contentType,
          contentItemId: inputRaw.contentItemId,
        };
        if (inputRaw.orderIndex !== undefined) input.orderIndex = inputRaw.orderIndex;
        if (inputRaw.dueDays !== undefined) input.dueDays = inputRaw.dueDays;
        if (inputRaw.isPrerequisite !== undefined) input.isPrerequisite = inputRaw.isPrerequisite;

        const content = await addCampaignContent(tenantId, campaignId, input);

        return reply.code(201).send({
          success: true,
          data: {
            contentId: content.contentId,
            contentType: content.contentType,
            contentItemId: content.contentItemId,
            orderIndex: content.orderIndex,
            dueDays: content.dueDays,
            isPrerequisite: content.isPrerequisite,
            createdAt: content.createdAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_CONTENT_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.delete<{ Params: ContentParams }>(
    '/admin/campaigns/:campaignId/content/:contentId',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
            contentId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: ContentParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId, contentId } = request.params;

        await removeCampaignContent(tenantId, campaignId, contentId);

        return reply.code(200).send({
          success: true,
          data: { message: 'Content removed successfully' },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_CONTENT_DELETE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Params: CampaignParams }>(
    '/admin/campaigns/:campaignId/progress',
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
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: CampaignParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;

        const progress = await getCampaignProgress(tenantId, campaignId);

        if (!progress) {
          return reply.code(404).send({
            success: false,
            error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            totalEnrolled: progress.totalEnrolled,
            notStarted: progress.notStarted,
            inProgress: progress.inProgress,
            completed: progress.completed,
            completionRate: progress.completionRate,
            averageTimeToComplete: progress.averageTimeToComplete,
            byDepartment: progress.byDepartment,
            byRole: progress.byRole,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_PROGRESS_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Params: CampaignParams; Body: { name: string; description?: string } }>(
    '/admin/campaigns/:campaignId/template',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: CampaignParams;
        Body: { name: string; description?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;
        const { name, description } = request.body;

        const template = await saveCampaignAsTemplate(tenantId, campaignId, name, description);

        return reply.code(201).send({
          success: true,
          data: {
            templateId: template.templateId,
            name: template.name,
            description: template.description,
            campaignType: template.campaignType,
            createdAt: template.createdAt.toISOString(),
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_TEMPLATE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.get(
    '/admin/campaigns/templates',
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
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;

        const templates = await listCampaignTemplates(tenantId);

        return reply.code(200).send({
          success: true,
          data: {
            templates: templates.map((t) => ({
              templateId: t.templateId,
              name: t.name,
              description: t.description,
              campaignType: t.campaignType,
              createdAt: t.createdAt.toISOString(),
              updatedAt: t.updatedAt.toISOString(),
            })),
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'TEMPLATE_LIST_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Body: { templateId: string; name: string } }>(
    '/admin/campaigns/from-template',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        body: {
          type: 'object',
          required: ['templateId', 'name'],
          properties: {
            templateId: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { templateId: string; name: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { templateId, name } = request.body;

        const user = request.user as AuthenticatedUser;
        const createdBy = user?.userId ?? 'unknown';

        const campaign = await createCampaignFromTemplate(tenantId, templateId, name, createdBy);

        return reply.code(201).send({
          success: true,
          data: {
            campaignId: campaign.campaignId,
            name: campaign.name,
            campaignType: campaign.campaignType,
            status: campaign.status,
            createdAt: campaign.createdAt.toISOString(),
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_FROM_TEMPLATE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.delete<{ Params: TemplateParams }>(
    '/admin/campaigns/templates/:templateId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            templateId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: TemplateParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { templateId } = request.params;

        await deleteCampaignTemplate(tenantId, templateId);

        return reply.code(200).send({
          success: true,
          data: { message: 'Template deleted successfully' },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'TEMPLATE_DELETE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Params: CampaignParams; Body: { userIds: string[] } }>(
    '/admin/campaigns/:campaignId/enroll',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['userIds'],
          properties: {
            userIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
              maxItems: 500,
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: CampaignParams; Body: { userIds: string[] } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;
        const { userIds } = enrollUsersSchema.parse(request.body);

        const enrollments = await enrollUsersInCampaign(tenantId, campaignId, userIds);

        return reply.code(201).send({
          success: true,
          data: {
            enrolled: enrollments.length,
            enrollments: enrollments.map((e) => ({
              enrollmentId: e.enrollmentId,
              userId: e.userId,
              status: e.status,
              enrolledAt: e.enrolledAt.toISOString(),
              dueDate: e.dueDate?.toISOString() ?? null,
            })),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_ENROLL_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Params: CampaignParams }>(
    '/admin/campaigns/:campaignId/eligible-users',
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
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: CampaignParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;

        const eligibleUserIds = await getEligibleUsersForCampaign(tenantId, campaignId);

        return reply.code(200).send({
          success: true,
          data: {
            eligibleUsers: eligibleUserIds.length,
            userIds: eligibleUserIds,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'ELIGIBLE_USERS_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    '/admin/campaigns/throttle-check/:userId',
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
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const { userId } = request.params;

        const canEnroll = await checkInterventionThrottling(userId);

        return reply.code(200).send({
          success: true,
          data: {
            canEnroll,
            maxPerWeek: 2,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'THROTTLE_CHECK_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.patch<{ Params: EnrollmentParams; Body: EnrollmentStatusBody }>(
    '/admin/campaigns/enrollments/:enrollmentId/status',
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
            enrollmentId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['not_started', 'in_progress', 'completed'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: EnrollmentParams; Body: EnrollmentStatusBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { enrollmentId } = request.params;
        const { status } = enrollmentStatusUpdateSchema.parse(request.body);

        const enrollment = await updateEnrollmentStatus(tenantId, enrollmentId, status);

        if (!enrollment) {
          return reply.code(404).send({
            success: false,
            error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' },
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            enrollmentId: enrollment.enrollmentId,
            status: enrollment.status,
            completedAt: enrollment.completedAt?.toISOString() ?? null,
            updatedAt: enrollment.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'ENROLLMENT_STATUS_UPDATE_ERROR', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Params: CampaignParams; Body: CampaignEscalationBody }>(
    '/admin/campaigns/:campaignId/escalations',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reminderDays: { type: 'array', items: { type: 'number' } },
            managerNotification: { type: 'boolean' },
            complianceAlert: { type: 'boolean' },
            complianceAlertThreshold: { type: 'number' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: CampaignParams; Body: CampaignEscalationBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
          });
        }

        const { tenantId } = tenantContextData;
        const { campaignId } = request.params;
        const inputRaw = campaignEscalationSchema.parse(request.body);

        const input: CampaignEscalationInput = {};
        if (inputRaw.reminderDays !== undefined) input.reminderDays = inputRaw.reminderDays;
        if (inputRaw.managerNotification !== undefined)
          input.managerNotification = inputRaw.managerNotification;
        if (inputRaw.complianceAlert !== undefined)
          input.complianceAlert = inputRaw.complianceAlert;
        if (inputRaw.complianceAlertThreshold !== undefined)
          input.complianceAlertThreshold = inputRaw.complianceAlertThreshold;

        const escalation = await setCampaignEscalations(tenantId, campaignId, input);

        return reply.code(200).send({
          success: true,
          data: {
            escalationId: escalation.escalationId,
            reminderDays: escalation.reminderDays,
            managerNotification: escalation.managerNotification,
            complianceAlert: escalation.complianceAlert,
            complianceAlertThreshold: escalation.complianceAlertThreshold,
            createdAt: escalation.createdAt.toISOString(),
            updatedAt: escalation.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          success: false,
          error: { code: 'CAMPAIGN_ESCALATION_ERROR', message: errorMessage },
        });
      }
    },
  );
};
