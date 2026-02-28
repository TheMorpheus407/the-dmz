import { randomUUID, createHmac, timingSafeEqual } from 'crypto';

import {
  WebhookSubscriptionStatus,
  type WebhookDeliveryStatus,
  type WebhookEventType,
  WEBHOOK_REPLAY_WINDOW_MS,
  WEBHOOK_DEFAULT_MAX_ATTEMPTS,
  WEBHOOK_RETRY_DELAYS_MS,
  type WebhookSubscription,
  type WebhookDelivery,
  type WebhookEventEnvelope,
  type WebhookTestResult,
} from '@the-dmz/shared/contracts';

import { webhookRepo } from './webhook.repo.js';
import {
  WebhookSubscriptionNotFoundError,
  WebhookSubscriptionInvalidStatusError,
  WebhookCircuitBreakerOpenError,
  WebhookDeliveryFailedError,
  WebhookDeliveryMaxRetriesExceededError,
  WebhookSignatureInvalidError,
  WebhookSignatureExpiredError,
} from './webhook.errors.js';

import type {
  WebhookSubscriptionDb,
  WebhookDeliveryDb,
  NewWebhookDeliveryDb,
  NewWebhookSubscriptionDb,
} from '../../db/schema/webhooks.js';

interface SubscriptionUpdateData {
  name?: string;
  targetUrl?: string;
  eventTypes?: string;
  filters?: Record<string, unknown> | null;
  status?: string;
  disabledAt?: Date | null;
  failureDisabledAt?: Date | null;
  testPendingAt?: Date | null;
}

export class WebhookService {
  private secretCache = new Map<string, string>();

  async createSubscription(
    tenantId: string,
    data: {
      name: string;
      targetUrl: string;
      eventTypes: string[];
      filters?: Record<string, unknown>;
    },
  ): Promise<WebhookSubscription> {
    const generatedSecret = this.generateSecret();
    const secretHash = this.hashSecret(generatedSecret);

    const subscription = await webhookRepo.createSubscription({
      tenantId,
      name: data.name,
      targetUrl: data.targetUrl,
      eventTypes: JSON.stringify(data.eventTypes),
      status: 'test_pending',
      secretHash,
      filters: data.filters ?? null,
      testPendingAt: new Date(),
    });

    this.secretCache.set(subscription.id, generatedSecret);

    return this.mapDbToSubscription(subscription);
  }

  async getSubscription(tenantId: string, subscriptionId: string): Promise<WebhookSubscription> {
    const subscription = await webhookRepo.getSubscriptionById(tenantId, subscriptionId);

    if (!subscription) {
      throw new WebhookSubscriptionNotFoundError(subscriptionId);
    }

    return this.mapDbToSubscription(subscription);
  }

  async listSubscriptions(
    tenantId: string,
    options?: { status?: string; limit?: number; cursor?: string },
  ): Promise<{ subscriptions: WebhookSubscription[]; nextCursor?: string }> {
    const result = await webhookRepo.listSubscriptions(tenantId, options);

    const subs = result.subscriptions.map((s) => this.mapDbToSubscription(s));

    if (result.nextCursor) {
      return { subscriptions: subs, nextCursor: result.nextCursor };
    }
    return { subscriptions: subs };
  }

  async updateSubscription(
    tenantId: string,
    subscriptionId: string,
    data: {
      name?: string;
      targetUrl?: string;
      eventTypes?: string[];
      filters?: Record<string, unknown>;
      status?: WebhookSubscriptionStatus;
    },
  ): Promise<WebhookSubscription> {
    const subscription = await webhookRepo.getSubscriptionById(tenantId, subscriptionId);

    if (!subscription) {
      throw new WebhookSubscriptionNotFoundError(subscriptionId);
    }

    const updateData: SubscriptionUpdateData = {};

    if (data.name) updateData.name = data.name;
    if (data.targetUrl) updateData.targetUrl = data.targetUrl;
    if (data.eventTypes) updateData.eventTypes = JSON.stringify(data.eventTypes);
    if (data.filters !== undefined) updateData.filters = data.filters;
    if (data.status) {
      updateData.status = data.status;
      if (data.status === WebhookSubscriptionStatus.DISABLED) {
        updateData.disabledAt = new Date();
      } else if (data.status === WebhookSubscriptionStatus.ACTIVE) {
        updateData.disabledAt = null;
        updateData.failureDisabledAt = null;
      } else if (data.status === WebhookSubscriptionStatus.TEST_PENDING) {
        updateData.testPendingAt = new Date();
      }
    }

    const updated = await webhookRepo.updateSubscription(
      tenantId,
      subscriptionId,
      updateData as Partial<NewWebhookSubscriptionDb>,
    );

    if (!updated) {
      throw new WebhookSubscriptionNotFoundError(subscriptionId);
    }

    return this.mapDbToSubscription(updated);
  }

