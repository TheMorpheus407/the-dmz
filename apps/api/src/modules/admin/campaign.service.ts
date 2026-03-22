import { randomUUID } from 'crypto';

import { eq, and, desc, sql as sqlFn, inArray, type SQL } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  campaigns,
  campaignAudience,
  campaignContent,
  campaignEnrollments,
  campaignTemplates,
  campaignEscalations,
  type Campaign as CampaignRow,
} from '../../shared/database/schema/training/campaign.schema.js';
import { users } from '../../shared/database/schema/users.js';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type CampaignType = 'onboarding' | 'quarterly' | 'annual' | 'event-driven';
export type RecurrencePattern = 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type CampaignContentType = 'module' | 'assessment' | 'phishing_simulation';
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed';

export interface Campaign {
  campaignId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  campaignType: CampaignType;
  createdBy: string;
  startDate: Date | null;
  endDate: Date | null;
  timezone: string;
  recurrencePattern: RecurrencePattern;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignAudience {
  audienceId: string;
  campaignId: string;
  groupIds: string[];
  departments: string[];
  locations: string[];
  roles: string[];
  attributeFilters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignContent {
  contentId: string;
  campaignId: string;
  contentType: CampaignContentType;
  contentItemId: string;
  orderIndex: number;
  dueDays: number;
  isPrerequisite: boolean;
  createdAt: Date;
}

export interface CampaignEnrollment {
  enrollmentId: string;
  campaignId: string;
  userId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
  lastReminderAt: Date | null;
  reminderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignTemplate {
  templateId: string;
  tenantId: string;
  name: string;
  description: string | null;
  campaignType: CampaignType;
  audienceConfig: Record<string, unknown>;
  contentConfig: Record<string, unknown>;
  scheduleConfig: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignEscalation {
  escalationId: string;
  campaignId: string;
  reminderDays: number[];
  managerNotification: boolean;
  complianceAlert: boolean;
  complianceAlertThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignInput {
  name: string;
  description?: string | undefined;
  campaignType: CampaignType;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  timezone?: string | undefined;
  recurrencePattern?: RecurrencePattern | undefined;
  createdBy: string;
}

export interface CampaignUpdateInput {
  name?: string | undefined;
  description?: string | undefined;
  campaignType?: CampaignType | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  timezone?: string | undefined;
  recurrencePattern?: RecurrencePattern | undefined;
}

export interface CampaignAudienceInput {
  groupIds?: string[] | undefined;
  departments?: string[] | undefined;
  locations?: string[] | undefined;
  roles?: string[] | undefined;
  attributeFilters?: Record<string, unknown> | undefined;
}

export interface CampaignContentInput {
  contentType: CampaignContentType;
  contentItemId: string;
  orderIndex?: number | undefined;
  dueDays?: number | undefined;
  isPrerequisite?: boolean | undefined;
}

export interface CampaignEscalationInput {
  reminderDays?: number[] | undefined;
  managerNotification?: boolean | undefined;
  complianceAlert?: boolean | undefined;
  complianceAlertThreshold?: number | undefined;
}

export interface CampaignTemplateInput {
  name: string;
  description?: string;
  campaignType: CampaignType;
  audienceConfig: Record<string, unknown>;
  contentConfig: Record<string, unknown>;
  scheduleConfig: Record<string, unknown>;
}

export interface CampaignWithRelations extends Campaign {
  audience?: CampaignAudience | null;
  content?: CampaignContent[];
  escalations?: CampaignEscalation | null;
  enrollmentCount?: number;
  completedCount?: number;
}

export interface CampaignListQuery {
  status?: CampaignStatus | undefined;
  campaignType?: CampaignType | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
}

export interface CampaignListResult {
  campaigns: CampaignWithRelations[];
  total: number;
}

export interface CampaignProgressMetrics {
  totalEnrolled: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  averageTimeToComplete: number | null;
  byDepartment: { department: string; total: number; completed: number; rate: number }[];
  byRole: { role: string; total: number; completed: number; rate: number }[];
}

const MAX_INTERVENTIONS_PER_WEEK = 2;

function mapCampaignRow(row: CampaignRow): Campaign {
  return {
    campaignId: row.campaignId,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    status: row.status as CampaignStatus,
    campaignType: row.campaignType as CampaignType,
    createdBy: row.createdBy,
    startDate: row.startDate ? new Date(row.startDate) : null,
    endDate: row.endDate ? new Date(row.endDate) : null,
    timezone: row.timezone || 'UTC',
    recurrencePattern: (row.recurrencePattern || 'one-time') as RecurrencePattern,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const createCampaign = async (
  tenantId: string,
  input: CampaignInput,
  config: AppConfig = loadConfig(),
): Promise<Campaign> => {
  const db = getDatabaseClient(config);

  const [campaign] = await db
    .insert(campaigns)
    .values({
      campaignId: randomUUID(),
      tenantId,
      name: input.name,
      description: input.description ?? null,
      campaignType: input.campaignType,
      status: 'draft',
      createdBy: input.createdBy,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      timezone: input.timezone ?? 'UTC',
      recurrencePattern: input.recurrencePattern ?? 'one-time',
    })
    .returning();

  if (!campaign) {
    throw new Error('Failed to create campaign');
  }

  return mapCampaignRow(campaign);
};

export const listCampaigns = async (
  tenantId: string,
  query: CampaignListQuery,
  config: AppConfig = loadConfig(),
): Promise<CampaignListResult> => {
  const db = getDatabaseClient(config);

  const conditions: (SQL | undefined)[] = [eq(campaigns.tenantId, tenantId)];

  if (query.status) {
    conditions.push(eq(campaigns.status, query.status));
  }

  if (query.campaignType) {
    conditions.push(eq(campaigns.campaignType, query.campaignType));
  }

  if (query.dateFrom) {
    conditions.push(sqlFn`${campaigns.startDate} >= ${query.dateFrom}`);
  }

  if (query.dateTo) {
    conditions.push(sqlFn`${campaigns.endDate} <= ${query.dateTo}`);
  }

  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  const campaignList = await db
    .select()
    .from(campaigns)
    .where(and(...conditions))
    .orderBy(desc(campaigns.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sqlFn`count(*)` })
    .from(campaigns)
    .where(and(...conditions));

  const total = Number(countResult?.count ?? 0);

  const campaignsWithCounts = await Promise.all(
    campaignList.map(async (campaign) => {
      const [enrollmentCount] = await db
        .select({ count: sqlFn`count(*)` })
        .from(campaignEnrollments)
        .where(eq(campaignEnrollments.campaignId, campaign.campaignId));

      const [completedCount] = await db
        .select({ count: sqlFn`count(*)` })
        .from(campaignEnrollments)
        .where(
          and(
            eq(campaignEnrollments.campaignId, campaign.campaignId),
            eq(campaignEnrollments.status, 'completed'),
          ),
        );

      return {
        ...mapCampaignRow(campaign),
        enrollmentCount: Number(enrollmentCount?.count ?? 0),
        completedCount: Number(completedCount?.count ?? 0),
      };
    }),
  );

  return {
    campaigns: campaignsWithCounts,
    total,
  };
};

export const getCampaignById = async (
  tenantId: string,
  campaignId: string,
  config: AppConfig = loadConfig(),
): Promise<CampaignWithRelations | null> => {
  const db = getDatabaseClient(config);

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)))
    .limit(1);

  if (!campaign) {
    return null;
  }

  const audienceResult = await db
    .select()
    .from(campaignAudience)
    .where(eq(campaignAudience.campaignId, campaignId))
    .limit(1);

  const contentResult = await db
    .select()
    .from(campaignContent)
    .where(eq(campaignContent.campaignId, campaignId))
    .orderBy(campaignContent.orderIndex);

  const escalationsResult = await db
    .select()
    .from(campaignEscalations)
    .where(eq(campaignEscalations.campaignId, campaignId))
    .limit(1);

  const [enrollmentCount] = await db
    .select({ count: sqlFn`count(*)` })
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, campaignId));

  const [completedCount] = await db
    .select({ count: sqlFn`count(*)` })
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.campaignId, campaignId),
        eq(campaignEnrollments.status, 'completed'),
      ),
    );

  const audience = audienceResult[0];
  const escalations = escalationsResult[0];

  return {
    ...mapCampaignRow(campaign),
    audience: audience
      ? {
          audienceId: audience.audienceId,
          campaignId: audience.campaignId,
          groupIds: audience.groupIds as string[],
          departments: audience.departments as string[],
          locations: audience.locations as string[],
          roles: audience.roles as string[],
          attributeFilters: audience.attributeFilters as Record<string, unknown>,
          createdAt: new Date(audience.createdAt),
          updatedAt: new Date(audience.updatedAt),
        }
      : null,
    content: contentResult.map((c) => ({
      contentId: c.contentId,
      campaignId: c.campaignId,
      contentType: c.contentType as CampaignContentType,
      contentItemId: c.contentItemId,
      orderIndex: c.orderIndex,
      dueDays: c.dueDays ?? 7,
      isPrerequisite: c.isPrerequisite,
      createdAt: new Date(c.createdAt),
    })),
    escalations: escalations
      ? {
          escalationId: escalations.escalationId,
          campaignId: escalations.campaignId,
          reminderDays: escalations.reminderDays as number[],
          managerNotification: escalations.managerNotification,
          complianceAlert: escalations.complianceAlert,
          complianceAlertThreshold: escalations.complianceAlertThreshold ?? 14,
          createdAt: new Date(escalations.createdAt),
          updatedAt: new Date(escalations.updatedAt),
        }
      : null,
    enrollmentCount: Number(enrollmentCount?.count ?? 0),
    completedCount: Number(completedCount?.count ?? 0),
  };
};

