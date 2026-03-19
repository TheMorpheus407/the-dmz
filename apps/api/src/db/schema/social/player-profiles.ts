import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

const socialSchema = pgSchema('social');

export const playerProfiles = socialSchema.table(
  'player_profiles',
  {
    profileId: uuid('profile_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    displayName: varchar('display_name', { length: 50 }).notNull(),
    avatarId: varchar('avatar_id', { length: 36 }),
    privacyMode: varchar('privacy_mode', { length: 20 }).notNull().default('public'),
    bio: varchar('bio', { length: 280 }),
    socialVisibility: jsonb('social_visibility').notNull().default({}),
    seasonRank: integer('season_rank'),
    skillRatingBlue: integer('skill_rating_blue'),
    skillRatingRed: integer('skill_rating_red'),
    skillRatingCoop: integer('skill_rating_coop'),
    totalSessionsPlayed: integer('total_sessions_played').notNull().default(0),
    currentStreak: integer('current_streak').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    userUnique: uniqueIndex('social_player_profiles_user_unique').on(table.userId),
    tenantIdx: index('social_player_profiles_tenant_idx').on(table.tenantId),
    seasonRankIdx: index('social_player_profiles_season_rank_idx').on(table.seasonRank),
    lastActiveIdx: index('social_player_profiles_last_active_idx').on(table.lastActiveAt),
    userFk: foreignKey({
      name: 'player_profiles_tenant_id_user_id_users_tenant_id_user_id_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
  }),
);

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type NewPlayerProfile = typeof playerProfiles.$inferInsert;

export const privacyModes = ['public', 'friends_only', 'private'] as const;
export type PrivacyMode = (typeof privacyModes)[number];
