import { randomUUID } from 'crypto';

import { eq, and, desc, sql as sqlFn, type SQL } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { phishingSimulationTemplates } from '../../../shared/database/schema/index.js';

import type {
  PhishingSimulationTemplate,
  PhishingSimulationTemplateInput,
  UrgencyLevel,
} from './types.js';

function mapTemplateRow(
  row: typeof phishingSimulationTemplates.$inferSelect,
): PhishingSimulationTemplate {
  return {
    templateId: row.templateId,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    category: row.category,
    difficultyTier: row.difficultyTier,
    urgencyLevel: row.urgencyLevel as UrgencyLevel,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    replyTo: row.replyTo,
    subject: row.subject,
    body: row.body,
    mergeTags: row.mergeTags as string[],
    includeAttachment: row.includeAttachment,
    attachmentName: row.attachmentName,
    indicatorHints: row.indicatorHints as string[],
    teachableMomentConfig: row.teachableMomentConfig as Record<string, unknown>,
    isActive: row.isActive,
    isBuiltIn: row.isBuiltIn,
    usageCount: row.usageCount,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const createPhishingTemplate = async (
  tenantId: string,
  input: PhishingSimulationTemplateInput,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationTemplate> => {
  const db = getDatabaseClient(config);

  const [template] = await db
    .insert(phishingSimulationTemplates)
    .values({
      templateId: randomUUID(),
      tenantId,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      difficultyTier: input.difficultyTier ?? 1,
      urgencyLevel: input.urgencyLevel ?? 'medium',
      senderName: input.senderName ?? null,
      senderEmail: input.senderEmail ?? null,
      replyTo: input.replyTo ?? null,
      subject: input.subject,
      body: input.body,
      mergeTags: input.mergeTags ?? [],
      includeAttachment: input.includeAttachment ?? false,
      attachmentName: input.attachmentName ?? null,
      indicatorHints: input.indicatorHints ?? [],
      teachableMomentConfig: input.teachableMomentConfig ?? {},
      isActive: true,
      isBuiltIn: false,
    })
    .returning();

  if (!template) {
    throw new Error('Failed to create phishing template');
  }

  return mapTemplateRow(template);
};

export const listPhishingTemplates = async (
  tenantId: string,
  options: {
    category?: string | undefined;
    isActive?: boolean | undefined;
    includeBuiltIn?: boolean | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  } = {},
  config: AppConfig = loadConfig(),
): Promise<{ templates: PhishingSimulationTemplate[]; total: number }> => {
  const db = getDatabaseClient(config);

  const conditions: (SQL | undefined)[] = [];

  if (!options.includeBuiltIn) {
    conditions.push(
      sqlFn`${phishingSimulationTemplates.tenantId} = ${tenantId} OR ${phishingSimulationTemplates.tenantId} IS NULL`,
    );
  } else {
    conditions.push(
      and(
        eq(phishingSimulationTemplates.tenantId, tenantId),
        sqlFn`${phishingSimulationTemplates.tenantId} IS NULL`,
      ),
    );
  }

  if (options.category) {
    conditions.push(eq(phishingSimulationTemplates.category, options.category));
  }

  if (options.isActive !== undefined) {
    conditions.push(eq(phishingSimulationTemplates.isActive, options.isActive));
  }

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const templateList = await db
    .select()
    .from(phishingSimulationTemplates)
    .where(and(...conditions))
    .orderBy(desc(phishingSimulationTemplates.usageCount))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sqlFn`count(*)` })
    .from(phishingSimulationTemplates)
    .where(and(...conditions));

  return {
    templates: templateList.map(mapTemplateRow),
    total: Number(countResult?.count ?? 0),
  };
};

export const getPhishingTemplateById = async (
  templateId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationTemplate | null> => {
  const db = getDatabaseClient(config);

  const [template] = await db
    .select()
    .from(phishingSimulationTemplates)
    .where(eq(phishingSimulationTemplates.templateId, templateId))
    .limit(1);

  return template ? mapTemplateRow(template) : null;
};

export const updatePhishingTemplate = async (
  tenantId: string,
  templateId: string,
  input: Partial<PhishingSimulationTemplateInput>,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationTemplate | null> => {
  const db = getDatabaseClient(config);

  const existing = await getPhishingTemplateById(templateId, config);
  if (!existing) {
    return null;
  }

  if (existing.isBuiltIn && existing.tenantId !== null) {
    throw new Error('Cannot modify built-in templates');
  }

  if (!existing.isBuiltIn && existing.tenantId !== tenantId) {
    throw new Error('Template not found');
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) updateData['name'] = input.name;
  if (input.description !== undefined) updateData['description'] = input.description;
  if (input.category !== undefined) updateData['category'] = input.category;
  if (input.difficultyTier !== undefined) updateData['difficultyTier'] = input.difficultyTier;
  if (input.urgencyLevel !== undefined) updateData['urgencyLevel'] = input.urgencyLevel;
  if (input.senderName !== undefined) updateData['senderName'] = input.senderName;
  if (input.senderEmail !== undefined) updateData['senderEmail'] = input.senderEmail;
  if (input.replyTo !== undefined) updateData['replyTo'] = input.replyTo;
  if (input.subject !== undefined) updateData['subject'] = input.subject;
  if (input.body !== undefined) updateData['body'] = input.body;
  if (input.mergeTags !== undefined) updateData['mergeTags'] = input.mergeTags;
  if (input.includeAttachment !== undefined)
    updateData['includeAttachment'] = input.includeAttachment;
  if (input.attachmentName !== undefined) updateData['attachmentName'] = input.attachmentName;
  if (input.indicatorHints !== undefined) updateData['indicatorHints'] = input.indicatorHints;
  if (input.teachableMomentConfig !== undefined)
    updateData['teachableMomentConfig'] = input.teachableMomentConfig;

  const [template] = await db
    .update(phishingSimulationTemplates)
    .set(updateData)
    .where(eq(phishingSimulationTemplates.templateId, templateId))
    .returning();

  return template ? mapTemplateRow(template) : null;
};

export const deletePhishingTemplate = async (
  tenantId: string,
  templateId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const existing = await getPhishingTemplateById(templateId, config);
  if (!existing) {
    return false;
  }

  if (existing.isBuiltIn) {
    throw new Error('Cannot delete built-in templates');
  }

  if (existing.tenantId !== tenantId) {
    throw new Error('Template not found');
  }

  await db
    .delete(phishingSimulationTemplates)
    .where(eq(phishingSimulationTemplates.templateId, templateId));

  return true;
};