export const updateCampaign = async (
  tenantId: string,
  campaignId: string,
  input: CampaignUpdateInput,
  config: AppConfig = loadConfig(),
): Promise<Campaign | null> => {
  const db = getDatabaseClient(config);

  const [campaign] = await db
    .update(campaigns)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.campaignType !== undefined && { campaignType: input.campaignType }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.recurrencePattern !== undefined && { recurrencePattern: input.recurrencePattern }),
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)))
    .returning();

  if (!campaign) {
    return null;
  }

  return mapCampaignRow(campaign);
};

export const updateCampaignStatus = async (
  tenantId: string,
  campaignId: string,
  status: CampaignStatus,
  config: AppConfig = loadConfig(),
): Promise<Campaign | null> => {
  const db = getDatabaseClient(config);

  const [campaign] = await db
    .update(campaigns)
    .set({
      status: status,
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)))
    .returning();

  if (!campaign) {
    return null;
  }

  return mapCampaignRow(campaign);
};

export const deleteCampaign = async (
  tenantId: string,
  campaignId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  await db
    .delete(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)));

  return true;
};

export const setCampaignAudience = async (
  _tenantId: string,
  campaignId: string,
  input: CampaignAudienceInput,
  config: AppConfig = loadConfig(),
): Promise<CampaignAudience> => {
  const db = getDatabaseClient(config);

  const existingResult = await db
    .select()
    .from(campaignAudience)
    .where(eq(campaignAudience.campaignId, campaignId))
    .limit(1);

  const existing = existingResult[0];

  if (existing) {
    const [audience] = await db
      .update(campaignAudience)
      .set({
        groupIds: input.groupIds ?? [],
        departments: input.departments ?? [],
        locations: input.locations ?? [],
        roles: input.roles ?? [],
        attributeFilters: input.attributeFilters ?? {},
        updatedAt: new Date(),
      })
      .where(eq(campaignAudience.audienceId, existing.audienceId))
      .returning();

    if (!audience) {
      throw new Error('Failed to update campaign audience');
    }

    return {
      audienceId: audience.audienceId,
      campaignId: audience.campaignId,
      groupIds: audience.groupIds as string[],
      departments: audience.departments as string[],
      locations: audience.locations as string[],
      roles: audience.roles as string[],
      attributeFilters: audience.attributeFilters as Record<string, unknown>,
      createdAt: new Date(audience.createdAt),
      updatedAt: new Date(audience.updatedAt),
    };
  }

  const [audience] = await db
    .insert(campaignAudience)
    .values({
      audienceId: randomUUID(),
      campaignId,
      groupIds: input.groupIds ?? [],
      departments: input.departments ?? [],
      locations: input.locations ?? [],
      roles: input.roles ?? [],
      attributeFilters: input.attributeFilters ?? {},
    })
    .returning();

  if (!audience) {
    throw new Error('Failed to create campaign audience');
  }

  return {
    audienceId: audience.audienceId,
    campaignId: audience.campaignId,
    groupIds: audience.groupIds as string[],
    departments: audience.departments as string[],
    locations: audience.locations as string[],
    roles: audience.roles as string[],
    attributeFilters: audience.attributeFilters as Record<string, unknown>,
    createdAt: new Date(audience.createdAt),
    updatedAt: new Date(audience.updatedAt),
  };
};

