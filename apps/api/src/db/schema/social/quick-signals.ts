import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgSchema,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const signalCategories = ['decision', 'urgency', 'coordination', 'resource'] as const;
export type SignalCategory = (typeof signalCategories)[number];

export const quickSignalTemplates = socialSchema.table(
  'quick_signal_template',
  {
    templateId: uuid('template_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    signalKey: varchar('signal_key', { length: 50 }).notNull().unique(),
    category: varchar('category', { length: 20 }).notNull().$type<SignalCategory>(),
    icon: varchar('icon', { length: 10 }).notNull(),
    label: varchar('label', { length: 50 }).notNull(),
    description: varchar('description', { length: 200 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => ({
    categoryIdx: index('quick_signal_template_category_idx').on(table.category),
    isActiveIdx: index('quick_signal_template_is_active_idx').on(table.isActive),
  }),
);

export const playerQuickSignalUsage = socialSchema.table(
  'player_quick_signal_usage',
  {
    usageId: uuid('usage_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    playerId: uuid('player_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    sessionId: uuid('session_id'),
    signalKey: varchar('signal_key', { length: 50 }).notNull(),
    targetPlayerId: uuid('target_player_id'),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    context: jsonb('context').notNull().default('{}'),
  },
  (table) => ({
    playerSentIdx: index('quick_signal_usage_player_sent_idx').on(table.playerId, table.sentAt),
    sessionSentIdx: index('quick_signal_usage_session_sent_idx').on(table.sessionId, table.sentAt),
    tenantIdx: index('quick_signal_usage_tenant_idx').on(table.tenantId),
  }),
);

export type QuickSignalTemplate = typeof quickSignalTemplates.$inferSelect;
export type NewQuickSignalTemplate = typeof quickSignalTemplates.$inferInsert;
export type PlayerQuickSignalUsage = typeof playerQuickSignalUsage.$inferSelect;
export type NewPlayerQuickSignalUsage = typeof playerQuickSignalUsage.$inferInsert;
