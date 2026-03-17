import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from './tenants.js';

export const users = pgTable(
  'users',
  {
    userId: uuid('user_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 128 }),
    passwordHash: varchar('password_hash', { length: 255 }),
    role: varchar('role', { length: 32 }).notNull().default('learner'),
    isActive: boolean('is_active').notNull().default(true),
    scimId: varchar('scim_id', { length: 255 }),
    externalId: varchar('external_id', { length: 255 }),
    department: varchar('department', { length: 128 }),
    title: varchar('title', { length: 128 }),
    managerId: uuid('manager_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantEmailUnique: uniqueIndex('users_tenant_email_unique').on(table.tenantId, table.email),
    tenantUserIdUnique: uniqueIndex('users_tenant_user_id_unique').on(table.tenantId, table.userId),
    tenantIdIdx: index('users_tenant_id_idx').on(table.tenantId),
    scimIdIdx: index('users_scim_id_idx').on(table.scimId),
    externalIdIdx: index('users_external_id_idx').on(table.externalId),
    managerIdIdx: index('users_manager_id_idx').on(table.managerId),
  }),
);
