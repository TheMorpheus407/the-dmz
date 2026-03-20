import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const retentionSchema = pgSchema('retention');

export const dataCategories = [
  'events',
  'sessions',
  'analytics',
  'audit_logs',
  'user_data',
  'chat_messages',
] as const;
export type DataCategory = (typeof dataCategories)[number];

export const actionOnExpiryOptions = ['archive', 'delete', 'anonymize'] as const;
export type ActionOnExpiry = (typeof actionOnExpiryOptions)[number];

export const retentionPolicies = retentionSchema.table(
  'retention_policies',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    dataCategory: varchar('data_category', { length: 32 }).notNull(),
    retentionDays: integer('retention_days').notNull().default(365),
    actionOnExpiry: varchar('action_on_expiry', { length: 32 }).notNull().default('archive'),
    legalHold: integer('legal_hold').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => ({
    tenantIdCategoryUnique: uniqueIndex('retention_policies_tenant_category_unique_idx').on(
      table.tenantId,
      table.dataCategory,
    ),
    tenantIdIdx: index('retention_policies_tenant_idx').on(table.tenantId),
  }),
);

export const archivedData = retentionSchema.table(
  'archived_data',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    dataCategory: varchar('data_category', { length: 32 }).notNull(),
    originalId: uuid('original_id').notNull(),
    archiveData: jsonb('archive_data').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    compressed: integer('compressed').notNull().default(1),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    retrievedAt: timestamp('retrieved_at', { withTimezone: true, mode: 'date' }),
    retrievalCount: integer('retrieval_count').notNull().default(0),
  },
  (table) => ({
    tenantIdIdx: index('archived_data_tenant_idx').on(table.tenantId),
    originalIdIdx: index('archived_data_original_id_idx').on(table.originalId),
    categoryTenantIdx: index('archived_data_category_tenant_idx').on(
      table.dataCategory,
      table.tenantId,
    ),
    expiresAtIdx: index('archived_data_expires_at_idx').on(table.expiresAt),
  }),
);

export const retentionJobLog = retentionSchema.table(
  'retention_job_log',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    dataCategory: varchar('data_category', { length: 32 }).notNull(),
    jobType: varchar('job_type', { length: 32 }).notNull(),
    recordsProcessed: integer('records_processed').notNull().default(0),
    recordsArchived: integer('records_archived').notNull().default(0),
    recordsDeleted: integer('records_deleted').notNull().default(0),
    recordsAnonymized: integer('records_anonymized').notNull().default(0),
    errors: jsonb('errors').notNull().default([]),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    tenantIdIdx: index('retention_job_log_tenant_idx').on(table.tenantId),
    startedAtIdx: index('retention_job_log_started_at_idx').on(table.startedAt),
    categoryTenantIdx: index('retention_job_log_category_tenant_idx').on(
      table.dataCategory,
      table.tenantId,
    ),
  }),
);

export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type NewRetentionPolicy = typeof retentionPolicies.$inferInsert;
export type ArchivedData = typeof archivedData.$inferSelect;
export type NewArchivedData = typeof archivedData.$inferInsert;
export type RetentionJobLog = typeof retentionJobLog.$inferSelect;
export type NewRetentionJobLog = typeof retentionJobLog.$inferInsert;

export const DEFAULT_RETENTION_DAYS: Record<DataCategory, number> = {
  events: 365,
  sessions: 365,
  analytics: 730,
  audit_logs: 2555,
  user_data: -1,
  chat_messages: 30,
};

export const MIN_AUDIT_RETENTION_DAYS = 2555;

export const FRAMEWORK_RETENTION_DAYS: Record<string, Record<DataCategory, number>> = {
  HIPAA: {
    events: 2190,
    sessions: 2190,
    analytics: 2190,
    audit_logs: 2190,
    user_data: 2190,
    chat_messages: 2190,
  },
  SOX: {
    events: 2555,
    sessions: 2555,
    analytics: 2555,
    audit_logs: 2555,
    user_data: 2555,
    chat_messages: 2555,
  },
  FedRAMP: {
    events: 1095,
    sessions: 1095,
    analytics: 1095,
    audit_logs: 1095,
    user_data: 1095,
    chat_messages: 1095,
  },
  DORA: {
    events: 1825,
    sessions: 1825,
    analytics: 1825,
    audit_logs: 1825,
    user_data: 1825,
    chat_messages: 1825,
  },
  GDPR: {
    events: 365,
    sessions: 365,
    analytics: 730,
    audit_logs: 2555,
    user_data: -1,
    chat_messages: 30,
  },
  'PCI-DSS': {
    events: 1095,
    sessions: 1095,
    analytics: 1095,
    audit_logs: 1460,
    user_data: 365,
    chat_messages: 1095,
  },
};
