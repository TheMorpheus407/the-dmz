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
  boolean,
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

export const xapiStatements = lrsSchema.table(
  'xapi_statements',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    statementId: varchar('statement_id', { length: 64 }).notNull(),
    statementVersion: varchar('statement_version', { length: 16 }).notNull().default('1.0.3'),
    actorMbox: varchar('actor_mbox', { length: 255 }).notNull(),
    actorName: varchar('actor_name', { length: 255 }).notNull(),
    verbId: varchar('verb_id', { length: 512 }).notNull(),
    verbDisplay: jsonb('verb_display').notNull(),
    objectId: varchar('object_id', { length: 512 }).notNull(),
    objectType: varchar('object_type', { length: 64 }).notNull().default('Activity'),
    objectName: varchar('object_name', { length: 255 }),
    objectDescription: text('object_description'),
    resultScore: real('result_score'),
    resultSuccess: boolean('result_success'),
    resultCompletion: boolean('result_completion'),
    resultDuration: integer('result_duration'),
    contextTenant: varchar('context_tenant', { length: 64 }),
    contextSession: varchar('context_session', { length: 64 }),
    contextCampaign: varchar('context_campaign', { length: 64 }),
    contextCampaignSession: varchar('context_campaign_session', { length: 64 }),
    contextExtensions: jsonb('context_extensions'),
    storedAt: timestamp('stored_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    lrsEndpoint: varchar('lrs_endpoint', { length: 512 }),
    lrsStatus: varchar('lrs_status', { length: 32 }).notNull().default('pending'),
    lrsError: text('lrs_error'),
    retryCount: integer('retry_count').notNull().default(0),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('xapi_statements_tenant_id_idx').on(table.tenantId),
    statementIdIdx: index('xapi_statements_statement_id_idx').on(table.statementId),
    lrsStatusIdx: index('xapi_statements_lrs_status_idx').on(table.lrsStatus),
    storedAtIdx: index('xapi_statements_stored_at_idx').on(table.storedAt),
  }),
);

export const xapiLrsConfig = lrsSchema.table(
  'xapi_lrs_config',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    endpoint: varchar('endpoint', { length: 512 }).notNull(),
    authKeyId: varchar('auth_key_id', { length: 255 }).notNull(),
    authSecretEncrypted: text('auth_secret_encrypted').notNull(),
    version: varchar('version', { length: 16 }).notNull().default('1.0.3'),
    enabled: boolean('enabled').notNull().default(true),
    batchingEnabled: boolean('batching_enabled').notNull().default(true),
    batchSize: integer('batch_size').notNull().default(10),
    retryMaxAttempts: integer('retry_max_attempts').notNull().default(3),
    retryBaseDelayMs: integer('retry_base_delay_ms').notNull().default(1000),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('xapi_lrs_config_tenant_id_idx').on(table.tenantId),
    enabledIdx: index('xapi_lrs_config_enabled_idx').on(table.enabled),
  }),
);

export type XapiStatement = typeof xapiStatements.$inferSelect;
export type NewXapiStatement = typeof xapiStatements.$inferInsert;
export type XapiLrsConfig = typeof xapiLrsConfig.$inferSelect;
export type NewXapiLrsConfig = typeof xapiLrsConfig.$inferInsert;
