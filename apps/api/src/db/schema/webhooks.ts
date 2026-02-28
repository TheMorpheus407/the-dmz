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

import { tenants } from '../../shared/database/schema/tenants.js';

const integrationSchema = pgSchema('integration');

export const webhookSubscriptions = integrationSchema.table(
  'webhook_subscriptions',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    targetUrl: text('target_url').notNull(),
    eventTypes: text('event_types').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('test_pending'),
    secretHash: varchar('secret_hash', { length: 255 }).notNull(),
    filters: jsonb('filters'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true, mode: 'date' }),
    testPendingAt: timestamp('test_pending_at', { withTimezone: true, mode: 'date' }),
    failureDisabledAt: timestamp('failure_disabled_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    tenantIdIdx: index('integration_webhook_subscriptions_tenant_id_idx').on(table.tenantId),
    tenantStatusIdx: index('integration_webhook_subscriptions_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
    tenantNameIdx: index('integration_webhook_subscriptions_tenant_name_idx').on(
      table.tenantId,
      table.name,
    ),
  }),
);

export const webhookDeliveries = integrationSchema.table(
  'webhook_deliveries',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    targetUrl: text('target_url').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    attemptNumber: integer('attempt_number').notNull().default(1),
    maxAttempts: integer('max_attempts').notNull().default(5),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true, mode: 'date' }),
    responseStatusCode: integer('response_status_code'),
    responseBody: text('response_body'),
    errorMessage: text('error_message'),
    latencyMs: integer('latency_ms'),
    payload: jsonb('payload').notNull(),
    signatureHeaders: jsonb('signature_headers'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    subscriptionIdIdx: index('integration_webhook_deliveries_subscription_id_idx').on(
      table.subscriptionId,
    ),
    tenantIdIdx: index('integration_webhook_deliveries_tenant_id_idx').on(table.tenantId),
    eventIdIdx: index('integration_webhook_deliveries_event_id_idx').on(table.eventId),
    statusIdx: index('integration_webhook_deliveries_status_idx').on(table.status),
    nextAttemptIdx: index('integration_webhook_deliveries_next_attempt_idx').on(
      table.nextAttemptAt,
    ),
  }),
);

export const webhookCircuitBreakers = integrationSchema.table(
  'webhook_circuit_breakers',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: 'cascade' })
      .unique(),
    totalRequests: integer('total_requests').notNull().default(0),
    failedRequests: integer('failed_requests').notNull().default(0),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    isOpen: boolean('is_open').notNull().default(false),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'date' }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    subscriptionIdUnique: uniqueIndex(
      'integration_webhook_circuit_breakers_subscription_id_unique',
    ).on(table.subscriptionId),
  }),
);

export type WebhookSubscriptionDb = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscriptionDb = typeof webhookSubscriptions.$inferInsert;
export type WebhookDeliveryDb = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDeliveryDb = typeof webhookDeliveries.$inferInsert;
export type WebhookCircuitBreakerDb = typeof webhookCircuitBreakers.$inferSelect;
export type NewWebhookCircuitBreakerDb = typeof webhookCircuitBreakers.$inferInsert;
