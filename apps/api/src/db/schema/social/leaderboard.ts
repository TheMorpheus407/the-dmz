import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const leaderboardScopes = ['global', 'regional', 'guild', 'tenant', 'friends'] as const;
export type LeaderboardScope = (typeof leaderboardScopes)[number];

export const rankingCategories = [
  'overall',
  'accuracy',
  'incident_response',
  'resource_efficiency',
  'speed',
] as const;
export type RankingCategory = (typeof rankingCategories)[number];

export const timeFrames = ['daily', 'weekly', 'seasonal'] as const;
export type TimeFrame = (typeof timeFrames)[number];

export const leaderboards = socialSchema.table(
  'leaderboard',
  {
    leaderboardId: uuid('leaderboard_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    scope: varchar('scope', { length: 20 }).notNull(),
    region: varchar('region', { length: 20 }),
    seasonId: varchar('season_id', { length: 20 }).notNull(),
    rankingCategory: varchar('ranking_category', { length: 30 }).notNull(),
    timeFrame: varchar('time_frame', { length: 20 }).notNull().default('seasonal'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    scopeSeasonIdx: index('leaderboard_scope_season_idx').on(table.scope, table.seasonId),
  }),
);

export const leaderboardEntries = socialSchema.table(
  'leaderboard_entry',
  {
    entryId: uuid('entry_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    leaderboardId: uuid('leaderboard_id')
      .notNull()
      .references(() => leaderboards.leaderboardId, { onDelete: 'cascade' }),
    playerId: uuid('player_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    score: integer('score').notNull().default(0),
    rank: integer('rank').notNull().default(0),
    metrics: jsonb('metrics').notNull().default({
      accuracy: 0,
      avgDecisionTime: 0,
      incidentsResolved: 0,
      resourceEfficiency: 0,
    }),
    periodStart: timestamp('period_start', { withTimezone: true, mode: 'date' }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    leaderboardRankUnique: uniqueIndex('leaderboard_entry_leaderboard_rank_idx').on(
      table.leaderboardId,
      table.rank,
    ),
    playerIdx: index('leaderboard_entry_player_idx').on(table.playerId),
    tenantIdx: index('leaderboard_entry_tenant_idx').on(table.tenantId),
  }),
);

export type Leaderboard = typeof leaderboards.$inferSelect;
export type NewLeaderboard = typeof leaderboards.$inferInsert;

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type NewLeaderboardEntry = typeof leaderboardEntries.$inferInsert;

export interface LeaderboardMetrics {
  accuracy: number;
  avgDecisionTime: number;
  incidentsResolved: number;
  resourceEfficiency: number;
}

export interface ScoreWeights {
  accuracyWeight: number;
  timeWeight: number;
  incidentWeight: number;
  resourceWeight: number;
  penaltyWeight: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  accuracyWeight: 0.4,
  timeWeight: 0.1,
  incidentWeight: 0.3,
  resourceWeight: 0.15,
  penaltyWeight: 0.05,
};

export const SCORE_CAPS = {
  accuracy: 100,
  avgDecisionTime: 300000,
  incidentsResolved: 1000,
  resourceEfficiency: 100,
  riskyApprovalRate: 100,
} as const;
