import { sql } from 'drizzle-orm';
import {
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../shared/database/schema/tenants.js';

const idempotencySchema = pgSchema('idempotency');

export const idempotencyRecords = idempotencySchema.table(
  'records',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    actorId: uuid('actor_id'),
    route: varchar('route', { length: 256 }).notNull(),
    method: varchar('method', { length: 8 }).notNull(),
    keyHash: varchar('key_hash', { length: 64 }).notNull(),
    keyValue: varchar('key_value', { length: 64 }).notNull(),
    fingerprint: varchar('fingerprint', { length: 128 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => ({
    tenantKeyHashUnique: uniqueIndex('idempotency_tenant_key_hash_unique').on(
      table.tenantId,
      table.keyHash,
    ),
    tenantIdIdx: index('idempotency_tenant_id_idx').on(table.tenantId),
    tenantKeyIdx: index('idempotency_tenant_key_idx').on(table.tenantId, table.keyHash),
    expiresAtIdx: index('idempotency_expires_at_idx').on(table.expiresAt),
    statusIdx: index('idempotency_status_idx').on(table.status),
    createdAtIdx: index('idempotency_created_at_idx').on(table.createdAt),
  }),
);

export type IdempotencyRecord = typeof idempotencyRecords.$inferSelect;
export type NewIdempotencyRecord = typeof idempotencyRecords.$inferInsert;
