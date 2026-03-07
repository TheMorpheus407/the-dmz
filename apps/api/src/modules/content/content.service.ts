import { getDatabaseClient } from '../../shared/database/connection.js';

import {
  findEmailTemplates,
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
  type EmailTemplate,
  type Scenario,
  type ScenarioBeat,
  type DocumentTemplate,
  type LocalizedContent,
} from './content.repo.js';

import type { AppConfig } from '../../config.js';

export type { EmailTemplate, Scenario, ScenarioBeat, DocumentTemplate, LocalizedContent };

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
    threatLevel?: string;
    isActive?: boolean;
  },
): Promise<EmailTemplate[]> => {
  const db = getDatabaseClient(config);
  return findEmailTemplates(db, tenantId, filters);
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
