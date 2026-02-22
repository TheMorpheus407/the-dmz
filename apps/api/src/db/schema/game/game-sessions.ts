import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

export const gameSessions = pgTable(
  'game_sessions',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    day: integer('day').notNull().default(1),
    funds: integer('funds').notNull().default(1000),
    clientCount: integer('client_count').notNull().default(5),
    threatLevel: varchar('threat_level', { length: 16 }).notNull().default('low'),
    defenseLevel: integer('defense_level').notNull().default(1),
    serverLevel: integer('server_level').notNull().default(1),
    networkLevel: integer('network_level').notNull().default(1),
    isActive: uuid('is_active')
      .notNull()
      .default(sql`uuid_generate_v7()`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantUserUnique: uniqueIndex('game_sessions_tenant_user_unique').on(
      table.tenantId,
      table.userId,
      table.isActive,
    ),
    tenantIdIdx: index('game_sessions_tenant_idx').on(table.tenantId),
    userIdIdx: index('game_sessions_user_id_idx').on(table.userId),
  }),
);

export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;
