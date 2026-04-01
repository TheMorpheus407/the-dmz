import { randomUUID } from 'crypto';

import { eq, and, sql as sqlFn } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { campaignContent } from '../../shared/database/schema/training/campaign.schema.js';

import type {
  CampaignContent,
  CampaignContentInput,
  CampaignContentType,
} from './campaign.types.js';

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
