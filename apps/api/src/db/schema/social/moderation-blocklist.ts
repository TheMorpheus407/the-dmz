import { sql } from 'drizzle-orm';
import { index, pgSchema, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const blocklistPatternTypes = ['exact', 'regex', 'contains'] as const;
export type BlocklistPatternType = (typeof blocklistPatternTypes)[number];

export const blocklistSeverities = ['flag', 'block', 'mute'] as const;
export type BlocklistSeverity = (typeof blocklistSeverities)[number];

export const blocklistCategories = [
  'profanity',
  'slur',
  'spam',
  'doxxing',
  'harassment',
  'custom',
] as const;
export type BlocklistCategory = (typeof blocklistCategories)[number];

export const moderationBlocklist = socialSchema.table(
  'moderation_blocklist',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.tenantId, {
      onDelete: 'restrict',
    }),
    pattern: varchar('pattern', { length: 1000 }).notNull(),
    patternType: varchar('pattern_type', { length: 20 }).notNull().default('contains'),
    severity: varchar('severity', { length: 20 }).notNull().default('flag'),
    category: varchar('category', { length: 20 }).notNull().default('custom'),
    isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => ({
    tenantIdx: index('moderation_blocklist_tenant_idx').on(table.tenantId),
    activeIdx: index('moderation_blocklist_active_idx').on(table.isActive),
    categoryIdx: index('moderation_blocklist_category_idx').on(table.category),
    tenantPatternUnique: uniqueIndex('moderation_blocklist_tenant_pattern_unique').on(
      table.tenantId,
      table.pattern,
    ),
  }),
);

export type ModerationBlocklist = typeof moderationBlocklist.$inferSelect;
export type NewModerationBlocklist = typeof moderationBlocklist.$inferInsert;
