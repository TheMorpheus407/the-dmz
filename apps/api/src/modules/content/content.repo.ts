import { and, eq, isNull, isNotNull, or, gte, lte } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import {
  emailTemplates,
  scenarios,
  scenarioBeats,
  documentTemplates,
  localizedContent,
  seasons,
  chapters,
  morpheusMessages,
  type EmailTemplate,
  type Scenario,
  type ScenarioBeat,
  type DocumentTemplate,
  type LocalizedContent,
  type Season,
  type Chapter,
  type MorpheusMessage,
} from '../../db/schema/content/index.js';

export type {
  EmailTemplate,
  Scenario,
  ScenarioBeat,
  DocumentTemplate,
  LocalizedContent,
  Season,
  Chapter,
  MorpheusMessage,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  if (!created) {
    throw new Error('Failed to create email template');
  }
  return created;
};

export const findScenarios = async (
  db: DB,
  tenantId: string,
  filters?: {
    difficulty?: number;
    faction?: string;
    season?: number;
    isActive?: boolean;
  },
): Promise<Scenario[]> => {
  const conditions = [eq(scenarios.tenantId, tenantId)];

  if (filters?.difficulty) {
    conditions.push(eq(scenarios.difficulty, filters.difficulty));
  }
  if (filters?.faction) {
    conditions.push(eq(scenarios.faction, filters.faction));
  }
  if (filters?.season) {
    conditions.push(eq(scenarios.season, filters.season));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(scenarios.isActive, filters.isActive));
  }

  return db
    .select()
    .from(scenarios)
    .where(and(...conditions));
};

export const findScenarioById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<Scenario | undefined> => {
  const results = await db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.id, id), eq(scenarios.tenantId, tenantId)));

  return results[0];
};

export const findScenarioWithBeats = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<{ scenario: Scenario; beats: ScenarioBeat[] } | undefined> => {
  const scenario = await findScenarioById(db, tenantId, id);
  if (!scenario) return undefined;

  const beatResults = await db
    .select()
    .from(scenarioBeats)
    .where(and(eq(scenarioBeats.scenarioId, id), eq(scenarioBeats.tenantId, tenantId)))
    .orderBy(scenarioBeats.beatIndex);

  return { scenario, beats: beatResults };
};

export const createScenario = async (
  db: DB,
  data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Scenario> => {
  const [created] = await db.insert(scenarios).values(data).returning();
  if (!created) {
    throw new Error('Failed to create scenario');
  }
  return created;
};

export const findDocumentTemplates = async (
  db: DB,
  tenantId: string,
  filters?: {
    documentType?: string;
    faction?: string;
    locale?: string;
    isActive?: boolean;
  },
): Promise<DocumentTemplate[]> => {
  const conditions = [eq(documentTemplates.tenantId, tenantId)];

  if (filters?.documentType) {
    conditions.push(eq(documentTemplates.documentType, filters.documentType));
  }
  if (filters?.faction) {
    conditions.push(eq(documentTemplates.faction, filters.faction));
  }
  if (filters?.locale) {
    conditions.push(eq(documentTemplates.locale, filters.locale));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(documentTemplates.isActive, filters.isActive));
  }

  return db
    .select()
    .from(documentTemplates)
    .where(and(...conditions));
};

export const findDocumentTemplateByType = async (
  db: DB,
  tenantId: string,
  documentType: string,
): Promise<DocumentTemplate[]> => {
  return db
    .select()
    .from(documentTemplates)
    .where(
      and(
        eq(documentTemplates.documentType, documentType),
        eq(documentTemplates.tenantId, tenantId),
        eq(documentTemplates.isActive, true),
      ),
    );
};

export const findDocumentTemplateById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<DocumentTemplate | undefined> => {
  const results = await db
    .select()
    .from(documentTemplates)
    .where(and(eq(documentTemplates.id, id), eq(documentTemplates.tenantId, tenantId)));

  return results[0];
};

