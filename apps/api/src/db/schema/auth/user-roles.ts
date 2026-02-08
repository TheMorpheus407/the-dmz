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

const authSchema = pgSchema('auth');

export const userRoles = authSchema.table(
  'user_roles',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id').notNull(),
    assignedBy: uuid('assigned_by'),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    scope: varchar('scope', { length: 255 }),
  },
  (table) => ({
    tenantUserRoleUnique: uniqueIndex('auth_user_roles_tenant_user_role_unique').on(
      table.tenantId,
      table.userId,
      table.roleId,
    ),
    tenantUserIdx: index('auth_user_roles_tenant_user_idx').on(table.tenantId, table.userId),
    tenantUserFk: foreignKey({
      name: 'user_roles_tenant_id_user_id_users_tenant_id_user_id_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    tenantRoleFk: foreignKey({
      name: 'user_roles_tenant_id_role_id_roles_tenant_id_id_fk',
      columns: [table.tenantId, table.roleId],
      foreignColumns: [roles.tenantId, roles.id],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    tenantAssignedByFk: foreignKey({
      name: 'user_roles_tenant_id_assigned_by_users_tenant_id_user_id_fk',
      columns: [table.tenantId, table.assignedBy],
      foreignColumns: [users.tenantId, users.userId],
    })
      .onDelete('set null')
      .onUpdate('no action'),
  }),
);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
