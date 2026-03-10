import { getDatabaseClient } from '../../shared/database/connection.js';

import {
  findEmailTemplates,
  findFallbackEmailTemplates,
  findEmailTemplateById,
  createEmailTemplate,
  findScenarios,
  findScenarioWithBeats,
  createScenario,
  findDocumentTemplates,
  findDocumentTemplateByType,
  findDocumentTemplateById,
  createDocumentTemplate,
  findLocalizedContent,
  createLocalizedContent,
  findSeasons,
  findSeasonById,
  createSeason,
  findChaptersBySeason,
  findChapterById,
  createChapter,
  findMorpheusMessagesByTrigger,
  findMorpheusMessageByKey,
  type EmailTemplate,
  type Scenario,
  type ScenarioBeat,
  type DocumentTemplate,
  type LocalizedContent,
  type Season,
  type Chapter,
  type MorpheusMessage,
} from './content.repo.js';

import type { AppConfig } from '../../config.js';

export type {
  EmailTemplate,
  Scenario,
  ScenarioBeat,
  DocumentTemplate,
  LocalizedContent,
  Season,
  Chapter,
};

export type EmailTemplateInput = {
  name: string;
  subject: string;
  body: string;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  contentType: string;
  difficulty: number;
  faction?: string | null;
  attackType?: string | null;
  threatLevel: string;
  season?: number | null;
  chapter?: number | null;
  language?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  isAiGenerated?: boolean;
  isActive?: boolean;
};

