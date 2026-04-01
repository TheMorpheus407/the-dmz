import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findEmailTemplates,
  findFallbackEmailTemplates,
  findEmailTemplateById,
  createEmailTemplate,
  type EmailTemplate,
} from './email-templates.repo.js';

import type { AppConfig } from '../../../config.js';

export type { EmailTemplate };

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
