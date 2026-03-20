import { sql } from 'drizzle-orm';
import { index, integer, pgSchema, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { playerProfiles } from '../social/player-profiles.js';

const multiplayerSchema = pgSchema('multiplayer');

const party = multiplayerSchema.table('party', {
  partyId: uuid('party_id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
});

export const coopSessionStatuses = ['lobby', 'active', 'paused', 'completed', 'abandoned'] as const;
export type CoopSessionStatus = (typeof coopSessionStatuses)[number];

export const coopSession = multiplayerSchema.table(
  'coop_session',
  {
    sessionId: uuid('session_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    partyId: uuid('party_id')
      .notNull()
      .references(() => party.partyId, { onDelete: 'restrict' }),
    seed: varchar('seed', { length: 32 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('lobby'),
    authorityPlayerId: uuid('authority_player_id').references(() => playerProfiles.profileId, {
      onDelete: 'restrict',
    }),
    dayNumber: integer('day_number').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    partyIdx: index('coop_session_party_idx').on(table.partyId),
    authorityIdx: index('coop_session_authority_idx').on(table.authorityPlayerId),
    tenantStatusIdx: index('coop_session_tenant_status_idx').on(table.tenantId, table.status),
  }),
);

export type CoopSession = typeof coopSession.$inferSelect;
export type NewCoopSession = typeof coopSession.$inferInsert;
