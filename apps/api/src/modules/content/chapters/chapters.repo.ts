import { and, eq } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { chapters, type Chapter } from '../../../db/schema/content/index.js';

export type { Chapter };

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
