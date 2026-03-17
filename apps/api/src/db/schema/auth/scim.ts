import { sql } from 'drizzle-orm';
import {
  boolean,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

import { roles } from './roles.js';

const authSchema = pgSchema('auth');

export const scimTokens = authSchema.table(
  'scim_tokens',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    scopes: text('scopes').array().notNull().default(['scim.read', 'scim.write']),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
    isRevoked: boolean('is_revoked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantNameUnique: uniqueIndex('auth_scim_tokens_tenant_name_unique').on(
      table.tenantId,
      table.name,
    ),
    tokenHashIdx: uniqueIndex('auth_scim_tokens_token_hash_idx').on(table.tokenHash),
  }),
);

export type ScimToken = typeof scimTokens.$inferSelect;
export type NewScimToken = typeof scimTokens.$inferInsert;

export const scimGroups = authSchema.table(
  'scim_groups',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    scimId: varchar('scim_id', { length: 255 }),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    externalId: varchar('external_id', { length: 255 }),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantDisplayNameUnique: uniqueIndex('auth_scim_groups_tenant_display_name_unique').on(
      table.tenantId,
      table.displayName,
    ),
  }),
);

export type ScimGroup = typeof scimGroups.$inferSelect;
export type NewScimGroup = typeof scimGroups.$inferInsert;

export const scimGroupMembers = authSchema.table(
  'scim_group_members',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    scimGroupId: uuid('scim_group_id')
      .notNull()
      .references(() => scimGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    scimUserId: varchar('scim_user_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    groupUserUnique: uniqueIndex('auth_scim_group_members_group_user_unique').on(
      table.scimGroupId,
      table.userId,
    ),
  }),
);

export type ScimGroupMember = typeof scimGroupMembers.$inferSelect;
export type NewScimGroupMember = typeof scimGroupMembers.$inferInsert;

export const scimSyncLogs = authSchema.table(
  'scim_sync_logs',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    syncType: varchar('sync_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    usersCreated: integer('users_created').notNull().default(0),
    usersUpdated: integer('users_updated').notNull().default(0),
    usersDeleted: integer('users_deleted').notNull().default(0),
    groupsCreated: integer('groups_created').notNull().default(0),
    groupsUpdated: integer('groups_updated').notNull().default(0),
    groupsDeleted: integer('groups_deleted').notNull().default(0),
    errors: jsonb('errors'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    tenantIdIdx: uniqueIndex('auth_scim_sync_logs_tenant_id_idx').on(table.tenantId),
    startedAtIdx: uniqueIndex('auth_scim_sync_logs_started_at_idx').on(table.startedAt),
  }),
);

export type ScimSyncLog = typeof scimSyncLogs.$inferSelect;
export type NewScimSyncLog = typeof scimSyncLogs.$inferInsert;
