import {
  pgSchema,
  uuid,
  timestamp,
  jsonb,
  boolean,
  uniqueIndex,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

import { achievementDefinitions } from './achievement-definitions.js';
import { playerProfiles } from './player-profiles.js';

const socialSchema = pgSchema('social');

export const playerAchievements = socialSchema.table(
  'player_achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'cascade' }),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievementDefinitions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true, mode: 'date' }),
    progress: jsonb('progress').notNull().default({}),
    notificationSent: boolean('notification_sent').notNull().default(false),
    sharedToProfile: boolean('shared_to_profile').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    playerAchievementUnique: uniqueIndex('player_achievements_player_achievement_unique').on(
      table.playerId,
      table.achievementId,
    ),
    playerIdIdx: index('player_achievements_player_idx').on(table.playerId),
    achievementIdIdx: index('player_achievements_achievement_idx').on(table.achievementId),
    tenantIdIdx: index('player_achievements_tenant_idx').on(table.tenantId),
    playerFk: foreignKey({
      name: 'player_achievements_tenant_player_fk',
      columns: [table.tenantId, table.playerId],
      foreignColumns: [playerProfiles.tenantId, playerProfiles.profileId],
    }).onDelete('cascade'),
  }),
);

export type PlayerAchievement = typeof playerAchievements.$inferSelect;
export type NewPlayerAchievement = typeof playerAchievements.$inferInsert;
