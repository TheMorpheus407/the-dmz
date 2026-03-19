import { sql } from 'drizzle-orm';
import {
  index,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  boolean,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const tenantAvatarRestrictions = socialSchema.table(
  'tenant_avatar_restrictions',
  {
    restrictionId: uuid('restriction_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    avatarId: varchar('avatar_id', { length: 36 }).notNull(),
    isAllowed: boolean('is_allowed').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => ({
    tenantAvatarUnique: uniqueIndex('tenant_avatar_restrictions_tenant_avatar_unique').on(
      table.tenantId,
      table.avatarId,
    ),
    tenantIdx: index('tenant_avatar_restrictions_tenant_idx').on(table.tenantId),
    avatarIdx: index('tenant_avatar_restrictions_avatar_idx').on(table.avatarId),
  }),
);

export type TenantAvatarRestriction = typeof tenantAvatarRestrictions.$inferSelect;
export type NewTenantAvatarRestriction = typeof tenantAvatarRestrictions.$inferInsert;
