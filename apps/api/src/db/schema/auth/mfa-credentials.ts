import { sql } from 'drizzle-orm';
import { foreignKey, index, pgSchema, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

import { sessions } from './sessions.js';

const authSchema = pgSchema('auth');

export const mfaCredentials = authSchema.table(
  'mfa_credentials',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(),
    credentialId: varchar('credential_id', { length: 255 }),
    encryptedSecret: text('encrypted_secret').notNull(),
    name: varchar('name', { length: 255 }),
    deviceType: varchar('device_type', { length: 64 }),
    backedUp: varchar('backed_up', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    userTenantIdx: index('auth_mfa_credentials_user_tenant_idx').on(table.userId, table.tenantId),
    typeIdx: index('auth_mfa_credentials_type_idx').on(table.type),
    credentialIdIdx: index('auth_mfa_credentials_credential_id_idx').on(table.credentialId),
    userTenantFk: foreignKey({
      name: 'mfa_credentials_tenant_id_user_id_users_tenant_id_user_id_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
  }),
);

export type MfaCredential = typeof mfaCredentials.$inferSelect;
export type NewMfaCredential = typeof mfaCredentials.$inferInsert;
