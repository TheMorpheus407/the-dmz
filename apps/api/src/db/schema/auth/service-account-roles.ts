import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

import { roles } from './roles.js';
import { serviceAccounts } from './service-accounts.js';

const authSchema = pgSchema('auth');

export const serviceAccountRoles = authSchema.table(
  'service_account_roles',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    serviceAccountId: uuid('service_account_id').notNull(),
    roleId: uuid('role_id').notNull(),
    assignedBy: uuid('assigned_by'),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    scope: varchar('scope', { length: 255 }),
  },
  (table) => ({
    tenantServiceRoleUnique: uniqueIndex(
      'auth_service_account_roles_tenant_service_role_unique',
    ).on(table.tenantId, table.serviceAccountId, table.roleId),
    tenantServiceIdx: index('auth_service_account_roles_tenant_service_idx').on(
      table.tenantId,
      table.serviceAccountId,
    ),
    tenantRoleIdx: index('auth_service_account_roles_tenant_role_idx').on(
      table.tenantId,
      table.roleId,
    ),
    serviceAccountFk: foreignKey({
      name: 'service_account_roles_service_account_fk',
      columns: [table.serviceAccountId],
      foreignColumns: [serviceAccounts.id],
    }).onDelete('cascade'),
    roleFk: foreignKey({
      name: 'service_account_roles_role_fk',
      columns: [table.roleId],
      foreignColumns: [roles.id],
    }).onDelete('restrict'),
    assignedByFk: foreignKey({
      name: 'service_account_roles_assigned_by_fk',
      columns: [table.assignedBy],
      foreignColumns: [users.userId],
    }).onDelete('set null'),
  }),
);

export type ServiceAccountRole = typeof serviceAccountRoles.$inferSelect;
export type NewServiceAccountRole = typeof serviceAccountRoles.$inferInsert;