export type ScenarioInput = {
  name: string;
  description?: string | null;
  difficulty: number;
  faction?: string | null;
  season?: number | null;
  chapter?: number | null;
  language?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export type DocumentTemplateInput = {
  name: string;
  documentType: string;
  title: string;
  content: string;
  difficulty?: number | null;
  faction?: string | null;
  season?: number | null;
  chapter?: number | null;
  language?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export type LocalizedContentInput = {
  contentKey: string;
  contentType: string;
  content: string;
  language?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export const listEmailTemplates = async (
  config: AppConfig,
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
  const db = getDatabaseClient(config);
  return findEmailTemplates(db, tenantId, filters);
};

export const listFallbackEmailTemplates = async (
  config: AppConfig,
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
  const db = getDatabaseClient(config);
  return findFallbackEmailTemplates(db, tenantId, filters);
};

export const getEmailTemplate = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<EmailTemplate | undefined> => {
  const db = getDatabaseClient(config);
  return findEmailTemplateById(db, tenantId, id);
};

export const createEmailTemplateRecord = async (
  config: AppConfig,
  tenantId: string,
  data: EmailTemplateInput,
): Promise<EmailTemplate> => {
  const db = getDatabaseClient(config);
  return createEmailTemplate(db, {
    tenantId,
    name: data.name,
    subject: data.subject,
    body: data.body,
    fromName: data.fromName ?? null,
    fromEmail: data.fromEmail ?? null,
    replyTo: data.replyTo ?? null,
    contentType: data.contentType,
    difficulty: data.difficulty,
    faction: data.faction ?? null,
    attackType: data.attackType ?? null,
    threatLevel: data.threatLevel,
    season: data.season ?? null,
    chapter: data.chapter ?? null,
    language: data.language ?? 'en',
    locale: data.locale ?? 'en-US',
    metadata: data.metadata ?? {},
    isAiGenerated: data.isAiGenerated ?? false,
    isActive: data.isActive ?? true,
  });
};

export const listScenarios = async (
  config: AppConfig,
  tenantId: string,
  filters?: {
    difficulty?: number;
    faction?: string;
    season?: number;
    isActive?: boolean;
  },
): Promise<Scenario[]> => {
  const db = getDatabaseClient(config);
  return findScenarios(db, tenantId, filters);
};

export const getScenario = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<{ scenario: Scenario; beats: ScenarioBeat[] } | undefined> => {
  const db = getDatabaseClient(config);
  return findScenarioWithBeats(db, tenantId, id);
};

export const createScenarioRecord = async (
  config: AppConfig,
  tenantId: string,
  data: ScenarioInput,
): Promise<Scenario> => {
  const db = getDatabaseClient(config);
  return createScenario(db, {
    tenantId,
    name: data.name,
    description: data.description ?? null,
    difficulty: data.difficulty,
    faction: data.faction ?? null,
    season: data.season ?? null,
    chapter: data.chapter ?? null,
    language: data.language ?? 'en',
    locale: data.locale ?? 'en-US',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};

export const listDocumentTemplates = async (
  config: AppConfig,
  tenantId: string,
  filters?: {
    documentType?: string;
    faction?: string;
    locale?: string;
    isActive?: boolean;
  },
): Promise<DocumentTemplate[]> => {
  const db = getDatabaseClient(config);
  return findDocumentTemplates(db, tenantId, filters);
};

export const getDocumentTemplatesByType = async (
  config: AppConfig,
  tenantId: string,
  documentType: string,
): Promise<DocumentTemplate[]> => {
  const db = getDatabaseClient(config);
  return findDocumentTemplateByType(db, tenantId, documentType);
};

export const getDocumentTemplate = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<DocumentTemplate | undefined> => {
  const db = getDatabaseClient(config);
  return findDocumentTemplateById(db, tenantId, id);
};

export const createDocumentTemplateRecord = async (
  config: AppConfig,
  tenantId: string,
  data: DocumentTemplateInput,
): Promise<DocumentTemplate> => {
  const db = getDatabaseClient(config);
  return createDocumentTemplate(db, {
    tenantId,
    name: data.name,
    documentType: data.documentType,
    title: data.title,
    content: data.content,
    difficulty: data.difficulty ?? null,
    faction: data.faction ?? null,
    season: data.season ?? null,
    chapter: data.chapter ?? null,
    language: data.language ?? 'en',
    locale: data.locale ?? 'en-US',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};

export const getLocalizedContentRecord = async (
  config: AppConfig,
  tenantId: string,
  contentKey: string,
  locale?: string,
): Promise<LocalizedContent | undefined> => {
  const db = getDatabaseClient(config);
  return findLocalizedContent(db, tenantId, contentKey, locale);
};

export const createLocalizedContentRecord = async (
  config: AppConfig,
  tenantId: string,
  data: LocalizedContentInput,
): Promise<LocalizedContent> => {
  const db = getDatabaseClient(config);
  return createLocalizedContent(db, {
    tenantId,
    contentKey: data.contentKey,
    contentType: data.contentType,
    content: data.content,
    language: data.language ?? 'en',
    locale: data.locale ?? 'en-US',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};

export type SeasonInput = {
  seasonNumber: number;
  title: string;
  theme: string;
  logline: string;
  description?: string;
  threatCurveStart?: string;
  threatCurveEnd?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export type ChapterInput = {
  seasonId: string;
  chapterNumber: number;
  act: number;
  title: string;
  description?: string;
  dayStart: number;
  dayEnd: number;
  difficultyStart?: number;
  difficultyEnd?: number;
  threatLevel?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export const listSeasons = async (
  config: AppConfig,
  tenantId: string,
  filters?: {
    seasonNumber?: number;
    isActive?: boolean;
  },
): Promise<Season[]> => {
  const db = getDatabaseClient(config);
  return findSeasons(db, tenantId, filters);
};

export const getSeason = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<Season | undefined> => {
  const db = getDatabaseClient(config);
  return findSeasonById(db, tenantId, id);
};

export const createSeasonRecord = async (
  config: AppConfig,
  tenantId: string,
  data: SeasonInput,
): Promise<Season> => {
  const db = getDatabaseClient(config);
  return createSeason(db, {
    tenantId,
    seasonNumber: data.seasonNumber,
    title: data.title,
    theme: data.theme,
    logline: data.logline,
    description: data.description ?? null,
    threatCurveStart: data.threatCurveStart ?? 'LOW',
    threatCurveEnd: data.threatCurveEnd ?? 'HIGH',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};

export const listChaptersBySeason = async (
  config: AppConfig,
  tenantId: string,
  seasonId: string,
  filters?: {
    act?: number;
    isActive?: boolean;
  },
): Promise<Chapter[]> => {
  const db = getDatabaseClient(config);
  return findChaptersBySeason(db, tenantId, seasonId, filters);
};

export const getChapter = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<Chapter | undefined> => {
  const db = getDatabaseClient(config);
  return findChapterById(db, tenantId, id);
};

export const createChapterRecord = async (
  config: AppConfig,
  tenantId: string,
  data: ChapterInput,
): Promise<Chapter> => {
  const db = getDatabaseClient(config);
  return createChapter(db, {
    tenantId,
    seasonId: data.seasonId,
    chapterNumber: data.chapterNumber,
    act: data.act,
    title: data.title,
    description: data.description ?? null,
    dayStart: data.dayStart,
    dayEnd: data.dayEnd,
    difficultyStart: data.difficultyStart ?? 1,
    difficultyEnd: data.difficultyEnd ?? 2,
    threatLevel: data.threatLevel ?? 'LOW',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};

export const getMorpheusMessagesByTrigger = async (
  config: AppConfig,
  tenantId: string,
  triggerType: string,
  filters?: {
    day?: number;
    factionKey?: string;
  },
): Promise<MorpheusMessage[]> => {
  const db = getDatabaseClient(config);
  return findMorpheusMessagesByTrigger(db, tenantId, triggerType, filters);
};

export const getMorpheusMessageByKey = async (
  config: AppConfig,
  tenantId: string,
  messageKey: string,
): Promise<MorpheusMessage | undefined> => {
  const db = getDatabaseClient(config);
  return findMorpheusMessageByKey(db, tenantId, messageKey);
};
