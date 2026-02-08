import { sql } from 'drizzle-orm';
import { boolean, index, pgSchema, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const authSchema = pgSchema('auth');

export const ssoConnections = authSchema.table(
  'sso_connections',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 32 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    metadataUrl: text('metadata_url'),
    clientId: varchar('client_id', { length: 255 }),
    clientSecretEncrypted: text('client_secret_encrypted'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantProviderIdx: index('auth_sso_connections_tenant_provider_idx').on(
      table.tenantId,
      table.provider,
    ),
  }),
);

export type SsoConnection = typeof ssoConnections.$inferSelect;
export type NewSsoConnection = typeof ssoConnections.$inferInsert;
