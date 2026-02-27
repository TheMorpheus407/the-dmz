import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  inet,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

const authSchema = pgSchema('auth');

export const sessions = authSchema.table(
  'sessions',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    deviceFingerprint: varchar('device_fingerprint', { length: 128 }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    mfaVerifiedAt: timestamp('mfa_verified_at', { withTimezone: true, mode: 'date' }),
    mfaMethod: varchar('mfa_method', { length: 32 }),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
    userExpiresIdx: index('auth_sessions_user_expires_at_idx').on(table.userId, table.expiresAt),
    tenantUserIdx: index('auth_sessions_tenant_user_idx').on(table.tenantId, table.userId),
    tenantUserFk: foreignKey({
      name: 'sessions_tenant_id_user_id_users_tenant_id_user_id_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