export const addCampaignContent = async (
  _tenantId: string,
  campaignId: string,
  input: CampaignContentInput,
  config: AppConfig = loadConfig(),
): Promise<CampaignContent> => {
  const db = getDatabaseClient(config);

  const [existingContent] = await db
    .select()
    .from(campaignContent)
    .where(
      and(
        eq(campaignContent.campaignId, campaignId),
        eq(campaignContent.contentItemId, input.contentItemId),
      ),
    )
    .limit(1);

  if (existingContent) {
    const [content] = await db
      .update(campaignContent)
      .set({
        contentType: input.contentType,
        orderIndex: input.orderIndex ?? existingContent.orderIndex,
        dueDays: input.dueDays ?? existingContent.dueDays,
        isPrerequisite: input.isPrerequisite ?? existingContent.isPrerequisite,
      })
      .where(eq(campaignContent.contentId, existingContent.contentId))
      .returning();

    if (!content) {
      throw new Error('Failed to update campaign content');
    }

    return {
      contentId: content.contentId,
      campaignId: content.campaignId,
      contentType: content.contentType as CampaignContentType,
      contentItemId: content.contentItemId,
      orderIndex: content.orderIndex ?? 0,
      dueDays: content.dueDays ?? 7,
      isPrerequisite: content.isPrerequisite,
      createdAt: new Date(content.createdAt),
    };
  }

  const maxOrderResult = await db
    .select({ maxOrder: sqlFn`max(${campaignContent.orderIndex})` })
    .from(campaignContent)
    .where(eq(campaignContent.campaignId, campaignId));

  const maxOrderValue = maxOrderResult[0]?.maxOrder;
  const nextOrder =
    (maxOrderValue !== null && maxOrderValue !== undefined ? Number(maxOrderValue) : -1) + 1;

  const [content] = await db
    .insert(campaignContent)
    .values({
      contentId: randomUUID(),
      campaignId,
      contentType: input.contentType,
      contentItemId: input.contentItemId,
      orderIndex: input.orderIndex ?? nextOrder,
      dueDays: input.dueDays ?? 7,
      isPrerequisite: input.isPrerequisite ?? false,
    })
    .returning();

  if (!content) {
    throw new Error('Failed to add campaign content');
  }

  return {
    contentId: content.contentId,
    campaignId: content.campaignId,
    contentType: content.contentType as CampaignContentType,
    contentItemId: content.contentItemId,
    orderIndex: content.orderIndex ?? 0,
    dueDays: content.dueDays ?? 7,
    isPrerequisite: content.isPrerequisite,
    createdAt: new Date(content.createdAt),
  };
};

