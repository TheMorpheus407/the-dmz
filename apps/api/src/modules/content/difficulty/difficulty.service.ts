import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findDifficultyHistoryByTier,
  findEmailFeaturesById,
  findClassificationStats,
  createDifficultyHistory,
  createEmailFeature,
  type DifficultyHistory,
  type EmailFeature,
} from './difficulty.repo.js';

import type { AppConfig } from '../../../config.js';

export type { DifficultyHistory, EmailFeature };

export const getDifficultyHistoryByTier = async (
  config: AppConfig,
  tenantId: string,
  tier: number,
  filters?: {
    classificationMethod?: 'haiku' | 'rule-based' | 'manual';
    limit?: number;
  },
): Promise<DifficultyHistory[]> => {
  const db = getDatabaseClient(config);
  return findDifficultyHistoryByTier(db, tenantId, tier, filters);
};

export const getEmailFeaturesById = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<EmailFeature | undefined> => {
  const db = getDatabaseClient(config);
  return findEmailFeaturesById(db, tenantId, id);
};

export const getClassificationStats = async (
  config: AppConfig,
  tenantId: string,
): Promise<{
  total: number;
  byDifficulty: Record<number, number>;
  byMethod: Record<string, number>;
  averageConfidence: number;
}> => {
  const db = getDatabaseClient(config);
  return findClassificationStats(db, tenantId);
};

export const saveDifficultyHistory = async (
  config: AppConfig,
  tenantId: string,
  data:
    | {
        emailTemplateId: string;
        requestedDifficulty: number;
        classifiedDifficulty: number;
        classificationMethod: string;
        confidence: number;
        metadata?: Record<string, unknown>;
      }
    | {
        emailTemplateId: string;
        requestedDifficulty?: undefined;
        classifiedDifficulty: number;
        classificationMethod: string;
        confidence: number;
        metadata?: Record<string, unknown>;
      },
): Promise<DifficultyHistory> => {
  const db = getDatabaseClient(config);
  return createDifficultyHistory(db, {
    tenantId,
    emailTemplateId: data.emailTemplateId ?? null,
    requestedDifficulty: data.requestedDifficulty ?? null,
    classifiedDifficulty: data.classifiedDifficulty,
    classificationMethod: data.classificationMethod,
    confidence: String(data.confidence),
    metadata: data.metadata ?? {},
  });
};

export const saveEmailFeatures = async (
  config: AppConfig,
  tenantId: string,
  data: {
    emailTemplateId?: string;
    indicatorCount?: number;
    wordCount?: number;
    hasSpoofedHeaders?: boolean;
    impersonationQuality?: number;
    hasVerificationHooks?: boolean;
    emotionalManipulationLevel?: number;
    grammarComplexity?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<EmailFeature> => {
  const db = getDatabaseClient(config);
  return createEmailFeature(db, {
    tenantId,
    emailTemplateId: data.emailTemplateId ?? null,
    indicatorCount: data.indicatorCount ?? null,
    wordCount: data.wordCount ?? null,
    hasSpoofedHeaders: data.hasSpoofedHeaders ?? null,
    impersonationQuality:
      data.impersonationQuality != null ? String(data.impersonationQuality) : null,
    hasVerificationHooks: data.hasVerificationHooks ?? null,
    emotionalManipulationLevel:
      data.emotionalManipulationLevel != null ? String(data.emotionalManipulationLevel) : null,
    grammarComplexity: data.grammarComplexity != null ? String(data.grammarComplexity) : null,
    metadata: data.metadata ?? {},
  });
};
