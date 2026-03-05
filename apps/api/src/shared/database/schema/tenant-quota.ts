import { pgTable, timestamp, uuid, varchar, text, jsonb } from 'drizzle-orm/pg-core';

export const tenantQuotaOverrides = pgTable('tenant_quota_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  tier: varchar('tier', { length: 20 }).notNull(),
  requestsPerMinute: varchar('requests_per_minute').notNull(),
  requestsPerHour: varchar('requests_per_hour').notNull(),
  burstLimit: varchar('burst_limit').notNull(),
  credentialClasses: jsonb('credential_classes').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  requestedBy: uuid('requested_by').notNull(),
  approvedBy: uuid('approved_by'),
  requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true, mode: 'date' }).notNull(),
  effectiveUntil: timestamp('effective_until', { withTimezone: true, mode: 'date' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  revokedBy: uuid('revoked_by'),
  reason: text('reason'),
  policyVersion: varchar('policy_version', { length: 20 }).notNull().default('1.0.0'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const tenantQuotaAuditLogs = pgTable('tenant_quota_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  overrideId: uuid('override_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  actorId: uuid('actor_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  reason: text('reason'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
