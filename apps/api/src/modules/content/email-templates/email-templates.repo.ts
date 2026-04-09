import { and, eq, isNull, or } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { emailTemplates, type EmailTemplate } from '../../../db/schema/content/index.js';
import { assertCreated } from '../../../shared/utils/db-utils.js';
import { isRecord } from '../../../shared/utils/type-guards.js';

export type { EmailTemplate };

const hasGeneratedContentMetadata = (metadata: unknown): boolean =>
  isRecord(metadata) && Object.hasOwn(metadata, 'generatedContent');

export const findEmailTemplates = async (
  db: DB,
  tenantId: string,
  filters?: {
    contentType?: string;
    difficulty?: number;
    faction?: string;
    attackType?: string;
    threatLevel?: string;
    season?: number;
    chapter?: number;
    isActive?: boolean;
  },
): Promise<EmailTemplate[]> => {
  const conditions = [eq(emailTemplates.tenantId, tenantId)];

  if (filters?.contentType) {
    conditions.push(eq(emailTemplates.contentType, filters.contentType));
  }
  if (filters?.difficulty) {
    conditions.push(eq(emailTemplates.difficulty, filters.difficulty));
  }
  if (filters?.faction) {
    conditions.push(eq(emailTemplates.faction, filters.faction));
  }
  if (filters?.attackType) {
    conditions.push(eq(emailTemplates.attackType, filters.attackType));
  }
  if (filters?.threatLevel) {
    conditions.push(eq(emailTemplates.threatLevel, filters.threatLevel));
  }
  if (filters?.season !== undefined) {
    conditions.push(eq(emailTemplates.season, filters.season));
  }
  if (filters?.chapter !== undefined) {
    conditions.push(eq(emailTemplates.chapter, filters.chapter));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(emailTemplates.isActive, filters.isActive));
  }

  return db
    .select()
    .from(emailTemplates)
    .where(and(...conditions))
    .orderBy(emailTemplates.createdAt);
};

export const findFallbackEmailTemplates = async (
  db: DB,
  tenantId: string,
  filters?: {
    contentType?: string;
    difficulty?: number;
    faction?: string;
    attackType?: string;
    threatLevel?: string;
    season?: number;
    chapter?: number;
    isActive?: boolean;
  },
): Promise<EmailTemplate[]> => {
  const conditions = [
    eq(emailTemplates.tenantId, tenantId),
    eq(emailTemplates.isAiGenerated, false),
  ];

  if (filters?.contentType) {
    conditions.push(eq(emailTemplates.contentType, filters.contentType));
  }
  if (filters?.difficulty !== undefined) {
    const difficultyCondition = or(
      eq(emailTemplates.difficulty, filters.difficulty),
      isNull(emailTemplates.difficulty),
    );
    if (difficultyCondition) {
      conditions.push(difficultyCondition);
    }
  }
  if (filters?.faction) {
    const factionCondition = or(
      eq(emailTemplates.faction, filters.faction),
      isNull(emailTemplates.faction),
    );
    if (factionCondition) {
      conditions.push(factionCondition);
    }
  }
  if (filters?.attackType) {
    const attackTypeCondition = or(
      eq(emailTemplates.attackType, filters.attackType),
      isNull(emailTemplates.attackType),
    );
    if (attackTypeCondition) {
      conditions.push(attackTypeCondition);
    }
  }
  if (filters?.threatLevel) {
    const threatLevelCondition = or(
      eq(emailTemplates.threatLevel, filters.threatLevel),
      isNull(emailTemplates.threatLevel),
    );
    if (threatLevelCondition) {
      conditions.push(threatLevelCondition);
    }
  }
  if (filters?.season !== undefined) {
    const seasonCondition = or(
      eq(emailTemplates.season, filters.season),
      isNull(emailTemplates.season),
    );
    if (seasonCondition) {
      conditions.push(seasonCondition);
    }
  }
  if (filters?.chapter !== undefined) {
    const chapterCondition = or(
      eq(emailTemplates.chapter, filters.chapter),
      isNull(emailTemplates.chapter),
    );
    if (chapterCondition) {
      conditions.push(chapterCondition);
    }
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(emailTemplates.isActive, filters.isActive));
  }

  const templates = await db
    .select()
    .from(emailTemplates)
    .where(and(...conditions))
    .orderBy(emailTemplates.createdAt);

  return templates.filter((template) => !hasGeneratedContentMetadata(template.metadata));
};

export const findEmailTemplateById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<EmailTemplate | undefined> => {
  const results = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)));

  return results[0];
};

export const createEmailTemplate = async (
  db: DB,
  data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<EmailTemplate> => {
  const [created] = await db.insert(emailTemplates).values(data).returning();
  return assertCreated(created, 'email template');
};