export const removeCampaignContent = async (
  _tenantId: string,
  campaignId: string,
  contentId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  await db
    .delete(campaignContent)
    .where(
      and(eq(campaignContent.campaignId, campaignId), eq(campaignContent.contentId, contentId)),
    );

  return true;
};

export const setCampaignEscalations = async (
  _tenantId: string,
  campaignId: string,
  input: CampaignEscalationInput,
  config: AppConfig = loadConfig(),
): Promise<CampaignEscalation> => {
  const db = getDatabaseClient(config);

  const existingResult = await db
    .select()
    .from(campaignEscalations)
    .where(eq(campaignEscalations.campaignId, campaignId))
    .limit(1);

  const existing = existingResult[0];

  if (existing) {
    const [escalation] = await db
      .update(campaignEscalations)
      .set({
        ...(input.reminderDays !== undefined && { reminderDays: input.reminderDays }),
        ...(input.managerNotification !== undefined && {
          managerNotification: input.managerNotification,
        }),
        ...(input.complianceAlert !== undefined && { complianceAlert: input.complianceAlert }),
        ...(input.complianceAlertThreshold !== undefined && {
          complianceAlertThreshold: input.complianceAlertThreshold,
        }),
        updatedAt: new Date(),
      })
      .where(eq(campaignEscalations.escalationId, existing.escalationId))
      .returning();

    if (!escalation) {
      throw new Error('Failed to update campaign escalations');
    }

    return {
      escalationId: escalation.escalationId,
      campaignId: escalation.campaignId,
      reminderDays: escalation.reminderDays as number[],
      managerNotification: escalation.managerNotification,
      complianceAlert: escalation.complianceAlert,
      complianceAlertThreshold: escalation.complianceAlertThreshold ?? 14,
      createdAt: new Date(escalation.createdAt),
      updatedAt: new Date(escalation.updatedAt),
    };
  }

  const [escalation] = await db
    .insert(campaignEscalations)
    .values({
      escalationId: randomUUID(),
      campaignId,
      reminderDays: input.reminderDays ?? [1, 3, 7],
      managerNotification: input.managerNotification ?? true,
      complianceAlert: input.complianceAlert ?? false,
      complianceAlertThreshold: input.complianceAlertThreshold ?? 14,
    })
    .returning();

  if (!escalation) {
    throw new Error('Failed to create campaign escalations');
  }

  return {
    escalationId: escalation.escalationId,
    campaignId: escalation.campaignId,
    reminderDays: escalation.reminderDays as number[],
    managerNotification: escalation.managerNotification,
    complianceAlert: escalation.complianceAlert,
    complianceAlertThreshold: escalation.complianceAlertThreshold ?? 14,
    createdAt: new Date(escalation.createdAt),
    updatedAt: new Date(escalation.updatedAt),
  };
};

