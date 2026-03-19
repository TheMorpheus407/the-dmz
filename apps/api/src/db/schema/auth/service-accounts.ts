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
import { users } from '../../../shared/database/schema/users.js';

const authSchema = pgSchema('auth');

export const serviceAccounts = authSchema.table(
  'service_accounts',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    serviceId: uuid('service_id')
      .default(sql`uuid_generate_v7()`)
      .notNull()
      .unique(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    ownerId: uuid('owner_id'),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.userId, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    serviceIdUnique: uniqueIndex('auth_service_accounts_service_id_unique').on(table.serviceId),
    tenantIdIdx: index('auth_service_accounts_tenant_id_idx').on(table.tenantId),
    tenantNameIdx: index('auth_service_accounts_tenant_name_idx').on(table.tenantId, table.name),
    statusIdx: index('auth_service_accounts_status_idx').on(table.status),
  }),
);

export type ServiceAccount = typeof serviceAccounts.$inferSelect;
export type NewServiceAccount = typeof serviceAccounts.$inferInsert;
