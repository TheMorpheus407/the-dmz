import { sql } from 'drizzle-orm';
import { pgSchema, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

const authSchema = pgSchema('auth');

export const permissions = authSchema.table(
  'permissions',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    resource: varchar('resource', { length: 128 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    resourceActionUnique: uniqueIndex('auth_permissions_resource_action_unique').on(
      table.resource,
      table.action,
    ),
  }),
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