export const getCampaignProgress = async (
  tenantId: string,
  campaignId: string,
  config: AppConfig = loadConfig(),
): Promise<CampaignProgressMetrics | null> => {
  const db = getDatabaseClient(config);

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)))
    .limit(1);

  if (!campaign) {
    return null;
  }

  const enrollmentsResult = await db
    .select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, campaignId));

  const enrollments = enrollmentsResult;
  const totalEnrolled = enrollments.length;
  const notStarted = enrollments.filter((e) => e.status === 'not_started').length;
  const inProgress = enrollments.filter((e) => e.status === 'in_progress').length;
  const completed = enrollments.filter((e) => e.status === 'completed').length;
  const completionRate = totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0;

  const completedEnrollments = enrollments.filter((e) => e.completedAt && e.enrolledAt);
  const averageTimeToComplete =
    completedEnrollments.length > 0
      ? completedEnrollments.reduce((acc: number, e) => {
          const diff =
            e.completedAt && e.enrolledAt
              ? new Date(e.completedAt).getTime() - new Date(e.enrolledAt).getTime()
              : 0;
          return acc + diff;
        }, 0) /
        completedEnrollments.length /
        (1000 * 60 * 60 * 24)
      : null;

  const userIds = enrollments.map((e) => e.userId);
  const usersWithDept =
    userIds.length > 0
      ? await db
          .select({ userId: users.userId, department: users.department, role: users.role })
          .from(users)
          .where(inArray(users.userId, userIds))
      : [];

  const userMap = new Map(usersWithDept.map((u) => [u.userId, u]));

  const deptMap = new Map<string, { total: number; completed: number }>();
  const roleMap = new Map<string, { total: number; completed: number }>();

  for (const enrollment of enrollments) {
    const user = userMap.get(enrollment.userId);
    const dept = user?.department ?? 'Unknown';
    const role = user?.role ?? 'Unknown';

    const deptStats = deptMap.get(dept) ?? { total: 0, completed: 0 };
    deptStats.total++;
    if (enrollment.status === 'completed') deptStats.completed++;
    deptMap.set(dept, deptStats);

    const roleStats = roleMap.get(role) ?? { total: 0, completed: 0 };
    roleStats.total++;
    if (enrollment.status === 'completed') roleStats.completed++;
    roleMap.set(role, roleStats);
  }

  const byDepartment = Array.from(deptMap.entries()).map(([department, stats]) => ({
    department,
    total: stats.total,
    completed: stats.completed,
    rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
  }));

  const byRole = Array.from(roleMap.entries()).map(([role, stats]) => ({
    role,
    total: stats.total,
    completed: stats.completed,
    rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
  }));

  return {
    totalEnrolled,
    notStarted,
    inProgress,
    completed,
    completionRate,
    averageTimeToComplete,
    byDepartment,
    byRole,
  };
};

