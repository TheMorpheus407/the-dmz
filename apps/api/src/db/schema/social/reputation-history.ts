import { pgSchema, uuid, timestamp, index, integer, varchar } from 'drizzle-orm/pg-core';

const socialSchema = pgSchema('social');

export const reputationHistoryReasons = [
  'endorsement_received',
  'endorsement_decayed',
  'session_completed',
  'session_abandoned',
  'report_verified',
  'report_dismissed',
] as const;
export type ReputationHistoryReason = (typeof reputationHistoryReasons)[number];

export const reputationHistory = socialSchema.table(
  'reputation_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    playerId: uuid('player_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    seasonId: uuid('season_id'),
    delta: integer('delta').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    referenceId: uuid('reference_id'),
    scoreAfter: integer('score_after').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    playerIdIdx: index('reputation_history_player_idx').on(table.playerId),
    tenantIdIdx: index('reputation_history_tenant_idx').on(table.tenantId),
    seasonIdIdx: index('reputation_history_season_idx').on(table.seasonId),
    createdAtIdx: index('reputation_history_created_idx').on(table.createdAt),
    reasonIdx: index('reputation_history_reason_idx').on(table.reason),
  }),
);

export type ReputationHistory = typeof reputationHistory.$inferSelect;
export type NewReputationHistory = typeof reputationHistory.$inferInsert;
