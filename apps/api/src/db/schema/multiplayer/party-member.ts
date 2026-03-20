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

const party = multiplayerSchema.table('party', {
  partyId: uuid('party_id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
});

export const partyRoles = ['leader', 'member'] as const;
export type PartyRole = (typeof partyRoles)[number];

export const declaredRoles = ['triage_lead', 'verification_lead', 'any'] as const;
export type DeclaredRole = (typeof declaredRoles)[number];

export const partyMember = multiplayerSchema.table(
  'party_member',
  {
    partyMemberId: uuid('party_member_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    partyId: uuid('party_id')
      .notNull()
      .references(() => party.partyId, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'restrict' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    readyStatus: boolean('ready_status').notNull().default(false),
    declaredRole: varchar('declared_role', { length: 20 }),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    partyIdx: index('party_member_party_idx').on(table.partyId),
    playerIdx: index('party_member_player_idx').on(table.playerId),
    partyPlayerUnique: uniqueIndex('party_member_party_player_unique').on(
      table.partyId,
      table.playerId,
    ),
  }),
);

export type PartyMember = typeof partyMember.$inferSelect;
export type NewPartyMember = typeof partyMember.$inferInsert;
