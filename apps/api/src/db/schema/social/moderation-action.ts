import { sql } from 'drizzle-orm';
import { index, pgSchema, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const actionTypes = [
  'warning',
  'mute',
  'mute_duration',
  'content_removal',
  'restriction',
  'ban',
] as const;
export type ActionType = (typeof actionTypes)[number];

export const moderationAction = socialSchema.table(
  'moderation_action',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    playerId: uuid('player_id').notNull(),
    moderatorId: uuid('moderator_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    actionType: varchar('action_type', { length: 30 }).notNull(),
    reason: varchar('reason', { length: 280 }),
    reportId: uuid('report_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('moderation_action_tenant_idx').on(table.tenantId),
    playerIdx: index('moderation_action_player_idx').on(table.playerId),
    moderatorIdx: index('moderation_action_moderator_idx').on(table.moderatorId),
    reportIdx: index('moderation_action_report_idx').on(table.reportId),
    expiresIdx: index('moderation_action_expires_idx').on(table.expiresAt),
    createdIdx: index('moderation_action_created_idx').on(table.createdAt),
    playerTenantIdx: index('moderation_action_player_tenant_idx').on(
      table.playerId,
      table.tenantId,
    ),
  }),
);

export type ModerationAction = typeof moderationAction.$inferSelect;
export type NewModerationAction = typeof moderationAction.$inferInsert;