export const enrollUsersInCampaign = async (
  tenantId: string,
  campaignId: string,
  userIds: string[],
  config: AppConfig = loadConfig(),
): Promise<CampaignEnrollment[]> => {
  const db = getDatabaseClient(config);

  const campaign = await getCampaignById(tenantId, campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const existingEnrollmentsResult = await db
    .select()
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.campaignId, campaignId),
        inArray(campaignEnrollments.userId, userIds),
      ),
    );

  const existingEnrollments = existingEnrollmentsResult;
  const existingUserIds = new Set(existingEnrollments.map((e) => e.userId));
  const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

  const defaultDueDate = campaign.startDate
    ? new Date(campaign.startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const enrollmentsToCreate = newUserIds.map((userId) => ({
    enrollmentId: randomUUID(),
    campaignId,
    userId,
    status: 'not_started' as const,
    enrolledAt: new Date(),
    dueDate: defaultDueDate,
    reminderCount: 0,
  }));

  if (enrollmentsToCreate.length > 0) {
    await db.insert(campaignEnrollments).values(enrollmentsToCreate);
  }

  const allEnrollmentsResult = await db
    .select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, campaignId));

  const allEnrollments = allEnrollmentsResult;
  return allEnrollments.map(
    (e): CampaignEnrollment => ({
      enrollmentId: e.enrollmentId,
      campaignId: e.campaignId,
      userId: e.userId,
      status: e.status as EnrollmentStatus,
      enrolledAt: new Date(e.enrolledAt),
      completedAt: e.completedAt ? new Date(e.completedAt) : null,
      dueDate: e.dueDate ? new Date(e.dueDate) : null,
      lastReminderAt: e.lastReminderAt ? new Date(e.lastReminderAt) : null,
      reminderCount: e.reminderCount,
      createdAt: new Date(e.createdAt),
      updatedAt: new Date(e.updatedAt),
    }),
  );
};

