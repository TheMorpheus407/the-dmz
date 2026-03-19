import { index, jsonb, pgSchema, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const presenceStatuses = [
  'offline',
  'online',
  'in_session',
  'in_coop',
  'in_ranked',
] as const;
export type PresenceStatus = (typeof presenceStatuses)[number];

export const presence = socialSchema.table(
  'presence',
  {
    playerId: uuid('player_id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).notNull().default('offline'),
    statusData: jsonb('status_data').notNull().default({}),
    lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('presence_tenant_idx').on(table.tenantId),
    statusIdx: index('presence_status_idx').on(table.status),
    lastHeartbeatIdx: index('presence_last_heartbeat_idx').on(table.lastHeartbeat),
  }),
);

export type Presence = typeof presence.$inferSelect;
export type NewPresence = typeof presence.$inferInsert;
