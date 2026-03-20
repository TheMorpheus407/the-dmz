import { sql } from 'drizzle-orm';
import { boolean, index, pgSchema, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { playerProfiles } from '../social/player-profiles.js';

const multiplayerSchema = pgSchema('multiplayer');

const coopSession = multiplayerSchema.table('coop_session', {
  sessionId: uuid('session_id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
});

export const incidentActions = ['quarantine', 'delete', 'escalate', 'resolve'] as const;
export type IncidentAction = (typeof incidentActions)[number];

export const coopIncidentResponse = multiplayerSchema.table(
  'coop_incident_response',
  {
    responseId: uuid('response_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => coopSession.sessionId, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'restrict' }),
    role: varchar('role', { length: 20 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(),
    authorityApproved: boolean('authority_approved').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('coop_incident_response_session_idx').on(table.sessionId),
    playerIdx: index('coop_incident_response_player_idx').on(table.playerId),
  }),
);

export type CoopIncidentResponse = typeof coopIncidentResponse.$inferSelect;
export type NewCoopIncidentResponse = typeof coopIncidentResponse.$inferInsert;
