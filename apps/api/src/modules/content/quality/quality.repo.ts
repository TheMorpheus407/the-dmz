import { and, eq, sql } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import {
  qualityScores,
  qualityThresholds,
  qualityFlags,
  qualityHistory,
  type QualityScore,
  type QualityThreshold,
  type QualityFlag,
  type QualityHistory,
} from '../../../db/schema/content/index.js';

export type { QualityScore, QualityThreshold, QualityFlag, QualityHistory };

export const findQualityScoreByEmailId = async (
  db: DB,
  tenantId: string,
  emailTemplateId: string,
): Promise<QualityScore | undefined> => {
  const results = await db
    .select()
    .from(qualityScores)
    .where(
      and(eq(qualityScores.tenantId, tenantId), eq(qualityScores.emailTemplateId, emailTemplateId)),
    );
  return results[0];
};

export const findQualityScoreById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<QualityScore | undefined> => {
  const results = await db
    .select()
    .from(qualityScores)
    .where(and(eq(qualityScores.id, id), eq(qualityScores.tenantId, tenantId)));
  return results[0];
};

export const createQualityScore = async (
  db: DB,
  data: Omit<QualityScore, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<QualityScore> => {
  const [created] = await db.insert(qualityScores).values(data).returning();
  if (!created) {
    throw new Error('Failed to create quality score');
  }
  return created;
};

export const updateQualityScore = async (
  db: DB,
  tenantId: string,
  id: string,
  data: Partial<Omit<QualityScore, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<QualityScore | undefined> => {
  const [updated] = await db
    .update(qualityScores)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(qualityScores.id, id), eq(qualityScores.tenantId, tenantId)))
    .returning();
  return updated;
};

export const findQualityThresholds = async (
  db: DB,
  tenantId: string,
  filters?: {
    isActive?: boolean;
    status?: string;
  },
): Promise<QualityThreshold[]> => {
  const conditions = [eq(qualityThresholds.tenantId, tenantId)];

  if (filters?.isActive !== undefined) {
    conditions.push(eq(qualityThresholds.isActive, filters.isActive));
  }
  if (filters?.status) {
    conditions.push(eq(qualityThresholds.status, filters.status));
  }

  return db
    .select()
    .from(qualityThresholds)
    .where(and(...conditions));
};

export const createQualityThreshold = async (
  db: DB,
  data: Omit<QualityThreshold, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<QualityThreshold> => {
  const [created] = await db.insert(qualityThresholds).values(data).returning();
  if (!created) {
    throw new Error('Failed to create quality threshold');
  }
  return created;
};

export const createQualityFlag = async (
  db: DB,
  data: Omit<QualityFlag, 'id' | 'createdAt'>,
): Promise<QualityFlag> => {
  const [created] = await db.insert(qualityFlags).values(data).returning();
  if (!created) {
    throw new Error('Failed to create quality flag');
  }
  return created;
};

export const resolveQualityFlag = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<QualityFlag | undefined> => {
  const [updated] = await db
    .update(qualityFlags)
    .set({ isResolved: true, resolvedAt: new Date() })
    .where(and(eq(qualityFlags.id, id), eq(qualityFlags.tenantId, tenantId)))
    .returning();
  return updated;
};

export const findQualityFlagsByScoreId = async (
  db: DB,
  tenantId: string,
  qualityScoreId: string,
): Promise<QualityFlag[]> => {
  return db
    .select()
    .from(qualityFlags)
    .where(
      and(eq(qualityFlags.tenantId, tenantId), eq(qualityFlags.qualityScoreId, qualityScoreId)),
    );
};

export const createQualityHistory = async (
  db: DB,
  data: Omit<QualityHistory, 'id' | 'createdAt'>,
): Promise<QualityHistory> => {
  const [created] = await db.insert(qualityHistory).values(data).returning();
  if (!created) {
    throw new Error('Failed to create quality history record');
  }
  return created;
};

export const findQualityHistoryByEmailId = async (
  db: DB,
  tenantId: string,
  emailTemplateId: string,
  limit?: number,
): Promise<QualityHistory[]> => {
  return db
    .select()
    .from(qualityHistory)
    .where(
      and(
        eq(qualityHistory.tenantId, tenantId),
        eq(qualityHistory.emailTemplateId, emailTemplateId),
      ),
    )
    .orderBy(sql`${qualityHistory.createdAt} DESC`)
    .limit(limit ?? 50);
};

export const findQualityStats = async (
  db: DB,
  tenantId: string,
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  averageScore: number;
  byDimension: Record<string, number>;
}> => {
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(qualityScores)
    .where(eq(qualityScores.tenantId, tenantId));

  const byStatusResult = await db
    .select({
      status: qualityScores.status,
      count: sql<number>`count(*)`,
    })
    .from(qualityScores)
    .where(eq(qualityScores.tenantId, tenantId))
    .groupBy(qualityScores.status);

  const avgScoreResult = await db
    .select({ avg: sql<number>`avg(${qualityScores.overallScore})` })
    .from(qualityScores)
    .where(eq(qualityScores.tenantId, tenantId));

  const avgDimensionsResult = await db
    .select({
      narrative: sql<number>`avg(${qualityScores.narrativePlausibility})`,
      grammar: sql<number>`avg(${qualityScores.grammarClarity})`,
      attack: sql<number>`avg(${qualityScores.attackAlignment})`,
      diversity: sql<number>`avg(${qualityScores.signalDiversity})`,
      learn: sql<number>`avg(${qualityScores.learnability})`,
    })
    .from(qualityScores)
    .where(eq(qualityScores.tenantId, tenantId));

  const byStatus: Record<string, number> = {};
  for (const row of byStatusResult) {
    byStatus[row.status] = Number(row.count);
  }

  const byDimension: Record<string, number> = {};
  if (avgDimensionsResult[0]) {
    byDimension['narrativePlausibility'] = Number(avgDimensionsResult[0]['narrative']) || 0;
    byDimension['grammarClarity'] = Number(avgDimensionsResult[0]['grammar']) || 0;
    byDimension['attackAlignment'] = Number(avgDimensionsResult[0]['attack']) || 0;
    byDimension['signalDiversity'] = Number(avgDimensionsResult[0]['diversity']) || 0;
    byDimension['learnability'] = Number(avgDimensionsResult[0]['learn']) || 0;
  }

  return {
    total: Number(totalResult[0]?.count ?? 0),
    byStatus,
    averageScore: Number(avgScoreResult[0]?.avg ?? 0),
    byDimension,
  };
};
