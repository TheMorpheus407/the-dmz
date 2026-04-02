import { and, eq } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { documentTemplates, type DocumentTemplate } from '../../../db/schema/content/index.js';
import { assertCreated } from '../../../shared/utils/db-utils.js';

export type { DocumentTemplate };

export const findDocumentTemplates = async (
  db: DB,
  tenantId: string,
  filters?: {
    documentType?: string;
    faction?: string;
    locale?: string;
    isActive?: boolean;
  },
): Promise<DocumentTemplate[]> => {
  const conditions = [eq(documentTemplates.tenantId, tenantId)];

  if (filters?.documentType) {
    conditions.push(eq(documentTemplates.documentType, filters.documentType));
  }
  if (filters?.faction) {
    conditions.push(eq(documentTemplates.faction, filters.faction));
  }
  if (filters?.locale) {
    conditions.push(eq(documentTemplates.locale, filters.locale));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(documentTemplates.isActive, filters.isActive));
  }

  return db
    .select()
    .from(documentTemplates)
    .where(and(...conditions));
};

export const findDocumentTemplateByType = async (
  db: DB,
  tenantId: string,
  documentType: string,
): Promise<DocumentTemplate[]> => {
  return db
    .select()
    .from(documentTemplates)
    .where(
      and(
        eq(documentTemplates.documentType, documentType),
        eq(documentTemplates.tenantId, tenantId),
        eq(documentTemplates.isActive, true),
      ),
    );
};

export const findDocumentTemplateById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<DocumentTemplate | undefined> => {
  const results = await db
    .select()
    .from(documentTemplates)
    .where(and(eq(documentTemplates.id, id), eq(documentTemplates.tenantId, tenantId)));

  return results[0];
};

export const createDocumentTemplate = async (
  db: DB,
  data: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<DocumentTemplate> => {
  const [created] = await db.insert(documentTemplates).values(data).returning();
  return assertCreated(created, 'document template');
};