  async deleteSubscription(tenantId: string, subscriptionId: string): Promise<void> {
    const deleted = await webhookRepo.deleteSubscription(tenantId, subscriptionId);

    if (!deleted) {
      throw new WebhookSubscriptionNotFoundError(subscriptionId);
    }

    this.secretCache.delete(subscriptionId);
  }

  async testSubscription(tenantId: string, subscriptionId: string): Promise<WebhookTestResult> {
    const subscription = await webhookRepo.getSubscriptionById(tenantId, subscriptionId);

    if (!subscription) {
      throw new WebhookSubscriptionNotFoundError(subscriptionId);
    }

    const breaker = await webhookRepo.getOrCreateCircuitBreaker(subscriptionId);

    if (breaker.isOpen) {
      throw new WebhookCircuitBreakerOpenError(subscriptionId);
    }

    const testPayload = this.createTestEventPayload(subscription.id, subscription.tenantId);
    const signingSecret = this.secretCache.get(subscriptionId) ?? subscription.secretHash;
    const signature = this.generateSignature(testPayload, signingSecret);

    const signatureHeaders: Record<string, string> = {
      'x-dmz-webhook-id': testPayload.eventId,
      'x-dmz-webhook-timestamp': testPayload.occurredAt,
      'x-dmz-webhook-signature': `v1=${signature}`,
    };

    const result = await this.deliverWebhook(subscription.targetUrl, testPayload, signatureHeaders);

    if (result.success) {
      await webhookRepo.updateSubscription(tenantId, subscriptionId, {
        status: 'active',
        testPendingAt: null,
      } as Partial<NewWebhookSubscriptionDb>);
    }

    const testResult: WebhookTestResult = {
      success: result.success,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      signatureValid: true,
    };

    if (result.errorMessage) {
      testResult.errorMessage = result.errorMessage;
    }

    return testResult;
  }

  async listDeliveries(
    tenantId: string,
    options?: { subscriptionId?: string; status?: string; limit?: number; cursor?: string },
  ): Promise<{ deliveries: WebhookDelivery[]; nextCursor?: string }> {
    const result = await webhookRepo.listDeliveries(tenantId, options);

    const dels = result.deliveries.map((d) => this.mapDbToDelivery(d));

    if (result.nextCursor) {
      return { deliveries: dels, nextCursor: result.nextCursor };
    }
    return { deliveries: dels };
  }

  async getDelivery(tenantId: string, deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await webhookRepo.getDeliveryById(tenantId, deliveryId);

    if (!delivery) {
      throw new WebhookDeliveryFailedError(deliveryId, 'Delivery not found');
    }

    return this.mapDbToDelivery(delivery);
  }

  async queueEvent(
    tenantId: string,
    eventType: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    const subscriptions = await webhookRepo.getActiveSubscriptionsForEvent(tenantId, eventType);

    for (const subscription of subscriptions) {
      await this.queueDelivery(subscription, eventType, data);
    }
  }

