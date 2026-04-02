import { and, eq } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { localizedContent, type LocalizedContent } from '../../../db/schema/content/index.js';
import { assertCreated } from '../../../shared/utils/db-utils.js';

export type { LocalizedContent };

export const findLocalizedContent = async (
  db: DB,
  tenantId: string,
  contentKey: string,
  locale?: string,
): Promise<LocalizedContent | undefined> => {
  const conditions = [
    eq(localizedContent.contentKey, contentKey),
    eq(localizedContent.tenantId, tenantId),
    eq(localizedContent.isActive, true),
  ];

  if (locale) {
    conditions.push(eq(localizedContent.locale, locale));
  }

  const results = await db
    .select()
    .from(localizedContent)
    .where(and(...conditions));

  return results[0];
};

export const createLocalizedContent = async (
  db: DB,
  data: Omit<LocalizedContent, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<LocalizedContent> => {
  const [created] = await db.insert(localizedContent).values(data).returning();
  return assertCreated(created, 'localized content');
};
