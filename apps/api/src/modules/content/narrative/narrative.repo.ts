import { and, eq, isNull, isNotNull, or, gte, lte } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { morpheusMessages, type MorpheusMessage } from '../../../db/schema/content/index.js';

export type { MorpheusMessage };

export const findMorpheusMessagesByTrigger = async (
  db: DB,
  tenantId: string,
  triggerType: string,
  filters?: {
    day?: number;
    factionKey?: string;
  },
): Promise<MorpheusMessage[]> => {
  const conditions = [
    eq(morpheusMessages.tenantId, tenantId),
    eq(morpheusMessages.triggerType, triggerType),
    eq(morpheusMessages.isActive, true),
  ];

  if (filters?.day !== undefined) {
    const day = filters.day;
    const dayCondition = or(
      and(isNull(morpheusMessages.minDay), isNull(morpheusMessages.maxDay)),
      and(
        isNotNull(morpheusMessages.minDay),
        isNull(morpheusMessages.maxDay),
        lte(morpheusMessages.minDay, day),
      ),
      and(
        isNull(morpheusMessages.minDay),
        isNotNull(morpheusMessages.maxDay),
        gte(morpheusMessages.maxDay, day),
      ),
      and(
        isNotNull(morpheusMessages.minDay),
        isNotNull(morpheusMessages.maxDay),
        lte(morpheusMessages.minDay, day),
        gte(morpheusMessages.maxDay, day),
      ),
    );
    if (dayCondition) {
      conditions.push(dayCondition);
    }
  }

  if (filters?.factionKey) {
    const factionCondition = or(
      eq(morpheusMessages.factionKey, filters.factionKey),
      isNull(morpheusMessages.factionKey),
    );
    if (factionCondition) {
      conditions.push(factionCondition);
    }
  }

  return db
    .select()
    .from(morpheusMessages)
    .where(and(...conditions));
};

export const findMorpheusMessageByKey = async (
  db: DB,
  tenantId: string,
  messageKey: string,
): Promise<MorpheusMessage | undefined> => {
  const results = await db
    .select()
    .from(morpheusMessages)
    .where(
      and(
        eq(morpheusMessages.tenantId, tenantId),
        eq(morpheusMessages.messageKey, messageKey),
        eq(morpheusMessages.isActive, true),
      ),
    );

  return results[0];
};
