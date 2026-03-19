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

export const enterpriseScopes = ['department', 'tenant', 'corporation'] as const;
export type EnterpriseScope = (typeof enterpriseScopes)[number];

export const privacyLevels = ['full_name', 'pseudonym', 'anonymous_aggregate'] as const;
export type PrivacyLevel = (typeof privacyLevels)[number];

export const leaderboardTypes = [
  'accuracy',
  'response_time',
  'incident_resolution',
  'verification_discipline',
  'composite',
] as const;
export type LeaderboardType = (typeof leaderboardTypes)[number];

export const resetCadences = ['daily', 'weekly', 'seasonal'] as const;
export type ResetCadence = (typeof resetCadences)[number];

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

export const enterpriseLeaderboards = socialSchema.table(
  'enterprise_leaderboard',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    scope: varchar('scope', { length: 20 }).notNull(),
    orgUnitId: uuid('org_unit_id'),
    corporationId: uuid('corporation_id'),
    leaderboardType: varchar('leaderboard_type', { length: 30 }).notNull(),
    resetCadence: varchar('reset_cadence', { length: 20 }).notNull().default('seasonal'),
    currentSeasonId: varchar('current_season_id', { length: 20 }).notNull().default('season-1'),
    privacyLevel: varchar('privacy_level', { length: 30 }).notNull().default('full_name'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('enterprise_leaderboard_tenant_idx').on(table.tenantId),
    scopeIdx: index('enterprise_leaderboard_scope_idx').on(table.scope),
    orgUnitIdx: index('enterprise_leaderboard_org_unit_idx').on(table.orgUnitId),
    corporationIdx: index('enterprise_leaderboard_corporation_idx').on(table.corporationId),
  }),
);

export const leaderboardScores = socialSchema.table(
  'leaderboard_score',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    leaderboardId: uuid('leaderboard_id')
      .notNull()
      .references(() => enterpriseLeaderboards.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    departmentId: uuid('department_id'),
    corporationId: uuid('corporation_id'),
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
    leaderboardIdx: index('leaderboard_score_leaderboard_idx').on(table.leaderboardId),
    playerIdx: index('leaderboard_score_player_idx').on(table.playerId),
    tenantIdx: index('leaderboard_score_tenant_idx').on(table.tenantId),
    departmentIdx: index('leaderboard_score_department_idx').on(table.departmentId),
    corporationIdx: index('leaderboard_score_corporation_idx').on(table.corporationId),
    leaderboardRankUnique: uniqueIndex('leaderboard_score_leaderboard_rank_idx').on(
      table.leaderboardId,
      table.rank,
    ),
  }),
);

export type EnterpriseLeaderboard = typeof enterpriseLeaderboards.$inferSelect;
export type NewEnterpriseLeaderboard = typeof enterpriseLeaderboards.$inferInsert;

export type LeaderboardScore = typeof leaderboardScores.$inferSelect;
export type NewLeaderboardScore = typeof leaderboardScores.$inferInsert;

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
