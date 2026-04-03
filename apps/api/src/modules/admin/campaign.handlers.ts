import { z } from 'zod';

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
  type CampaignContentInput,
  type CampaignEscalationInput,
} from './campaign.service.js';
import {
  campaignCreateSchema,
  campaignUpdateSchema,
  campaignStatusUpdateSchema,
  campaignAudienceSchema,
  campaignContentSchema,
  campaignEscalationSchema,
  campaignListQuerySchema,
  enrollUsersSchema,
  enrollmentStatusUpdateSchema,
} from './campaign.schemas.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

export type CampaignCreateBody = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateBody = z.infer<typeof campaignUpdateSchema>;
export type CampaignStatusUpdateBody = z.infer<typeof campaignStatusUpdateSchema>;
export type CampaignAudienceBody = z.infer<typeof campaignAudienceSchema>;
export type CampaignContentBody = z.infer<typeof campaignContentSchema>;
export type CampaignEscalationBody = z.infer<typeof campaignEscalationSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type EnrollUsersBody = z.infer<typeof enrollUsersSchema>;
export type EnrollmentStatusBody = z.infer<typeof enrollmentStatusUpdateSchema>;

export interface CampaignParams {
  campaignId: string;
}

export interface ContentParams {
  campaignId: string;
  contentId: string;
}

export interface TemplateParams {
  templateId: string;
}

export interface EnrollmentParams {
  enrollmentId: string;
}

export interface UserParams {
  userId: string;
}

export interface SaveTemplateBody {
  name: string;
  description?: string;
}

export interface CreateFromTemplateBody {
  templateId: string;
  name: string;
}

function getTenantId(request: FastifyRequest): string | null {
  return request.tenantContext?.tenantId ?? null;
}

function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser | undefined {
  return request.user;
}

export async function handleCreateCampaign(
  request: FastifyRequest<{ Body: CampaignCreateBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const input = campaignCreateSchema.parse(request.body);
    const user = getAuthenticatedUser(request);
    const createdBy = user?.userId ?? 'unknown';

    const campaign = await createCampaign(tenantId, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      createdBy,
    });

    reply.code(201).send({
      success: true,
      data: {
        campaignId: campaign.campaignId,
        name: campaign.name,
        description: campaign.description ?? null,
        status: campaign.status,
        campaignType: campaign.campaignType,
        startDate: campaign.startDate?.toISOString() ?? null,
        endDate: campaign.endDate?.toISOString() ?? null,
        timezone: campaign.timezone ?? null,
        recurrencePattern: campaign.recurrencePattern ?? null,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_CREATE_ERROR', message: errorMessage },
    });
  }
}

