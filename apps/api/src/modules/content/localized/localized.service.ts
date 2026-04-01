import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findLocalizedContent,
  createLocalizedContent,
  type LocalizedContent,
} from './localized.repo.js';

import type { AppConfig } from '../../../config.js';

export type { LocalizedContent };

export type LocalizedContentInput = {
  contentKey: string;
  contentType: string;
  content: string;
  language?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
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
