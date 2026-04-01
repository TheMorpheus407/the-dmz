import { randomUUID } from 'crypto';

import { eq } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { campaignEscalations } from '../../shared/database/schema/training/campaign.schema.js';

import type { CampaignEscalation, CampaignEscalationInput } from './campaign.types.js';

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
