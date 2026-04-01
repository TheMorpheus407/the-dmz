import { randomUUID } from 'crypto';

import { eq, and, desc } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { campaignTemplates } from '../../shared/database/schema/training/campaign.schema.js';

import { createCampaign, getCampaignById } from './campaign-crud.service.js';
import { setCampaignAudience } from './campaign-audience.service.js';
import { addCampaignContent } from './campaign-content.service.js';

import type {
  CampaignTemplate,
  CampaignType,
  CampaignInput,
  CampaignAudienceInput,
  CampaignContentInput,
  RecurrencePattern,
  Campaign,
} from './campaign.types.js';

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
