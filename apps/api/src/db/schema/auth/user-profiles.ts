import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

const authSchema = pgSchema('auth');

export const userProfiles = authSchema.table(
  'user_profiles',
  {
    profileId: uuid('profile_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('UTC'),
    accessibilitySettings: jsonb('accessibility_settings').notNull().default({}),
    notificationSettings: jsonb('notification_settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantUserUnique: uniqueIndex('auth_user_profiles_tenant_user_unique').on(
      table.tenantId,
      table.userId,
    ),
    tenantIdx: index('auth_user_profiles_tenant_idx').on(table.tenantId),
    userIdx: index('auth_user_profiles_user_idx').on(table.userId),
    tenantUserFk: foreignKey({
      name: 'user_profiles_tenant_id_user_id_users_tenant_id_user_id_fk',
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
  }),
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
