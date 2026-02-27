import { sql } from 'drizzle-orm';
import { index, pgSchema, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const authSchema = pgSchema('auth');

export const oauthClients = authSchema.table(
  'oauth_clients',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    clientId: uuid('client_id')
      .default(sql`uuid_generate_v7()`)
      .notNull()
      .unique(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    secretHash: varchar('secret_hash', { length: 255 }).notNull(),
    previousSecretHash: varchar('previous_secret_hash', { length: 255 }),
    scopes: text('scopes').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    clientIdUnique: uniqueIndex('auth_oauth_clients_client_id_unique').on(table.clientId),
    tenantIdIdx: index('auth_oauth_clients_tenant_id_idx').on(table.tenantId),
    tenantClientIdIdx: index('auth_oauth_clients_tenant_client_idx').on(
      table.tenantId,
      table.clientId,
    ),
    tenantClientIdUnique: uniqueIndex('auth_oauth_clients_tenant_client_unique').on(
      table.tenantId,
      table.clientId,
    ),
    tenantNameIdx: index('auth_oauth_clients_tenant_name_idx').on(table.tenantId, table.name),
    revokedAtIdx: index('auth_oauth_clients_revoked_at_idx').on(table.revokedAt),
    expiresAtIdx: index('auth_oauth_clients_expires_at_idx').on(table.expiresAt),
  }),
);

export type OAuthClient = typeof oauthClients.$inferSelect;
export type NewOAuthClient = typeof oauthClients.$inferInsert;
