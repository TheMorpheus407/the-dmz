import { randomUUID } from 'crypto';

import { eq, and, desc, sql as sqlFn, type SQL } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  campaigns,
  campaignAudience,
  campaignContent,
  campaignEnrollments,
  campaignEscalations,
  type Campaign as CampaignRow,
} from '../../shared/database/schema/training/campaign.schema.js';

import type {
  Campaign,
  CampaignInput,
  CampaignUpdateInput,
  CampaignStatus,
  CampaignListQuery,
  CampaignListResult,
  CampaignWithRelations,
  CampaignContentType,
} from './campaign.types.js';

export function mapCampaignRow(row: CampaignRow): Campaign {
  return {
    campaignId: row.campaignId,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    status: row.status as CampaignStatus,
    campaignType: row.campaignType as Campaign['campaignType'],
    createdBy: row.createdBy,
    startDate: row.startDate ? new Date(row.startDate) : null,
    endDate: row.endDate ? new Date(row.endDate) : null,
    timezone: row.timezone || 'UTC',
    recurrencePattern: (row.recurrencePattern || 'one-time') as Campaign['recurrencePattern'],
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
