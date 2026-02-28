import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users as usersTable } from '../../../shared/database/schema/users.js';

const authSchema = pgSchema('auth');

export const apiKeys = authSchema.table(
  'api_keys',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    keyId: uuid('key_id')
      .default(sql`uuid_generate_v7()`)
      .notNull()
      .unique(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 16 }).notNull(),
    ownerType: varchar('owner_type', { length: 16 }).notNull(),
    ownerId: uuid('owner_id').references(() => usersTable.userId, { onDelete: 'set null' }),
    secretHash: varchar('secret_hash', { length: 255 }).notNull(),
    previousSecretHash: varchar('previous_secret_hash', { length: 255 }),
    scopes: jsonb('scopes').notNull(),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    rotationGracePeriodDays: varchar('rotation_grace_period_days', { length: 3 })
      .notNull()
      .default('7'),
    rotationGraceEndsAt: timestamp('rotation_grace_ends_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => usersTable.userId, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    revokedBy: uuid('revoked_by').references(() => usersTable.userId, { onDelete: 'set null' }),
    revocationReason: text('revocation_reason'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    keyIdUnique: uniqueIndex('auth_api_keys_key_id_unique').on(table.keyId),
    tenantIdIdx: index('auth_api_keys_tenant_id_idx').on(table.tenantId),
    tenantKeyIdIdx: index('auth_api_keys_tenant_key_idx').on(table.tenantId, table.keyId),
    tenantNameIdx: index('auth_api_keys_tenant_name_idx').on(table.tenantId, table.name),
    statusIdx: index('auth_api_keys_status_idx').on(table.status),
    ownerIdIdx: index('auth_api_keys_owner_id_idx').on(table.ownerId),
    createdByIdx: index('auth_api_keys_created_by_idx').on(table.createdBy),
    revokedAtIdx: index('auth_api_keys_revoked_at_idx').on(table.revokedAt),
    expiresAtIdx: index('auth_api_keys_expires_at_idx').on(table.expiresAt),
    rotationGraceEndsAtIdx: index('auth_api_keys_rotation_grace_ends_at_idx').on(
      table.rotationGraceEndsAt,
    ),
    tenantOwnerTypeIdx: index('auth_api_keys_tenant_owner_type_idx').on(
      table.tenantId,
      table.ownerType,
    ),
  }),
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