  async processDelivery(
    deliveryId: string,
    subscriptionId: string,
    tenantId: string,
    targetUrl: string,
    payload: Record<string, unknown>,
    eventId: string,
    _eventType: string,
    attemptNumber: number,
    maxAttempts: number,
  ): Promise<{ success: boolean; statusCode?: number; errorMessage?: string; latencyMs?: number }> {
    const breaker = await webhookRepo.getOrCreateCircuitBreaker(subscriptionId);

    if (breaker.isOpen) {
      throw new WebhookCircuitBreakerOpenError(subscriptionId);
    }

    const subscription = await webhookRepo.getSubscriptionById(tenantId, subscriptionId);

    if (!subscription || subscription.status !== 'active') {
      throw new WebhookSubscriptionInvalidStatusError(subscription?.status ?? 'unknown');
    }

    const signingSecret = this.secretCache.get(subscriptionId) ?? subscription.secretHash;
    const signature = this.generateSignature(payload, signingSecret);

    const signatureHeaders: Record<string, string> = {
      'x-dmz-webhook-id': eventId,
      'x-dmz-webhook-timestamp': new Date().toISOString(),
      'x-dmz-webhook-signature': `v1=${signature}`,
    };

    await webhookRepo.updateDelivery(tenantId, deliveryId, {
      status: 'in_progress',
      lastAttemptAt: new Date(),
      signatureHeaders: JSON.stringify(signatureHeaders),
    } as Partial<NewWebhookDeliveryDb>);

    const result = await this.deliverWebhook(targetUrl, payload, signatureHeaders);

    const updateData: Partial<NewWebhookDeliveryDb> = {
      status: result.success ? 'success' : attemptNumber >= maxAttempts ? 'dlq' : 'failed',
      responseStatusCode: result.statusCode ?? null,
      responseBody: result.responseBody ?? null,
      latencyMs: result.latencyMs ?? null,
    };

    if (result.errorMessage) {
      updateData.errorMessage = result.errorMessage;
    } else {
      updateData.errorMessage = null;
    }

    await webhookRepo.updateDelivery(tenantId, deliveryId, updateData);

    await this.updateCircuitBreaker(subscriptionId, result.success);

    if (!result.success && attemptNumber < maxAttempts) {
      const retryDelay = this.getRetryDelayMs(attemptNumber);
      const nextAttemptAt = new Date(Date.now() + retryDelay);

      await webhookRepo.updateDelivery(tenantId, deliveryId, {
        status: 'pending',
        attemptNumber: attemptNumber + 1,
        nextAttemptAt,
      } as Partial<NewWebhookDeliveryDb>);
    }

    if (!result.success && attemptNumber >= maxAttempts) {
      throw new WebhookDeliveryMaxRetriesExceededError(deliveryId);
    }

    return result;
  }

