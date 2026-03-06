import { sql } from 'drizzle-orm';
import { index, bigint, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

import { gameSessions } from './game-sessions.js';

export const gameStateSnapshots = pgTable(
  'game_state_snapshots',
  {
    snapshotId: uuid('snapshot_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    sequenceNum: bigint('sequence_num', { mode: 'number' }).notNull(),
    stateJson: jsonb('state_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    sessionSequenceUnique: { columns: [table.sessionId, table.sequenceNum] },
    sessionIdx: index('game_state_snapshots_session_idx').on(table.sessionId),
    tenantIdx: index('game_state_snapshots_tenant_idx').on(table.tenantId),
  }),
);

export type GameStateSnapshot = typeof gameStateSnapshots.$inferSelect;
export type NewGameStateSnapshot = typeof gameStateSnapshots.$inferInsert;
