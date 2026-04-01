import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findQualityScoreByEmailId,
  findQualityScoreById,
  createQualityScore,
  updateQualityScore,
  findQualityThresholds,
  createQualityThreshold,
  createQualityFlag,
  resolveQualityFlag,
  findQualityFlagsByScoreId,
  createQualityHistory,
  findQualityHistoryByEmailId,
  findQualityStats,
  type QualityScore,
  type QualityThreshold,
  type QualityFlag,
  type QualityHistory,
} from './quality.repo.js';

import type { AppConfig } from '../../../config.js';

export type { QualityScore, QualityThreshold, QualityFlag, QualityHistory };

export type QualityScoreInput = {
  emailTemplateId?: string;
  overallScore: number;
  narrativePlausibility: number;
  grammarClarity: number;
  attackAlignment: number;
  signalDiversity: number;
  learnability: number;
  flags?: string[];
  recommendations?: string[];
  status?: string;
  metadata?: Record<string, unknown>;
};

export const saveQualityScore = async (
  config: AppConfig,
  tenantId: string,
  data: QualityScoreInput,
): Promise<QualityScore> => {
  const db = getDatabaseClient(config);
  return createQualityScore(db, {
    tenantId,
    emailTemplateId: data.emailTemplateId ?? null,
    overallScore: String(data.overallScore),
    narrativePlausibility: String(data.narrativePlausibility),
    grammarClarity: String(data.grammarClarity),
    attackAlignment: String(data.attackAlignment),
    signalDiversity: String(data.signalDiversity),
    learnability: String(data.learnability),
    flags: data.flags ?? [],
    recommendations: data.recommendations ?? [],
    metadata: data.metadata ?? {},
    status: data.status ?? 'pending',
    scoredAt: new Date(),
  });
};

export const getQualityScoreByEmailId = async (
  config: AppConfig,
  tenantId: string,
  emailTemplateId: string,
): Promise<QualityScore | undefined> => {
  const db = getDatabaseClient(config);
  return findQualityScoreByEmailId(db, tenantId, emailTemplateId);
};

export const getQualityScoreById = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<QualityScore | undefined> => {
  const db = getDatabaseClient(config);
  return findQualityScoreById(db, tenantId, id);
};

export const updateQualityScoreRecord = async (
  config: AppConfig,
  tenantId: string,
  id: string,
  data: Partial<Omit<QualityScore, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<QualityScore | undefined> => {
  const db = getDatabaseClient(config);
  return updateQualityScore(db, tenantId, id, data);
};

export const listQualityThresholds = async (
  config: AppConfig,
  tenantId: string,
  filters?: {
    isActive?: boolean;
    status?: string;
  },
): Promise<QualityThreshold[]> => {
  const db = getDatabaseClient(config);
  return findQualityThresholds(db, tenantId, filters);
};

export type QualityThresholdInput = {
  name: string;
  minScore: number;
  maxScore: number;
  status: string;
  action: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export const createQualityThresholdRecord = async (
  config: AppConfig,
  tenantId: string,
  data: QualityThresholdInput,
): Promise<QualityThreshold> => {
  const db = getDatabaseClient(config);
  return createQualityThreshold(db, {
    tenantId,
    name: data.name,
    minScore: String(data.minScore),
    maxScore: String(data.maxScore),
    status: data.status,
    action: data.action,
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};

export const saveQualityFlag = async (
  config: AppConfig,
  tenantId: string,
  data: {
    qualityScoreId: string;
    flagType: string;
    severity?: string;
    description: string;
    location?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<QualityFlag> => {
  const db = getDatabaseClient(config);
  return createQualityFlag(db, {
    tenantId,
    qualityScoreId: data.qualityScoreId,
    flagType: data.flagType,
    severity: data.severity ?? 'minor',
    description: data.description,
    location: data.location ?? null,
    metadata: data.metadata ?? {},
    isResolved: false,
    resolvedAt: null,
  });
};

export const resolveQualityFlagRecord = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<QualityFlag | undefined> => {
  const db = getDatabaseClient(config);
  return resolveQualityFlag(db, tenantId, id);
};

export const getQualityFlagsByScoreId = async (
  config: AppConfig,
  tenantId: string,
  qualityScoreId: string,
): Promise<QualityFlag[]> => {
  const db = getDatabaseClient(config);
  return findQualityFlagsByScoreId(db, tenantId, qualityScoreId);
};

export const saveQualityHistory = async (
  config: AppConfig,
  tenantId: string,
  data: {
    emailTemplateId?: string;
    previousScore?: number;
    newScore: number;
    changeReason?: string;
    playerOutcome?: string;
    detectionRate?: number;
    falsePositiveRate?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<QualityHistory> => {
  const db = getDatabaseClient(config);
  return createQualityHistory(db, {
    tenantId,
    emailTemplateId: data.emailTemplateId ?? null,
    previousScore: data.previousScore != null ? String(data.previousScore) : null,
    newScore: String(data.newScore),
    changeReason: data.changeReason ?? null,
    playerOutcome: data.playerOutcome ?? null,
    detectionRate: data.detectionRate != null ? String(data.detectionRate) : null,
    falsePositiveRate: data.falsePositiveRate != null ? String(data.falsePositiveRate) : null,
    metadata: data.metadata ?? {},
  });
};

export const getQualityHistoryByEmailId = async (
  config: AppConfig,
  tenantId: string,
  emailTemplateId: string,
  limit?: number,
): Promise<QualityHistory[]> => {
  const db = getDatabaseClient(config);
  return findQualityHistoryByEmailId(db, tenantId, emailTemplateId, limit);
};

export const getQualityStats = async (
  config: AppConfig,
  tenantId: string,
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  averageScore: number;
  byDimension: Record<string, number>;
}> => {
  const db = getDatabaseClient(config);
  return findQualityStats(db, tenantId);
};
