import { eq, and, desc, sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  subscriptions,
  plans,
  seats,
  seatHistory,
  stripeCustomers,
  invoices,
  webhookEvents,
  type Subscription,
  type NewSubscription,
  type Plan,
  type NewPlan,
  type Seat,
  type NewSeat,
  type SeatHistory,
  type NewSeatHistory,
  type StripeCustomer,
  type NewStripeCustomer,
  type Invoice,
  type NewInvoice,
  type WebhookEvent,
  type NewWebhookEvent,
  type SubscriptionStatus,
} from '../../db/schema/billing/index.js';

import type { AppConfig } from '../../config.js';

export const billingRepo = {
  async getSubscriptionByTenantId(
    tenantId: string,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId),
    });
    return result ?? null;
  },

  async getSubscriptionById(
    subscriptionId: string,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscriptionId),
    });
    return result ?? null;
  },

  async createSubscription(data: NewSubscription, config?: AppConfig): Promise<Subscription> {
    const db = getDatabaseClient(config);
    const [result] = await db.insert(subscriptions).values(data).returning();
    if (!result) {
      throw new Error('Failed to create subscription');
    }
    return result;
  },

  async updateSubscription(
    subscriptionId: string,
    data: Partial<Subscription>,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    const db = getDatabaseClient(config);
    const [result] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();
    return result ?? null;
  },

  async updateSubscriptionByTenantId(
    tenantId: string,
    data: Partial<Subscription>,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    const db = getDatabaseClient(config);
    const [result] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.tenantId, tenantId))
      .returning();
    return result ?? null;
  },

  async getPlanById(planId: string, config?: AppConfig): Promise<Plan | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.plans.findFirst({
      where: eq(plans.id, planId),
    });
    return result ?? null;
  },

  async listActivePlans(config?: AppConfig): Promise<Plan[]> {
    const db = getDatabaseClient(config);
    return db.query.plans.findMany({
      where: eq(plans.isActive, true),
    });
  },

  async upsertPlan(data: NewPlan, config?: AppConfig): Promise<Plan> {
    const db = getDatabaseClient(config);
    const [result] = await db
      .insert(plans)
      .values(data)
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!result) {
      throw new Error('Failed to upsert plan');
    }
    return result;
  },

  async countSeats(tenantId: string, config?: AppConfig): Promise<number> {
    const db = getDatabaseClient(config);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(seats)
      .where(eq(seats.tenantId, tenantId));
    return result[0]?.count ?? 0;
  },

  async getSeat(tenantId: string, userId: string, config?: AppConfig): Promise<Seat | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.seats.findFirst({
      where: and(eq(seats.tenantId, tenantId), eq(seats.userId, userId)),
    });
    return result ?? null;
  },

  async allocateSeat(data: NewSeat, config?: AppConfig): Promise<Seat> {
    const db = getDatabaseClient(config);
    const [result] = await db.insert(seats).values(data).returning();
    if (!result) {
      throw new Error('Failed to allocate seat');
    }
    return result;
  },

  async deallocateSeat(tenantId: string, userId: string, config?: AppConfig): Promise<boolean> {
    const db = getDatabaseClient(config);
    const result = await db
      .delete(seats)
      .where(and(eq(seats.tenantId, tenantId), eq(seats.userId, userId)))
      .returning();
    return result.length > 0;
  },

  async recordSeatHistory(data: NewSeatHistory, config?: AppConfig): Promise<SeatHistory> {
    const db = getDatabaseClient(config);
    const [result] = await db.insert(seatHistory).values(data).returning();
    if (!result) {
      throw new Error('Failed to record seat history');
    }
    return result;
  },

  async getSeatHistory(
    tenantId: string,
    limit: number = 100,
    config?: AppConfig,
  ): Promise<SeatHistory[]> {
    const db = getDatabaseClient(config);
    return db.query.seatHistory.findMany({
      where: eq(seatHistory.tenantId, tenantId),
      orderBy: [desc(seatHistory.createdAt)],
      limit,
    });
  },

  async getStripeCustomerByTenantId(
    tenantId: string,
    config?: AppConfig,
  ): Promise<StripeCustomer | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.stripeCustomers.findFirst({
      where: eq(stripeCustomers.tenantId, tenantId),
    });
    return result ?? null;
  },

  async getStripeCustomerByStripeId(
    stripeCustomerId: string,
    config?: AppConfig,
  ): Promise<StripeCustomer | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.stripeCustomers.findFirst({
      where: eq(stripeCustomers.stripeCustomerId, stripeCustomerId),
    });
    return result ?? null;
  },

  async upsertStripeCustomer(data: NewStripeCustomer, config?: AppConfig): Promise<StripeCustomer> {
    const db = getDatabaseClient(config);
    const [result] = await db
      .insert(stripeCustomers)
      .values(data)
      .onConflictDoUpdate({
        target: stripeCustomers.tenantId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!result) {
      throw new Error('Failed to upsert stripe customer');
    }
    return result;
  },

  async updateStripeCustomer(
    stripeCustomerId: string,
    data: Partial<StripeCustomer>,
    config?: AppConfig,
  ): Promise<StripeCustomer | null> {
    const db = getDatabaseClient(config);
    const [result] = await db
      .update(stripeCustomers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId))
      .returning();
    return result ?? null;
  },

  async createInvoice(data: NewInvoice, config?: AppConfig): Promise<Invoice> {
    const db = getDatabaseClient(config);
    const [result] = await db.insert(invoices).values(data).returning();
    if (!result) {
      throw new Error('Failed to create invoice');
    }
    return result;
  },

  async getInvoiceByStripeId(stripeInvoiceId: string, config?: AppConfig): Promise<Invoice | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.invoices.findFirst({
      where: eq(invoices.stripeInvoiceId, stripeInvoiceId),
    });
    return result ?? null;
  },

  async listInvoices(tenantId: string, limit: number = 50, config?: AppConfig): Promise<Invoice[]> {
    const db = getDatabaseClient(config);
    return db.query.invoices.findMany({
      where: eq(invoices.tenantId, tenantId),
      orderBy: [desc(invoices.invoiceDate)],
      limit,
    });
  },

  async getWebhookEventByEventId(
    eventId: string,
    config?: AppConfig,
  ): Promise<WebhookEvent | null> {
    const db = getDatabaseClient(config);
    const result = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.eventId, eventId),
    });
    return result ?? null;
  },

  async recordWebhookEvent(data: NewWebhookEvent, config?: AppConfig): Promise<WebhookEvent> {
    const db = getDatabaseClient(config);
    const [result] = await db.insert(webhookEvents).values(data).returning();
    if (!result) {
      throw new Error('Failed to record webhook event');
    }
    return result;
  },

  async updateWebhookEvent(
    eventId: string,
    data: Partial<WebhookEvent>,
    config?: AppConfig,
  ): Promise<WebhookEvent | null> {
    const db = getDatabaseClient(config);
    const [result] = await db
      .update(webhookEvents)
      .set(data)
      .where(eq(webhookEvents.eventId, eventId))
      .returning();
    return result ?? null;
  },

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    return this.updateSubscription(subscriptionId, { status }, config);
  },
};
