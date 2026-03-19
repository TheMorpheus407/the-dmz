import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

export const subscriptionStatuses = [
  'trial',
  'active',
  'suspended',
  'cancelled',
  'past_due',
  'expired',
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const billingSchema = pgSchema('billing');

export const subscriptions = billingSchema.table(
  'subscriptions',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    planId: varchar('plan_id', { length: 32 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('trial'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true, mode: 'date' }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true, mode: 'date' }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, mode: 'date' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    seatLimit: integer('seat_limit').notNull().default(-1),
    overagePolicy: varchar('overage_policy', { length: 16 }).notNull().default('deny'),
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('subscriptions_tenant_id_idx').on(table.tenantId),
    tenantStatusIdx: index('subscriptions_tenant_status_idx').on(table.tenantId, table.status),
    tenantPlanIdx: index('subscriptions_tenant_plan_idx').on(table.tenantId, table.planId),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export const plans = billingSchema.table(
  'plans',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    description: varchar('description', { length: 255 }),
    seatLimit: integer('seat_limit').notNull().default(-1),
    apiRateLimit: integer('api_rate_limit').notNull().default(-1),
    storageGb: integer('storage_gb').notNull().default(-1),
    features: jsonb('features')
      .notNull()
      .default(sql`'{}'::jsonb`),
    trialDays: integer('trial_days').notNull().default(14),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index('plans_active_idx').on(table.isActive),
  }),
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

export const seats = billingSchema.table(
  'seats',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    allocatedAt: timestamp('allocated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    allocatedBy: uuid('allocated_by'),
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  },
  (table) => ({
    tenantIdIdx: index('seats_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('seats_user_id_idx').on(table.userId),
    tenantUserUnique: uniqueIndex('seats_tenant_user_unique').on(table.tenantId, table.userId),
  }),
);

export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;

export const seatHistory = billingSchema.table(
  'seat_history',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id'),
    action: varchar('action', { length: 32 }).notNull(),
    seatsDelta: integer('seats_delta').notNull(),
    seatLimitAtAction: integer('seat_limit_at_action'),
    reason: varchar('reason', { length: 255 }),
    performedBy: uuid('performed_by'),
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('seat_history_tenant_id_idx').on(table.tenantId),
    createdAtIdx: index('seat_history_created_at_idx').on(table.createdAt),
  }),
);

export type SeatHistory = typeof seatHistory.$inferSelect;
export type NewSeatHistory = typeof seatHistory.$inferInsert;

export const stripeCustomers = billingSchema.table(
  'stripe_customers',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull().unique(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    email: varchar('email', { length: 255 }),
    name: varchar('name', { length: 255 }),
    defaultPaymentMethodId: varchar('default_payment_method_id', { length: 255 }),
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('stripe_customers_tenant_id_idx').on(table.tenantId),
    stripeCustomerIdIdx: index('stripe_customers_stripe_customer_id_idx').on(
      table.stripeCustomerId,
    ),
    stripeSubscriptionIdIdx: index('stripe_customers_stripe_subscription_id_idx').on(
      table.stripeSubscriptionId,
    ),
  }),
);

export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type NewStripeCustomer = typeof stripeCustomers.$inferInsert;

export const invoices = billingSchema.table(
  'invoices',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).notNull().unique(),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    amountDue: integer('amount_due').notNull(),
    amountPaid: integer('amount_paid').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('usd'),
    status: varchar('status', { length: 32 }).notNull(),
    invoiceDate: timestamp('invoice_date', { withTimezone: true, mode: 'date' }),
    dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
    billingReason: varchar('billing_reason', { length: 64 }),
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('invoices_tenant_id_idx').on(table.tenantId),
    stripeInvoiceIdIdx: index('invoices_stripe_invoice_id_idx').on(table.stripeInvoiceId),
    statusIdx: index('invoices_status_idx').on(table.status),
    invoiceDateIdx: index('invoices_invoice_date_idx').on(table.invoiceDate),
  }),
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export const webhookEvents = billingSchema.table(
  'webhook_events',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    eventId: varchar('event_id', { length: 255 }).notNull().unique(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    payload: jsonb('payload')
      .notNull()
      .default(sql`'{}'::jsonb`),
    processingResult: varchar('processing_result', { length: 32 }),
    errorMessage: text('error_message'),
  },
  (table) => ({
    eventIdIdx: index('webhook_events_event_id_idx').on(table.eventId),
    processedAtIdx: index('webhook_events_processed_at_idx').on(table.processedAt),
  }),
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
