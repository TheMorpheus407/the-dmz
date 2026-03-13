import { sql } from 'drizzle-orm';
import { foreignKey, index, pgSchema, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

const authSchema = pgSchema('auth');

export const backupCodes = authSchema.table(
  'backup_codes',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    userTenantIdx: index('auth_backup_codes_user_tenant_idx').on(table.userId, table.tenantId),
    userTenantFk: foreignKey({
      name: 'backup_codes_tenant_id_user_id_users_tenant_id_user_id_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
  }),
);

export type BackupCode = typeof backupCodes.$inferSelect;
export type NewBackupCode = typeof backupCodes.$inferInsert;
