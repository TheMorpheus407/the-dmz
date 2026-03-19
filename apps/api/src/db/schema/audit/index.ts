import { sql } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const auditSchema = pgSchema('audit');

const SEED_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export const auditLogs = auditSchema.table(
  'logs',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    userEmail: varchar('user_email', { length: 255 }),
    action: varchar('action', { length: 128 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceId: uuid('resource_id'),
    ipAddress: varchar('ip_address', { length: 45 }),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    metadata: jsonb('metadata'),
    previousHash: varchar('previous_hash', { length: 64 }).notNull().default(SEED_HASH),
    hash: varchar('hash', { length: 64 }).notNull(),
    partitionMonth: varchar('partition_month', { length: 7 }).notNull(),
    correlationId: uuid('correlation_id'),
    userAgent: varchar('user_agent', { length: 512 }),
  },
  (table) => ({
    tenantIdPartitionMonth: uniqueIndex('audit_logs_tenant_partition_idx').on(
      table.tenantId,
      table.partitionMonth,
    ),
    tenantIdTimestamp: uniqueIndex('audit_logs_tenant_timestamp_idx').on(
      table.tenantId,
      table.timestamp,
      table.id,
    ),
    tenantIdAction: uniqueIndex('audit_logs_tenant_action_idx').on(table.tenantId, table.action),
    tenantIdUserId: uniqueIndex('audit_logs_tenant_user_idx').on(table.tenantId, table.userId),
    tenantIdResource: uniqueIndex('audit_logs_tenant_resource_idx').on(
      table.tenantId,
      table.resourceType,
      table.resourceId,
    ),
  }),
);

export const auditRetentionConfig = auditSchema.table(
  'retention_config',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' })
      .unique(),
    retentionYears: integer('retention_years').notNull().default(7),
    framework: varchar('framework', { length: 64 }),
    legalHold: integer('legal_hold').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdUnique: uniqueIndex('audit_retention_config_tenant_unique_idx').on(table.tenantId),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditRetentionConfig = typeof auditRetentionConfig.$inferSelect;
export type NewAuditRetentionConfig = typeof auditRetentionConfig.$inferInsert;