export const getEligibleUsersForCampaign = async (
  tenantId: string,
  campaignId: string,
  config: AppConfig = loadConfig(),
): Promise<string[]> => {
  const db = getDatabaseClient(config);

  const audienceResult = await db
    .select()
    .from(campaignAudience)
    .where(eq(campaignAudience.campaignId, campaignId))
    .limit(1);

  const audience = audienceResult[0];

  if (!audience) {
    return [];
  }

  const conditions: (SQL | undefined)[] = [eq(users.tenantId, tenantId), eq(users.isActive, true)];

  const userList = await db
    .select({
      userId: users.userId,
      department: users.department,
      role: users.role,
      title: users.title,
    })
    .from(users)
    .where(and(...conditions));

  const eligibleUserIds: string[] = [];

  for (const user of userList) {
    let isEligible = true;

    const userDepartment = user.department ?? '';
    const userRole = user.role ?? '';

    const deptArray = audience.departments as string[];
    const roleArray = audience.roles as string[];

    if (deptArray && deptArray.length > 0) {
      isEligible = isEligible && deptArray.includes(userDepartment);
    }

    if (roleArray && roleArray.length > 0) {
      isEligible = isEligible && roleArray.includes(userRole);
    }

    if (audience.attributeFilters && Object.keys(audience.attributeFilters).length > 0) {
      const filters = audience.attributeFilters;
      for (const [key, value] of Object.entries(filters)) {
        if ((user as Record<string, unknown>)[key] !== value) {
          isEligible = false;
          break;
        }
      }
    }

    if (isEligible) {
      eligibleUserIds.push(user.userId);
    }
  }

  return eligibleUserIds;
};

export const checkInterventionThrottling = async (
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [result] = await db
    .select({ count: sqlFn`count(*)` })
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.userId, userId),
        sqlFn`${campaignEnrollments.enrolledAt} >= ${oneWeekAgo}`,
      ),
    );

  const count = Number(result?.count ?? 0);
  return count < MAX_INTERVENTIONS_PER_WEEK;
};

export const saveCampaignAsTemplate = async (
  tenantId: string,
  campaignId: string,
  name: string,
  description?: string,
  config: AppConfig = loadConfig(),
): Promise<CampaignTemplate> => {
  const db = getDatabaseClient(config);

  const campaign = await getCampaignById(tenantId, campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const [template] = await db
    .insert(campaignTemplates)
    .values({
      templateId: randomUUID(),
      tenantId,
      name,
      description: description ?? null,
      campaignType: campaign.campaignType,
      audienceConfig: campaign.audience
        ? {
            groupIds: campaign.audience.groupIds,
            departments: campaign.audience.departments,
            locations: campaign.audience.locations,
            roles: campaign.audience.roles,
            attributeFilters: campaign.audience.attributeFilters,
          }
        : {},
      contentConfig:
        campaign.content?.map((c) => ({
          contentType: c.contentType,
          contentItemId: c.contentItemId,
          orderIndex: c.orderIndex,
          dueDays: c.dueDays,
          isPrerequisite: c.isPrerequisite,
        })) ?? [],
      scheduleConfig: {
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        timezone: campaign.timezone,
        recurrencePattern: campaign.recurrencePattern,
      },
    })
    .returning();

  if (!template) {
    throw new Error('Failed to save campaign template');
  }

  return {
    templateId: template.templateId,
    tenantId: template.tenantId,
    name: template.name,
    description: template.description,
    campaignType: template.campaignType as CampaignType,
    audienceConfig: template.audienceConfig as Record<string, unknown>,
    contentConfig: template.contentConfig as Record<string, unknown>,
    scheduleConfig: template.scheduleConfig as Record<string, unknown>,
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt),
  };
};