export async function handleListCampaigns(
  request: FastifyRequest<{ Querystring: CampaignListQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const query = campaignListQuerySchema.parse(request.query);
    const result = await listCampaigns(tenantId, {
      ...query,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });

    reply.code(200).send({
      success: true,
      data: {
        campaigns: result.campaigns.map((c) => ({
          campaignId: c.campaignId,
          name: c.name,
          description: c.description ?? null,
          status: c.status,
          campaignType: c.campaignType,
          startDate: c.startDate?.toISOString() ?? null,
          endDate: c.endDate?.toISOString() ?? null,
          timezone: c.timezone ?? null,
          recurrencePattern: c.recurrencePattern ?? null,
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
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_LIST_ERROR', message: errorMessage },
    });
  }
}

export async function handleGetCampaign(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const campaign = await getCampaignById(tenantId, campaignId);

    if (!campaign) {
      reply.code(404).send({
        success: false,
        error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
      });
      return;
    }

    reply.code(200).send({
      success: true,
      data: {
        campaignId: campaign.campaignId,
        name: campaign.name,
        description: campaign.description ?? null,
        status: campaign.status,
        campaignType: campaign.campaignType,
        startDate: campaign.startDate?.toISOString() ?? null,
        endDate: campaign.endDate?.toISOString() ?? null,
        timezone: campaign.timezone ?? null,
        recurrencePattern: campaign.recurrencePattern ?? null,
        createdBy: campaign.createdBy ?? null,
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
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_GET_ERROR', message: errorMessage },
    });
  }
}

export async function handleUpdateCampaign(
  request: FastifyRequest<{ Params: CampaignParams; Body: CampaignUpdateBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const input = campaignUpdateSchema.parse(request.body);

    const campaign = await updateCampaign(tenantId, campaignId, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    });

    if (!campaign) {
      reply.code(404).send({
        success: false,
        error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
      });
      return;
    }

    reply.code(200).send({
      success: true,
      data: {
        campaignId: campaign.campaignId,
        name: campaign.name,
        description: campaign.description ?? null,
        status: campaign.status,
        campaignType: campaign.campaignType,
        startDate: campaign.startDate?.toISOString() ?? null,
        endDate: campaign.endDate?.toISOString() ?? null,
        timezone: campaign.timezone ?? null,
        recurrencePattern: campaign.recurrencePattern ?? null,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_UPDATE_ERROR', message: errorMessage },
    });
  }
}

export async function handleUpdateCampaignStatus(
  request: FastifyRequest<{ Params: CampaignParams; Body: CampaignStatusUpdateBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const { status } = campaignStatusUpdateSchema.parse(request.body);

    const campaign = await updateCampaignStatus(tenantId, campaignId, status);

    if (!campaign) {
      reply.code(404).send({
        success: false,
        error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
      });
      return;
    }

    reply.code(200).send({
      success: true,
      data: {
        campaignId: campaign.campaignId,
        status: campaign.status,
        updatedAt: campaign.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_STATUS_UPDATE_ERROR', message: errorMessage },
    });
  }
}

export async function handleDeleteCampaign(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    await deleteCampaign(tenantId, campaignId);

    reply.code(200).send({
      success: true,
      data: { message: 'Campaign deleted successfully' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_DELETE_ERROR', message: errorMessage },
    });
  }
}

export async function handleSetCampaignAudience(
  request: FastifyRequest<{ Params: CampaignParams; Body: CampaignAudienceBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const input = campaignAudienceSchema.parse(request.body);

    const audience = await setCampaignAudience(tenantId, campaignId, input);

    reply.code(200).send({
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
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_AUDIENCE_ERROR', message: errorMessage },
    });
  }
}

export async function handleAddCampaignContent(
  request: FastifyRequest<{ Params: CampaignParams; Body: CampaignContentBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
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

    reply.code(201).send({
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
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_CONTENT_ERROR', message: errorMessage },
    });
  }
}

export async function handleRemoveCampaignContent(
  request: FastifyRequest<{ Params: ContentParams }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId, contentId } = request.params;
    await removeCampaignContent(tenantId, campaignId, contentId);

    reply.code(200).send({
      success: true,
      data: { message: 'Content removed successfully' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_CONTENT_DELETE_ERROR', message: errorMessage },
    });
  }
}

export async function handleGetCampaignProgress(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const progress = await getCampaignProgress(tenantId, campaignId);

    if (!progress) {
      reply.code(404).send({
        success: false,
        error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' },
      });
      return;
    }

    reply.code(200).send({
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
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_PROGRESS_ERROR', message: errorMessage },
    });
  }
}

export async function handleSaveCampaignAsTemplate(
  request: FastifyRequest<{ Params: CampaignParams; Body: SaveTemplateBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const { name, description } = request.body;

    const template = await saveCampaignAsTemplate(tenantId, campaignId, name, description);

    reply.code(201).send({
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
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_TEMPLATE_ERROR', message: errorMessage },
    });
  }
}

export async function handleListCampaignTemplates(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const templates = await listCampaignTemplates(tenantId);

    reply.code(200).send({
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
    reply.code(500).send({
      success: false,
      error: { code: 'TEMPLATE_LIST_ERROR', message: errorMessage },
    });
  }
}

export async function handleCreateCampaignFromTemplate(
  request: FastifyRequest<{ Body: CreateFromTemplateBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { templateId, name } = request.body;
    const user = getAuthenticatedUser(request);
    const createdBy = user?.userId ?? 'unknown';

    const campaign = await createCampaignFromTemplate(tenantId, templateId, name, createdBy);

    reply.code(201).send({
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
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_FROM_TEMPLATE_ERROR', message: errorMessage },
    });
  }
}

export async function handleDeleteCampaignTemplate(
  request: FastifyRequest<{ Params: TemplateParams }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { templateId } = request.params;
    await deleteCampaignTemplate(tenantId, templateId);

    reply.code(200).send({
      success: true,
      data: { message: 'Template deleted successfully' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'TEMPLATE_DELETE_ERROR', message: errorMessage },
    });
  }
}

export async function handleEnrollUsersInCampaign(
  request: FastifyRequest<{ Params: CampaignParams; Body: EnrollUsersBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const { userIds } = enrollUsersSchema.parse(request.body);

    const enrollments = await enrollUsersInCampaign(tenantId, campaignId, userIds);

    reply.code(201).send({
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
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_ENROLL_ERROR', message: errorMessage },
    });
  }
}

export async function handleGetEligibleUsers(
  request: FastifyRequest<{ Params: CampaignParams }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const eligibleUserIds = await getEligibleUsersForCampaign(tenantId, campaignId);

    reply.code(200).send({
      success: true,
      data: {
        eligibleUsers: eligibleUserIds.length,
        userIds: eligibleUserIds,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'ELIGIBLE_USERS_ERROR', message: errorMessage },
    });
  }
}

export async function handleThrottleCheck(
  request: FastifyRequest<{ Params: UserParams }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { userId } = request.params;
    const canEnroll = await checkInterventionThrottling(tenantId, userId);

    reply.code(200).send({
      success: true,
      data: {
        canEnroll,
        maxPerWeek: 2,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'THROTTLE_CHECK_ERROR', message: errorMessage },
    });
  }
}

export async function handleUpdateEnrollmentStatus(
  request: FastifyRequest<{ Params: EnrollmentParams; Body: EnrollmentStatusBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { enrollmentId } = request.params;
    const { status } = enrollmentStatusUpdateSchema.parse(request.body);

    const enrollment = await updateEnrollmentStatus(tenantId, enrollmentId, status);

    if (!enrollment) {
      reply.code(404).send({
        success: false,
        error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' },
      });
      return;
    }

    reply.code(200).send({
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
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'ENROLLMENT_STATUS_UPDATE_ERROR', message: errorMessage },
    });
  }
}

export async function handleSetCampaignEscalations(
  request: FastifyRequest<{ Params: CampaignParams; Body: CampaignEscalationBody }>,
  reply: FastifyReply,
): Promise<void> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
    });
    return;
  }

  try {
    const { campaignId } = request.params;
    const inputRaw = campaignEscalationSchema.parse(request.body);

    const input: CampaignEscalationInput = {};
    if (inputRaw.reminderDays !== undefined) input.reminderDays = inputRaw.reminderDays;
    if (inputRaw.managerNotification !== undefined)
      input.managerNotification = inputRaw.managerNotification;
    if (inputRaw.complianceAlert !== undefined) input.complianceAlert = inputRaw.complianceAlert;
    if (inputRaw.complianceAlertThreshold !== undefined)
      input.complianceAlertThreshold = inputRaw.complianceAlertThreshold;

    const escalation = await setCampaignEscalations(tenantId, campaignId, input);

    reply.code(200).send({
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
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.code(500).send({
      success: false,
      error: { code: 'CAMPAIGN_ESCALATION_ERROR', message: errorMessage },
    });
  }
}
