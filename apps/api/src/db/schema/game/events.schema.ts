import { sql } from 'drizzle-orm';
import {
  index,
  bigint,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

import { gameSessions } from './game-sessions.js';

export const gameEvents = pgTable(
  'game_events',
  {
    eventId: uuid('event_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    eventData: jsonb('event_data').notNull().default({}),
    eventVersion: integer('event_version').notNull().default(1),
    sequenceNum: bigint('sequence_num', { mode: 'number' }).notNull(),
    serverTime: timestamp('server_time', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    clientTime: timestamp('client_time', { withTimezone: true, mode: 'date' }),
    partyId: uuid('party_id'),
    coopRole: varchar('coop_role', { length: 32 }),
  },
  (table) => ({
    sessionSequenceIdx: index('game_events_session_sequence_idx').on(
      table.sessionId,
      table.sequenceNum,
    ),
    eventTypeTimeIdx: index('game_events_type_time_idx').on(table.eventType, table.serverTime),
    tenantIdx: index('game_events_tenant_idx').on(table.tenantId),
    userIdx: index('game_events_user_idx').on(table.userId),
    partyIdx: index('game_events_party_idx').on(table.partyId),
  }),
);

export type GameEvent = typeof gameEvents.$inferSelect;
export type NewGameEvent = typeof gameEvents.$inferInsert;
