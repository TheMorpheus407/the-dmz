import { randomUUID } from 'crypto';

import { eq } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { campaignAudience } from '../../shared/database/schema/training/campaign.schema.js';

import type { CampaignAudience, CampaignAudienceInput } from './campaign.types.js';

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
