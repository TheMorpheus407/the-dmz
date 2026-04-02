import { and, eq, sql } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import {
  difficultyHistory,
  emailFeatures,
  type DifficultyHistory,
  type EmailFeature,
} from '../../../db/schema/content/index.js';
import { assertCreated } from '../../../shared/utils/db-utils.js';

export type { DifficultyHistory, EmailFeature };

export const findDifficultyHistoryByTier = async (
  db: DB,
  tenantId: string,
  tier: number,
  filters?: {
    classificationMethod?: 'haiku' | 'rule-based' | 'manual';
    limit?: number;
  },
): Promise<DifficultyHistory[]> => {
  const conditions = [
    eq(difficultyHistory.tenantId, tenantId),
    eq(difficultyHistory.classifiedDifficulty, tier),
  ];

  if (filters?.classificationMethod) {
    conditions.push(eq(difficultyHistory.classificationMethod, filters.classificationMethod));
  }

  return db
    .select()
    .from(difficultyHistory)
    .where(and(...conditions))
    .orderBy(sql`${difficultyHistory.createdAt} DESC`)
    .limit(filters?.limit ?? 50);
};

export const findEmailFeaturesById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<EmailFeature | undefined> => {
  const results = await db
    .select()
    .from(emailFeatures)
    .where(and(eq(emailFeatures.id, id), eq(emailFeatures.tenantId, tenantId)));

  return results[0];
};

export const findClassificationStats = async (
  db: DB,
  tenantId: string,
): Promise<{
  total: number;
  byDifficulty: Record<number, number>;
  byMethod: Record<string, number>;
  averageConfidence: number;
}> => {
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(difficultyHistory)
    .where(eq(difficultyHistory.tenantId, tenantId));

  const byDifficultyResult = await db
    .select({
      difficulty: difficultyHistory.classifiedDifficulty,
      count: sql<number>`count(*)`,
    })
    .from(difficultyHistory)
    .where(eq(difficultyHistory.tenantId, tenantId))
    .groupBy(difficultyHistory.classifiedDifficulty);

  const byMethodResult = await db
    .select({
      method: difficultyHistory.classificationMethod,
      count: sql<number>`count(*)`,
    })
    .from(difficultyHistory)
    .where(eq(difficultyHistory.tenantId, tenantId))
    .groupBy(difficultyHistory.classificationMethod);

  const avgConfidenceResult = await db
    .select({ avg: sql<number>`avg(${difficultyHistory.confidence})` })
    .from(difficultyHistory)
    .where(eq(difficultyHistory.tenantId, tenantId));

  const byDifficulty: Record<number, number> = {};
  for (const row of byDifficultyResult) {
    byDifficulty[row.difficulty] = Number(row.count);
  }

  const byMethod: Record<string, number> = {};
  for (const row of byMethodResult) {
    byMethod[row.method] = Number(row.count);
  }

  return {
    total: Number(totalResult[0]?.count ?? 0),
    byDifficulty,
    byMethod,
    averageConfidence: Number(avgConfidenceResult[0]?.avg ?? 0),
  };
};

export const createDifficultyHistory = async (
  db: DB,
  data: Omit<DifficultyHistory, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<DifficultyHistory> => {
  const [created] = await db.insert(difficultyHistory).values(data).returning();
  return assertCreated(created, 'difficulty history record');
};

export const createEmailFeature = async (
  db: DB,
  data: Omit<EmailFeature, 'id' | 'createdAt'>,
): Promise<EmailFeature> => {
  const [created] = await db.insert(emailFeatures).values(data).returning();
  return assertCreated(created, 'email feature record');
};
