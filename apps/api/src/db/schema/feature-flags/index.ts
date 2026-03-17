import { sql } from 'drizzle-orm';
import {
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const featureFlagsSchema = pgSchema('feature_flags');

export const featureFlags = featureFlagsSchema.table(
  'flags',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    key: varchar('key', { length: 128 }).notNull(),
    enabledByDefault: boolean('enabled_by_default').notNull().default(false),
    rolloutPercentage: integer('rollout_percentage').notNull().default(0),
    tenantOverrides: jsonb('tenant_overrides'),
    userSegments: jsonb('user_segments'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('feature_flags_tenant_id_idx').on(table.tenantId),
    tenantKeyUnique: uniqueIndex('feature_flags_tenant_key_unique').on(table.tenantId, table.key),
    tenantActiveIdx: index('feature_flags_tenant_active_idx').on(table.tenantId, table.isActive),
  }),
);

export const featureFlagOverrides = featureFlagsSchema.table(
  'tenant_overrides',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    flagId: uuid('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull(),
    rolloutPercentage: integer('rollout_percentage'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    flagIdIdx: index('feature_flag_overrides_flag_id_idx').on(table.flagId),
    tenantIdIdx: index('feature_flag_overrides_tenant_id_idx').on(table.tenantId),
    flagTenantUnique: uniqueIndex('feature_flag_overrides_flag_tenant_unique').on(
      table.flagId,
      table.tenantId,
    ),
  }),
);

export const abTestAssignments = featureFlagsSchema.table(
  'ab_test_assignments',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    flagId: uuid('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    variant: varchar('variant', { length: 32 }).notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    convertedAt: timestamp('converted_at', { withTimezone: true, mode: 'date' }),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    flagIdIdx: index('ab_test_assignments_flag_id_idx').on(table.flagId),
    userIdIdx: index('ab_test_assignments_user_id_idx').on(table.userId),
    tenantIdIdx: index('ab_test_assignments_tenant_id_idx').on(table.tenantId),
    userFlagUnique: uniqueIndex('ab_test_assignments_user_flag_unique').on(
      table.userId,
      table.flagId,
    ),
  }),
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;
export type NewFeatureFlagOverride = typeof featureFlagOverrides.$inferInsert;
export type ABTestAssignment = typeof abTestAssignments.$inferSelect;
export type NewABTestAssignment = typeof abTestAssignments.$inferInsert;