export const createDocumentTemplate = async (
  db: DB,
  data: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<DocumentTemplate> => {
  const [created] = await db.insert(documentTemplates).values(data).returning();
  if (!created) {
    throw new Error('Failed to create document template');
  }
  return created;
};

export const findLocalizedContent = async (
  db: DB,
  tenantId: string,
  contentKey: string,
  locale?: string,
): Promise<LocalizedContent | undefined> => {
  const conditions = [
    eq(localizedContent.contentKey, contentKey),
    eq(localizedContent.tenantId, tenantId),
    eq(localizedContent.isActive, true),
  ];

  if (locale) {
    conditions.push(eq(localizedContent.locale, locale));
  }

  const results = await db
    .select()
    .from(localizedContent)
    .where(and(...conditions));

  return results[0];
};

export const createLocalizedContent = async (
  db: DB,
  data: Omit<LocalizedContent, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<LocalizedContent> => {
  const [created] = await db.insert(localizedContent).values(data).returning();
  if (!created) {
    throw new Error('Failed to create localized content');
  }
  return created;
};

export const findSeasons = async (
  db: DB,
  tenantId: string,
  filters?: {
    seasonNumber?: number;
    isActive?: boolean;
  },
): Promise<Season[]> => {
  const conditions = [eq(seasons.tenantId, tenantId)];

  if (filters?.seasonNumber !== undefined) {
    conditions.push(eq(seasons.seasonNumber, filters.seasonNumber));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(seasons.isActive, filters.isActive));
  }

  return db
    .select()
    .from(seasons)
    .where(and(...conditions))
    .orderBy(seasons.seasonNumber);
};

export const findSeasonById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<Season | undefined> => {
  const results = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, id), eq(seasons.tenantId, tenantId)));

  return results[0];
};

export const createSeason = async (
  db: DB,
  data: Omit<Season, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Season> => {
  const [created] = await db.insert(seasons).values(data).returning();
  if (!created) {
    throw new Error('Failed to create season');
  }
  return created;
};

export const findChaptersBySeason = async (
  db: DB,
  tenantId: string,
  seasonId: string,
  filters?: {
    act?: number;
    isActive?: boolean;
  },
): Promise<Chapter[]> => {
  const conditions = [eq(chapters.tenantId, tenantId), eq(chapters.seasonId, seasonId)];

  if (filters?.act !== undefined) {
    conditions.push(eq(chapters.act, filters.act));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(chapters.isActive, filters.isActive));
  }

  return db
    .select()
    .from(chapters)
    .where(and(...conditions))
    .orderBy(chapters.chapterNumber);
};

export const findChapterById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<Chapter | undefined> => {
  const results = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.id, id), eq(chapters.tenantId, tenantId)));

  return results[0];
};

export const createChapter = async (
  db: DB,
  data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Chapter> => {
  const [created] = await db.insert(chapters).values(data).returning();
  if (!created) {
    throw new Error('Failed to create chapter');
  }
  return created;
};

export const findMorpheusMessagesByTrigger = async (
  db: DB,
  tenantId: string,
  triggerType: string,
  filters?: {
    day?: number;
    factionKey?: string;
  },
): Promise<MorpheusMessage[]> => {
  const conditions = [
    eq(morpheusMessages.tenantId, tenantId),
    eq(morpheusMessages.triggerType, triggerType),
    eq(morpheusMessages.isActive, true),
  ];

  if (filters?.day !== undefined) {
    const day = filters.day;
    const dayCondition = or(
      and(isNull(morpheusMessages.minDay), isNull(morpheusMessages.maxDay)),
      and(
        isNotNull(morpheusMessages.minDay),
        isNull(morpheusMessages.maxDay),
        lte(morpheusMessages.minDay, day),
      ),
      and(
        isNull(morpheusMessages.minDay),
        isNotNull(morpheusMessages.maxDay),
        gte(morpheusMessages.maxDay, day),
      ),
      and(
        isNotNull(morpheusMessages.minDay),
        isNotNull(morpheusMessages.maxDay),
        lte(morpheusMessages.minDay, day),
        gte(morpheusMessages.maxDay, day),
      ),
    );
    if (dayCondition) {
      conditions.push(dayCondition);
    }
  }

  if (filters?.factionKey) {
    const factionCondition = or(
      eq(morpheusMessages.factionKey, filters.factionKey),
      isNull(morpheusMessages.factionKey),
    );
    if (factionCondition) {
      conditions.push(factionCondition);
    }
  }

  return db
    .select()
    .from(morpheusMessages)
    .where(and(...conditions));
};

export const findMorpheusMessageByKey = async (
  db: DB,
  tenantId: string,
  messageKey: string,
): Promise<MorpheusMessage | undefined> => {
  const results = await db
    .select()
    .from(morpheusMessages)
    .where(
      and(
        eq(morpheusMessages.tenantId, tenantId),
        eq(morpheusMessages.messageKey, messageKey),
        eq(morpheusMessages.isActive, true),
      ),
    );

  return results[0];
};
