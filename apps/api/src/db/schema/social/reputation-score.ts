import {
  decimal,
  foreignKey,
  index,
  integer,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

import { playerProfiles } from './player-profiles.js';

const socialSchema = pgSchema('social');

export const reputationTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
export type ReputationTier = (typeof reputationTiers)[number];

export const REPUTATION_TIER_THRESHOLDS = {
  bronze: 0,
  silver: 200,
  gold: 400,
  platinum: 600,
  diamond: 800,
} as const;

export const REPUTATION_COMPONENTS = {
  ENDORSEMENT_MAX: 400,
  ENDORSEMENT_IMPACT: 10,
  COMPLETION_MAX: 300,
  REPORT_PENALTY_PER: -200,
  ABANDONMENT_PENALTY_PER: -50,
  ENDORSEMENT_DECAY_DAYS: 90,
  ENDORSEMENT_DECAY_PERCENT: 0.1,
} as const;

export const REPUTATION_DEFAULT_SCORE = 500;

export const reputationScores = socialSchema.table(
  'reputation_score',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    seasonId: uuid('season_id'),
    totalScore: integer('total_score').notNull().default(REPUTATION_DEFAULT_SCORE),
    endorsementScore: integer('endorsement_score').notNull().default(0),
    completionScore: integer('completion_score').notNull().default(0),
    reportPenalty: integer('report_penalty').notNull().default(0),
    abandonmentPenalty: integer('abandonment_penalty').notNull().default(0),
    endorsementCount: integer('endorsement_count').notNull().default(0),
    sessionCompletionRate: decimal('session_completion_rate', { precision: 5, scale: 4 }),
    verifiedReportCount: integer('verified_report_count').notNull().default(0),
    abandonedSessionCount: integer('abandoned_session_count').notNull().default(0),
    lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    playerSeasonUnique: uniqueIndex('reputation_score_player_season_unique').on(
      table.playerId,
      table.seasonId,
    ),
    playerIdIdx: index('reputation_score_player_idx').on(table.playerId),
    tenantIdIdx: index('reputation_score_tenant_idx').on(table.tenantId),
    seasonIdIdx: index('reputation_score_season_idx').on(table.seasonId),
    totalScoreIdx: index('reputation_score_total_score_idx').on(table.totalScore),
    tenantPlayerFk: foreignKey({
      name: 'reputation_score_tenant_player_fk',
      columns: [table.tenantId, table.playerId],
      foreignColumns: [playerProfiles.tenantId, playerProfiles.profileId],
    }).onDelete('cascade'),
  }),
);

export type ReputationScore = typeof reputationScores.$inferSelect;
export type NewReputationScore = typeof reputationScores.$inferInsert;
