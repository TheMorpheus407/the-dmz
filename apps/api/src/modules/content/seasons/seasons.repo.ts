import { and, eq } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { seasons, type Season } from '../../../db/schema/content/index.js';

export type { Season };

export const findSeasons = async (
  db: DB,
  tenantId: string,
  filters?: {
    seasonNumber?: number;
    isActive?: boolean;
  },
): Promise<Season[]> => {
  const conditions = [eq(seasons.tenantId, tenantId)];

  if (filters?.seasonNumber !== undefined) {
    conditions.push(eq(seasons.seasonNumber, filters.seasonNumber));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(seasons.isActive, filters.isActive));
  }

  return db
    .select()
    .from(seasons)
    .where(and(...conditions))
    .orderBy(seasons.seasonNumber);
};

export const findSeasonById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<Season | undefined> => {
  const results = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, id), eq(seasons.tenantId, tenantId)));

  return results[0];
};

export const createSeason = async (
  db: DB,
  data: Omit<Season, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Season> => {
  const [created] = await db.insert(seasons).values(data).returning();
  if (!created) {
    throw new Error('Failed to create season');
  }
  return created;
};