  private async deliverWebhook(
    targetUrl: string,
    payload: Record<string, unknown>,
    signatureHeaders: Record<string, string>,
  ): Promise<{
    success: boolean;
    statusCode?: number;
    responseBody?: string;
    errorMessage?: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DMZ-Webhook-Id': signatureHeaders['x-dmz-webhook-id'] ?? '',
          'X-DMZ-Webhook-Timestamp': signatureHeaders['x-dmz-webhook-timestamp'] ?? '',
          'X-DMZ-Webhook-Signature': signatureHeaders['x-dmz-webhook-signature'] ?? '',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();
      const latencyMs = Date.now() - startTime;

      const success = response.ok;

      const result: {
        success: boolean;
        statusCode: number;
        responseBody: string;
        latencyMs: number;
        errorMessage?: string;
      } = {
        success,
        statusCode: response.status,
        responseBody,
        latencyMs,
      };

      if (!success) {
        result.errorMessage = `HTTP ${response.status}: ${responseBody}`;
      }

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        errorMessage,
        latencyMs,
      };
    }
  }

  private async queueDelivery(
    subscription: WebhookSubscriptionDb,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const eventId = randomUUID();
    const payload = this.createEventPayload(eventId, eventType, subscription.tenantId, data);

    const delivery = await webhookRepo.createDelivery({
      subscriptionId: subscription.id,
      eventId,
      eventType,
      tenantId: subscription.tenantId,
      targetUrl: subscription.targetUrl,
      status: 'pending',
      attemptNumber: 1,
      maxAttempts: WEBHOOK_DEFAULT_MAX_ATTEMPTS,
      payload: JSON.stringify(payload),
    });

    await this.processDelivery(
      delivery.id,
      subscription.id,
      subscription.tenantId,
      subscription.targetUrl,
      payload,
      eventId,
      eventType,
      1,
      WEBHOOK_DEFAULT_MAX_ATTEMPTS,
    );
  }

  private createEventPayload(
    eventId: string,
    eventType: string,
    tenantId: string,
    data: Record<string, unknown>,
  ): WebhookEventEnvelope {
    return {
      eventId,
      eventType: eventType as WebhookEventType,
      occurredAt: new Date().toISOString(),
      tenantId,
      version: 1,
      data,
    };
  }

  private createTestEventPayload(subscriptionId: string, tenantId: string): WebhookEventEnvelope {
    return {
      eventId: randomUUID(),
      eventType: 'auth.user.created' as WebhookEventType,
      occurredAt: new Date().toISOString(),
      tenantId,
      version: 1,
      data: {
        test: true,
        subscriptionId,
        message: 'This is a test webhook delivery',
      },
    };
  }

  private generateSecret(): string {
    return randomUUID() + randomUUID();
  }

  private hashSecret(secret: string): string {
    return createHmac('sha256', secret).update(secret).digest('hex');
  }

  generateSignature(payload: Record<string, unknown>, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(payloadString).digest('hex');
    return signature;
  }

  verifySignature(
    payload: Record<string, unknown>,
    signature: string,
    secret: string,
    timestamp: string,
  ): boolean {
    const timestampNum = parseInt(timestamp, 10);
    const now = Date.now();

    if (now - timestampNum > WEBHOOK_REPLAY_WINDOW_MS) {
      throw new WebhookSignatureExpiredError();
    }

    const payloadWithTimestamp = { ...payload, timestamp: timestampNum };
    const payloadString = JSON.stringify(payloadWithTimestamp);
    const expectedSignature = createHmac('sha256', secret).update(payloadString).digest('hex');

    const sigBuffer = Buffer.from(signature.replace('v1=', ''), 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      throw new WebhookSignatureInvalidError();
    }

    try {
      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      throw new WebhookSignatureInvalidError();
    }
  }

  private async updateCircuitBreaker(subscriptionId: string, success: boolean): Promise<void> {
    const breaker = await webhookRepo.getOrCreateCircuitBreaker(subscriptionId);

    const newTotalRequests = breaker.totalRequests + 1;
    const newFailedRequests = success ? breaker.failedRequests : breaker.failedRequests + 1;
    const newConsecutiveFailures = success ? 0 : breaker.consecutiveFailures + 1;

    const failureRate = newTotalRequests > 0 ? newFailedRequests / newTotalRequests : 0;
    const shouldOpen = failureRate >= 0.95 && newTotalRequests >= 20;

    await webhookRepo.updateCircuitBreaker(subscriptionId, {
      totalRequests: newTotalRequests,
      failedRequests: newFailedRequests,
      consecutiveFailures: newConsecutiveFailures,
      isOpen: shouldOpen || breaker.isOpen,
      openedAt: shouldOpen && !breaker.isOpen ? new Date() : breaker.openedAt,
      closedAt: !shouldOpen && breaker.isOpen ? new Date() : breaker.closedAt,
      lastCheckedAt: new Date(),
    });
  }

  getRetryDelayMs(attemptNumber: number): number {
    const index = Math.min(attemptNumber - 1, WEBHOOK_RETRY_DELAYS_MS.length - 1);
    const delay = WEBHOOK_RETRY_DELAYS_MS[index];
    return delay !== undefined
      ? delay
      : WEBHOOK_RETRY_DELAYS_MS[WEBHOOK_RETRY_DELAYS_MS.length - 1]!;
  }

  private mapDbToSubscription(db: WebhookSubscriptionDb): WebhookSubscription {
    const eventTypesParsed = JSON.parse(db.eventTypes) as string[];
    return {
      id: db.id,
      tenantId: db.tenantId,
      name: db.name,
      targetUrl: db.targetUrl,
      eventTypes: eventTypesParsed as unknown as WebhookSubscription['eventTypes'],
      status: db.status as WebhookSubscriptionStatus,
      secretHash: db.secretHash,
      filters: db.filters as Record<string, unknown> | undefined,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
      disabledAt: db.disabledAt ?? undefined,
      testPendingAt: db.testPendingAt ?? undefined,
      failureDisabledAt: db.failureDisabledAt ?? undefined,
    };
  }

  private mapDbToDelivery(db: WebhookDeliveryDb): WebhookDelivery {
    return {
      id: db.id,
      subscriptionId: db.subscriptionId,
      eventId: db.eventId,
      eventType: db.eventType as WebhookEventType,
      tenantId: db.tenantId,
      targetUrl: db.targetUrl,
      status: db.status as WebhookDeliveryStatus,
      attemptNumber: db.attemptNumber,
      maxAttempts: db.maxAttempts,
      nextAttemptAt: db.nextAttemptAt ?? undefined,
      lastAttemptAt: db.lastAttemptAt ?? undefined,
      responseStatusCode: db.responseStatusCode ?? undefined,
      responseBody: db.responseBody ?? undefined,
      errorMessage: db.errorMessage ?? undefined,
      latencyMs: db.latencyMs ?? undefined,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }
}

export const webhookService = new WebhookService();
