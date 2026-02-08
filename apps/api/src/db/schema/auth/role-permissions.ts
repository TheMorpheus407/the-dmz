import { pgSchema, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { permissions } from './permissions.js';
import { roles } from './roles.js';

const authSchema = pgSchema('auth');

export const rolePermissions = authSchema.table(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    rolePermissionPk: primaryKey({
      name: 'auth_role_permissions_role_id_permission_id_pk',
      columns: [table.roleId, table.permissionId],
    }),
  }),
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
