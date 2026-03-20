import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { playerProfiles } from '../social/player-profiles.js';

const multiplayerSchema = pgSchema('multiplayer');

const coopSession = multiplayerSchema.table('coop_session', {
  sessionId: uuid('session_id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
});

export const coopRoles = ['triage_lead', 'verification_lead'] as const;
export type CoopRole = (typeof coopRoles)[number];

export const rolePreferences = ['triage_lead', 'verification_lead', 'no_preference'] as const;
export type RolePreference = (typeof rolePreferences)[number];

export const coopRoleAssignment = multiplayerSchema.table(
  'coop_role_assignment',
  {
    assignmentId: uuid('assignment_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => coopSession.sessionId, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'restrict' }),
    role: varchar('role', { length: 20 }).notNull(),
    isAuthority: boolean('is_authority').notNull().default(false),
    rolePreference: varchar('role_preference', { length: 20 }),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionIdx: index('coop_role_assignment_session_idx').on(table.sessionId),
    playerIdx: index('coop_role_assignment_player_idx').on(table.playerId),
    sessionPlayerUnique: uniqueIndex('coop_role_assignment_session_player_unique').on(
      table.sessionId,
      table.playerId,
    ),
  }),
);

export type CoopRoleAssignment = typeof coopRoleAssignment.$inferSelect;
export type NewCoopRoleAssignment = typeof coopRoleAssignment.$inferInsert;
