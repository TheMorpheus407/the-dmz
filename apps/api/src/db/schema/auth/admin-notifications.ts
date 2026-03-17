import { sql } from 'drizzle-orm';
import { index, jsonb, pgSchema, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

const authSchema = pgSchema('auth');

export const adminNotifications = authSchema.table(
  'admin_notifications',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'restrict' }),
    notificationType: varchar('notification_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: varchar('message', { length: 1000 }).notNull(),
    metadata: jsonb('metadata'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    tenantIdIdx: index('admin_notifications_tenant_id_idx').on(table.tenantId),
    adminUserIdIdx: index('admin_notifications_admin_user_id_idx').on(table.adminUserId),
    isReadIdx: index('admin_notifications_is_read_idx').on(table.isRead),
    createdAtIdx: index('admin_notifications_created_at_idx').on(table.createdAt),
  }),
);
