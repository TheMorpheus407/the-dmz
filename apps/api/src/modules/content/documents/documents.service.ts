import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findDocumentTemplates,
  findDocumentTemplateByType,
  findDocumentTemplateById,
  createDocumentTemplate,
  type DocumentTemplate,
} from './documents.repo.js';

import type { AppConfig } from '../../../config.js';

export type { DocumentTemplate };

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