export const listCampaignTemplates = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<CampaignTemplate[]> => {
  const db = getDatabaseClient(config);

  const templatesResult = await db
    .select()
    .from(campaignTemplates)
    .where(eq(campaignTemplates.tenantId, tenantId))
    .orderBy(desc(campaignTemplates.createdAt));

  return templatesResult.map((t) => ({
    templateId: t.templateId,
    tenantId: t.tenantId,
    name: t.name,
    description: t.description,
    campaignType: t.campaignType as CampaignType,
    audienceConfig: t.audienceConfig as Record<string, unknown>,
    contentConfig: t.contentConfig as Record<string, unknown>,
    scheduleConfig: t.scheduleConfig as Record<string, unknown>,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
  }));
};

export const createCampaignFromTemplate = async (
  tenantId: string,
  templateId: string,
  name: string,
  createdBy: string,
  config: AppConfig = loadConfig(),
): Promise<Campaign> => {
  const db = getDatabaseClient(config);

  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(
      and(eq(campaignTemplates.tenantId, tenantId), eq(campaignTemplates.templateId, templateId)),
    )
    .limit(1);

  if (!template) {
    throw new Error('Template not found');
  }

  const scheduleConfig = template.scheduleConfig as Record<string, unknown>;

  const campaignInput: CampaignInput = {
    name,
    campaignType: template.campaignType as CampaignType,
    createdBy,
  };

  if (scheduleConfig?.['startDate']) {
    campaignInput.startDate = scheduleConfig['startDate'] as Date;
  }
  if (scheduleConfig?.['endDate']) {
    campaignInput.endDate = scheduleConfig['endDate'] as Date;
  }
  if (scheduleConfig?.['timezone']) {
    campaignInput.timezone = scheduleConfig['timezone'] as string;
  }
  if (scheduleConfig?.['recurrencePattern']) {
    campaignInput.recurrencePattern = scheduleConfig['recurrencePattern'] as RecurrencePattern;
  }

  const campaign = await createCampaign(tenantId, campaignInput, config);

  if (template.audienceConfig && Object.keys(template.audienceConfig).length > 0) {
    await setCampaignAudience(
      tenantId,
      campaign.campaignId,
      template.audienceConfig as CampaignAudienceInput,
      config,
    );
  }

  if (template.contentConfig && Array.isArray(template.contentConfig)) {
    for (const contentItem of template.contentConfig as CampaignContentInput[]) {
      await addCampaignContent(tenantId, campaign.campaignId, contentItem, config);
    }
  }

  return campaign;
};

export const deleteCampaignTemplate = async (
  tenantId: string,
  templateId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  await db
    .delete(campaignTemplates)
    .where(
      and(eq(campaignTemplates.tenantId, tenantId), eq(campaignTemplates.templateId, templateId)),
    );

  return true;
};

export const updateEnrollmentStatus = async (
  tenantId: string,
  enrollmentId: string,
  status: EnrollmentStatus,
  config: AppConfig = loadConfig(),
): Promise<CampaignEnrollment | null> => {
  const db = getDatabaseClient(config);

  const [enrollment] = await db
    .select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.enrollmentId, enrollmentId))
    .limit(1);

  if (!enrollment) {
    return null;
  }

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, enrollment.campaignId)))
    .limit(1);

  if (!campaign) {
    return null;
  }

  const updateData: {
    status: EnrollmentStatus;
    updatedAt: Date;
    completedAt?: Date;
  } = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'completed') {
    updateData.completedAt = new Date();
  }

  const [updated] = await db
    .update(campaignEnrollments)
    .set(updateData)
    .where(eq(campaignEnrollments.enrollmentId, enrollmentId))
    .returning();

  if (!updated) {
    return null;
  }

  return {
    enrollmentId: updated.enrollmentId,
    campaignId: updated.campaignId,
    userId: updated.userId,
    status: updated.status as EnrollmentStatus,
    enrolledAt: new Date(updated.enrolledAt),
    completedAt: updated.completedAt ? new Date(updated.completedAt) : null,
    dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
    lastReminderAt: updated.lastReminderAt ? new Date(updated.lastReminderAt) : null,
    reminderCount: updated.reminderCount,
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt),
  };
};
