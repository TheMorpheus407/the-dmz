import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  jsonb,
  real,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

const lrsSchema = pgSchema('lrs');

export const scormPackages = lrsSchema.table(
  'scorm_packages',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    version: varchar('version', { length: 32 }).notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    checksumSha256: varchar('checksum_sha256', { length: 64 }),
    masteringScore: real('mastering_score'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('scorm_packages_tenant_id_idx').on(table.tenantId),
    tenantVersionIdx: index('scorm_packages_tenant_version_idx').on(table.tenantId, table.version),
  }),
);

export const scormRegistrations = lrsSchema.table(
  'scorm_registrations',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    packageId: uuid('package_id')
      .notNull()
      .references(() => scormPackages.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    regId: varchar('reg_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('in_progress'),
    score: real('score'),
    suspendData: text('suspend_data'),
    completionStatus: varchar('completion_status', { length: 32 }),
    successStatus: varchar('success_status', { length: 32 }),
    totalTime: integer('total_time').default(0),
    lastLaunchedAt: timestamp('last_launched_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    packageIdIdx: index('scorm_registrations_package_id_idx').on(table.packageId),
    tenantIdIdx: index('scorm_registrations_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('scorm_registrations_user_id_idx').on(table.userId),
    regIdUnique: uniqueIndex('scorm_registrations_reg_id_unique').on(table.regId),
    packageUserIdx: index('scorm_registrations_package_user_idx').on(table.packageId, table.userId),
  }),
);

export type ScormPackage = typeof scormPackages.$inferSelect;
export type NewScormPackage = typeof scormPackages.$inferInsert;
export type ScormRegistration = typeof scormRegistrations.$inferSelect;
export type NewScormRegistration = typeof scormRegistrations.$inferInsert;
