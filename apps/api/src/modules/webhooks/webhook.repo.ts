import { eq, and, desc, lt, asc, sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  webhookSubscriptions,
  webhookDeliveries,
  webhookCircuitBreakers,
  type WebhookSubscriptionDb,
  type NewWebhookSubscriptionDb,
  type WebhookDeliveryDb,
  type NewWebhookDeliveryDb,
  type WebhookCircuitBreakerDb,
  type NewWebhookCircuitBreakerDb,
} from '../../db/schema/webhooks.js';

const db = getDatabaseClient();

export class WebhookRepo {
  async createSubscription(data: NewWebhookSubscriptionDb): Promise<WebhookSubscriptionDb> {
    const [subscription] = await db.insert(webhookSubscriptions).values(data).returning();
    if (!subscription) {
      throw new Error('Failed to create webhook subscription');
    }
    return subscription;
  }

  async getSubscriptionById(
    tenantId: string,
    subscriptionId: string,
  ): Promise<WebhookSubscriptionDb | undefined> {
    const [subscription] = await db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.tenantId, tenantId),
          eq(webhookSubscriptions.id, subscriptionId),
        ),
      )
      .limit(1);
    return subscription;
  }

  async listSubscriptions(
    tenantId: string,
    options?: { status?: string; limit?: number; cursor?: string },
  ): Promise<{ subscriptions: WebhookSubscriptionDb[]; nextCursor?: string }> {
    const limit = options?.limit ?? 50;
    const conditions = [eq(webhookSubscriptions.tenantId, tenantId)];

    if (options?.status) {
      conditions.push(eq(webhookSubscriptions.status, options.status));
    }

    if (options?.cursor) {
      conditions.push(lt(webhookSubscriptions.createdAt, new Date(options.cursor)));
    }

    const subscriptions = await db
      .select()
      .from(webhookSubscriptions)
      .where(and(...conditions))
      .orderBy(desc(webhookSubscriptions.createdAt))
      .limit(limit + 1);

    let nextCursor: string | undefined;
    if (subscriptions.length > limit) {
      const lastItem = subscriptions[limit - 1];
      if (lastItem) {
        nextCursor = lastItem.createdAt.toISOString();
      }
      subscriptions.pop();
    }

    if (nextCursor) {
      return { subscriptions, nextCursor };
    }
    return { subscriptions };
  }

  async updateSubscription(
    tenantId: string,
    subscriptionId: string,
    data: Partial<NewWebhookSubscriptionDb>,
  ): Promise<WebhookSubscriptionDb | undefined> {
    const [subscription] = await db
      .update(webhookSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(webhookSubscriptions.tenantId, tenantId),
          eq(webhookSubscriptions.id, subscriptionId),
        ),
      )
      .returning();
    return subscription;
  }

  async deleteSubscription(tenantId: string, subscriptionId: string): Promise<boolean> {
    const result = await db
      .delete(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.tenantId, tenantId),
          eq(webhookSubscriptions.id, subscriptionId),
        ),
      )
      .returning({ id: webhookSubscriptions.id });
    return result.length > 0;
  }

  async getActiveSubscriptionsForEvent(
    tenantId: string,
    eventType: string,
  ): Promise<WebhookSubscriptionDb[]> {
    const subs = await db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(eq(webhookSubscriptions.tenantId, tenantId), eq(webhookSubscriptions.status, 'active')),
      );

    return subs.filter((sub: WebhookSubscriptionDb) => {
      const eventTypes = JSON.parse(sub.eventTypes) as string[];
      return eventTypes.includes(eventType);
    });
  }

  async createDelivery(data: NewWebhookDeliveryDb): Promise<WebhookDeliveryDb> {
    const [delivery] = await db.insert(webhookDeliveries).values(data).returning();
    if (!delivery) {
      throw new Error('Failed to create webhook delivery');
    }
    return delivery;
  }

  async getDeliveryById(
    tenantId: string,
    deliveryId: string,
  ): Promise<WebhookDeliveryDb | undefined> {
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.tenantId, tenantId), eq(webhookDeliveries.id, deliveryId)))
      .limit(1);
    return delivery;
  }

  async listDeliveries(
    tenantId: string,
    options?: { subscriptionId?: string; status?: string; limit?: number; cursor?: string },
  ): Promise<{ deliveries: WebhookDeliveryDb[]; nextCursor?: string }> {
    const limit = options?.limit ?? 50;
    const conditions = [eq(webhookDeliveries.tenantId, tenantId)];

    if (options?.subscriptionId) {
      conditions.push(eq(webhookDeliveries.subscriptionId, options.subscriptionId));
    }

    if (options?.status) {
      conditions.push(eq(webhookDeliveries.status, options.status));
    }

    if (options?.cursor) {
      conditions.push(lt(webhookDeliveries.createdAt, new Date(options.cursor)));
    }

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(and(...conditions))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit + 1);

    let nextCursor: string | undefined;
    if (deliveries.length > limit) {
      const lastItem = deliveries[limit - 1];
      if (lastItem) {
        nextCursor = lastItem.createdAt.toISOString();
      }
      deliveries.pop();
    }

    if (nextCursor) {
      return { deliveries, nextCursor };
    }
    return { deliveries };
  }

  async updateDelivery(
    tenantId: string,
    deliveryId: string,
    data: Partial<NewWebhookDeliveryDb>,
  ): Promise<WebhookDeliveryDb | undefined> {
    const [delivery] = await db
      .update(webhookDeliveries)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(webhookDeliveries.tenantId, tenantId), eq(webhookDeliveries.id, deliveryId)))
      .returning();
    return delivery;
  }

  async getPendingDeliveries(limit: number = 100): Promise<WebhookDeliveryDb[]> {
    const now = new Date();
    return db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, 'pending'),
          sql`(webhook_deliveries.next_attempt_at IS NULL OR webhook_deliveries.next_attempt_at < ${now})`,
        ),
      )
      .orderBy(asc(webhookDeliveries.nextAttemptAt))
      .limit(limit);
  }

  async getOrCreateCircuitBreaker(subscriptionId: string): Promise<WebhookCircuitBreakerDb> {
    let [breaker] = await db
      .select()
      .from(webhookCircuitBreakers)
      .where(eq(webhookCircuitBreakers.subscriptionId, subscriptionId))
      .limit(1);

    if (!breaker) {
      const [newBreaker] = await db
        .insert(webhookCircuitBreakers)
        .values({
          subscriptionId,
          totalRequests: 0,
          failedRequests: 0,
          consecutiveFailures: 0,
          isOpen: false,
        } as NewWebhookCircuitBreakerDb)
        .returning();
      if (!newBreaker) {
        throw new Error('Failed to create circuit breaker');
      }
      breaker = newBreaker;
    }

    return breaker;
  }

  async updateCircuitBreaker(
    subscriptionId: string,
    data: Partial<NewWebhookCircuitBreakerDb>,
  ): Promise<WebhookCircuitBreakerDb | undefined> {
    const [breaker] = await db
      .update(webhookCircuitBreakers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhookCircuitBreakers.subscriptionId, subscriptionId))
      .returning();
    return breaker;
  }
}

export const webhookRepo = new WebhookRepo();
