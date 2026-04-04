import { randomUUID } from 'crypto';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { WEBHOOK_RETRY_DELAYS_MS, WEBHOOK_DEFAULT_MAX_ATTEMPTS } from '@the-dmz/shared/contracts';

import { WebhookService } from '../webhook.service.js';
import { webhookRepo } from '../webhook.repo.js';
import {
  WEBHOOK_QUEUE_NAMES,
  WEBHOOK_JOB_OPTIONS,
  type WebhookDeliveryJobData,
} from '../workers/webhook-queue.js';

import type {
  WebhookCircuitBreakerDb,
  WebhookSubscriptionDb,
  WebhookDeliveryDb,
} from '../../../db/schema/webhooks.js';

vi.mock('bullmq');
vi.mock('../webhook.repo.js');

describe('WebhookService Queue Integration', () => {
  let service: WebhookService;
  const mockRepo = vi.mocked(webhookRepo);
  let mockQueueAdd: ReturnType<typeof vi.fn>;

  const mockTenantId = randomUUID();
  const mockSubscriptionId = randomUUID();
  const mockSecretHash = 'hashed-secret';
  const fixedDate = new Date('2026-03-10T00:00:00.000Z');

  const buildSubscriptionDb = (
    overrides: Partial<WebhookSubscriptionDb> = {},
  ): WebhookSubscriptionDb => ({
    id: mockSubscriptionId,
    tenantId: mockTenantId,
    name: 'Test Webhook',
    targetUrl: 'https://example.com/webhook',
    eventTypes: JSON.stringify(['auth.user.created']),
    status: 'active',
    secretHash: mockSecretHash,
    filters: null,
    ipAllowlist: null,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    disabledAt: null,
    testPendingAt: null,
    failureDisabledAt: null,
    ...overrides,
  });

  const buildCircuitBreakerDb = (
    overrides: Partial<WebhookCircuitBreakerDb> = {},
  ): WebhookCircuitBreakerDb => ({
    id: randomUUID(),
    subscriptionId: mockSubscriptionId,
    totalRequests: 0,
    failedRequests: 0,
    consecutiveFailures: 0,
    isOpen: false,
    openedAt: null,
    closedAt: null,
    lastCheckedAt: fixedDate,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    ...overrides,
  });

  const buildMockDelivery = (
    deliveryId: string,
    overrides: Partial<WebhookDeliveryDb> = {},
  ): WebhookDeliveryDb => ({
    id: deliveryId,
    subscriptionId: mockSubscriptionId,
    eventId: randomUUID(),
    eventType: 'auth.user.created',
    tenantId: mockTenantId,
    targetUrl: 'https://example.com/webhook',
    status: 'pending',
    attemptNumber: 1,
    maxAttempts: 5,
    nextAttemptAt: null,
    lastAttemptAt: null,
    responseStatusCode: null,
    responseBody: null,
    errorMessage: null,
    latencyMs: null,
    payload: { test: true },
    signatureHeaders: null,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    ...overrides,
  });

  beforeAll(() => {
    service = new WebhookService();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd = vi.fn().mockResolvedValue({ id: 'mock-job-id' });
  });

  describe('queueEvent - Job Enqueueing', () => {
    it('should create delivery record when queueing event for active subscription', async () => {
      const mockSubscription = buildSubscriptionDb();
      const deliveryId = randomUUID();
      const mockDelivery = buildMockDelivery(deliveryId);

      mockRepo.getActiveSubscriptionsForEvent.mockResolvedValue([mockSubscription]);
      mockRepo.createDelivery.mockResolvedValue(mockDelivery);

      vi.spyOn(WebhookService.prototype, 'getDeliveryQueue').mockReturnValue({
        add: mockQueueAdd,
      } as never);

      await service.queueEvent(mockTenantId, 'auth.user.created', { userId: '123' });

      expect(mockRepo.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: mockSubscriptionId,
          eventType: 'auth.user.created',
          tenantId: mockTenantId,
          targetUrl: 'https://example.com/webhook',
          status: 'pending',
          attemptNumber: 1,
          maxAttempts: WEBHOOK_DEFAULT_MAX_ATTEMPTS,
        }),
      );
    });

    it('should call queue.add with correct job data', async () => {
      const mockSubscription = buildSubscriptionDb();
      const deliveryId = randomUUID();
      const mockDelivery = buildMockDelivery(deliveryId);

      mockRepo.getActiveSubscriptionsForEvent.mockResolvedValue([mockSubscription]);
      mockRepo.createDelivery.mockResolvedValue(mockDelivery);

      vi.spyOn(WebhookService.prototype, 'getDeliveryQueue').mockReturnValue({
        add: mockQueueAdd,
      } as never);

      await service.queueEvent(mockTenantId, 'auth.user.created', { userId: '123' });

      expect(mockQueueAdd).toHaveBeenCalledWith(
        WEBHOOK_QUEUE_NAMES.WEBHOOK_DELIVERY,
        expect.objectContaining({
          type: 'deliver-webhook',
          deliveryId,
          subscriptionId: mockSubscriptionId,
          tenantId: mockTenantId,
          targetUrl: 'https://example.com/webhook',
          attemptNumber: 1,
          maxAttempts: WEBHOOK_DEFAULT_MAX_ATTEMPTS,
        }),
        expect.objectContaining({ jobId: `webhook-${deliveryId}` }),
      );
    });

    it('should create job with eventId in payload', async () => {
      const mockSubscription = buildSubscriptionDb();
      const deliveryId = randomUUID();
      const mockDelivery = buildMockDelivery(deliveryId);

      mockRepo.getActiveSubscriptionsForEvent.mockResolvedValue([mockSubscription]);
      mockRepo.createDelivery.mockResolvedValue(mockDelivery);

      let capturedJobData: WebhookDeliveryJobData | undefined;
      const captureAdd = vi
        .fn()
        .mockImplementation((_name: string, data: WebhookDeliveryJobData) => {
          capturedJobData = data;
          return Promise.resolve({ id: `webhook-${deliveryId}` });
        });
      vi.spyOn(WebhookService.prototype, 'getDeliveryQueue').mockReturnValue({
        add: captureAdd,
      } as never);

      await service.queueEvent(mockTenantId, 'auth.user.created', { userId: '123' });

      expect(capturedJobData?.eventId).toBeDefined();
      expect(capturedJobData?.payload).toMatchObject({
        eventId: capturedJobData!.eventId,
        eventType: 'auth.user.created',
        tenantId: mockTenantId,
        data: { userId: '123' },
      });
    });
  });

  describe('queueRetry - Retry Job Enqueueing', () => {
    it('should queue retry with correct parameters and delay', async () => {
      const deliveryId = randomUUID();
      const targetUrl = 'https://example.com/webhook';
      const payload = { test: true };
      const eventId = randomUUID();
      const attemptNumber = 2;
      const maxAttempts = 5;
      const delayMs = WEBHOOK_RETRY_DELAYS_MS[0];

      const retryAddSpy = vi.fn().mockResolvedValue({});
      vi.spyOn(WebhookService.prototype, 'getDeliveryQueue').mockReturnValue({
        add: retryAddSpy,
      } as never);

      const queueRetry = (service as never as { queueRetry: typeof service.queueEvent }).queueRetry;
      await queueRetry.call(
        service,
        deliveryId,
        mockSubscriptionId,
        mockTenantId,
        targetUrl,
        payload,
        eventId,
        'auth.user.created',
        attemptNumber,
        maxAttempts,
        delayMs,
      );

      expect(retryAddSpy).toHaveBeenCalledWith(
        WEBHOOK_QUEUE_NAMES.WEBHOOK_DELIVERY,
        expect.objectContaining({
          type: 'deliver-webhook',
          deliveryId,
          subscriptionId: mockSubscriptionId,
          tenantId: mockTenantId,
          targetUrl,
          attemptNumber,
          maxAttempts,
        }),
        expect.objectContaining({
          jobId: `webhook-retry-${deliveryId}-${attemptNumber}`,
          delay: delayMs,
        }),
      );
    });
  });

  describe('Retry Configuration', () => {
    it('should have exponential backoff configured', () => {
      expect(WEBHOOK_JOB_OPTIONS.attempts).toBe(3);
      expect(WEBHOOK_JOB_OPTIONS.backoff?.type).toBe('exponential');
      expect(WEBHOOK_JOB_OPTIONS.backoff?.delay).toBe(1000);
    });

    it('should return correct retry delay for each attempt number', () => {
      expect(service.getRetryDelayMs(1)).toBe(WEBHOOK_RETRY_DELAYS_MS[0]);
      expect(service.getRetryDelayMs(2)).toBe(WEBHOOK_RETRY_DELAYS_MS[1]);
      expect(service.getRetryDelayMs(3)).toBe(WEBHOOK_RETRY_DELAYS_MS[2]);
      expect(service.getRetryDelayMs(4)).toBe(WEBHOOK_RETRY_DELAYS_MS[3]);
      expect(service.getRetryDelayMs(5)).toBe(WEBHOOK_RETRY_DELAYS_MS[4]);
    });

    it('should cap retry delay at maximum value', () => {
      const maxDelay = WEBHOOK_RETRY_DELAYS_MS[WEBHOOK_RETRY_DELAYS_MS.length - 1];
      expect(service.getRetryDelayMs(100)).toBe(maxDelay);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit breaker after 95% failure rate with 20+ requests', async () => {
      const mockSubscription = buildSubscriptionDb();
      const breakerBefore = buildCircuitBreakerDb({
        totalRequests: 19,
        failedRequests: 18,
        consecutiveFailures: 18,
        isOpen: false,
      });

      mockRepo.getSubscriptionById.mockResolvedValue(mockSubscription);
      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(breakerBefore);
      mockRepo.updateCircuitBreaker.mockResolvedValue({
        ...breakerBefore,
        isOpen: true,
        totalRequests: 20,
        failedRequests: 19,
        consecutiveFailures: 19,
      });

      await service.updateCircuitBreaker(mockSubscriptionId, false);

      expect(mockRepo.updateCircuitBreaker).toHaveBeenCalledWith(
        mockSubscriptionId,
        expect.objectContaining({ isOpen: true, totalRequests: 20, failedRequests: 19 }),
      );
    });

    it('should close circuit breaker when success occurs after being open', async () => {
      const mockSubscription = buildSubscriptionDb();
      const breakerBefore = buildCircuitBreakerDb({
        totalRequests: 20,
        failedRequests: 19,
        consecutiveFailures: 19,
        isOpen: true,
        openedAt: new Date(),
      });

      mockRepo.getSubscriptionById.mockResolvedValue(mockSubscription);
      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(breakerBefore);
      mockRepo.updateCircuitBreaker.mockResolvedValue({
        ...breakerBefore,
        isOpen: false,
        consecutiveFailures: 0,
        closedAt: new Date(),
      });

      await service.updateCircuitBreaker(mockSubscriptionId, true);

      expect(mockRepo.updateCircuitBreaker).toHaveBeenCalledWith(
        mockSubscriptionId,
        expect.objectContaining({ isOpen: false, consecutiveFailures: 0 }),
      );
    });

    it('should not open circuit breaker below 20 requests', async () => {
      const mockSubscription = buildSubscriptionDb();
      const breakerBefore = buildCircuitBreakerDb({
        totalRequests: 10,
        failedRequests: 9,
        consecutiveFailures: 9,
        isOpen: false,
      });

      mockRepo.getSubscriptionById.mockResolvedValue(mockSubscription);
      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(breakerBefore);
      mockRepo.updateCircuitBreaker.mockResolvedValue({
        ...breakerBefore,
        totalRequests: 11,
        failedRequests: 10,
        consecutiveFailures: 10,
      });

      await service.updateCircuitBreaker(mockSubscriptionId, false);

      expect(mockRepo.updateCircuitBreaker).toHaveBeenCalledWith(
        mockSubscriptionId,
        expect.objectContaining({ isOpen: false }),
      );
    });

    it('should not close circuit breaker if still above threshold', async () => {
      const mockSubscription = buildSubscriptionDb();
      const breakerBefore = buildCircuitBreakerDb({
        totalRequests: 20,
        failedRequests: 20,
        consecutiveFailures: 20,
        isOpen: true,
        openedAt: new Date(),
      });

      mockRepo.getSubscriptionById.mockResolvedValue(mockSubscription);
      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(breakerBefore);
      mockRepo.updateCircuitBreaker.mockResolvedValue({
        ...breakerBefore,
        totalRequests: 21,
        failedRequests: 21,
        consecutiveFailures: 21,
      });

      await service.updateCircuitBreaker(mockSubscriptionId, false);

      expect(mockRepo.updateCircuitBreaker).toHaveBeenCalledWith(
        mockSubscriptionId,
        expect.objectContaining({ isOpen: true }),
      );
    });
  });

  describe('Queue Constants', () => {
    it('should use correct queue name', () => {
      expect(WEBHOOK_QUEUE_NAMES.WEBHOOK_DELIVERY).toBe('webhook-delivery');
    });

    it('should have correct default job options', () => {
      expect(WEBHOOK_JOB_OPTIONS.attempts).toBe(3);
      expect(WEBHOOK_JOB_OPTIONS.backoff?.type).toBe('exponential');
      expect(WEBHOOK_JOB_OPTIONS.removeOnComplete?.count).toBe(100);
      expect(WEBHOOK_JOB_OPTIONS.removeOnFail?.count).toBe(500);
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should create delivery records for all active subscriptions', async () => {
      const subscription2Id = randomUUID();
      const mockSubscription1 = buildSubscriptionDb();
      const mockSubscription2 = buildSubscriptionDb({
        id: subscription2Id,
        targetUrl: 'https://example2.com/webhook',
      });
      const mockDelivery1 = buildMockDelivery(randomUUID());
      const mockDelivery2 = buildMockDelivery(randomUUID(), { subscriptionId: subscription2Id });

      mockRepo.getActiveSubscriptionsForEvent.mockResolvedValue([
        mockSubscription1,
        mockSubscription2,
      ]);
      mockRepo.createDelivery
        .mockResolvedValueOnce(mockDelivery1)
        .mockResolvedValueOnce(mockDelivery2);

      vi.spyOn(WebhookService.prototype, 'getDeliveryQueue').mockReturnValue({
        add: mockQueueAdd,
      } as never);

      await service.queueEvent(mockTenantId, 'auth.user.created', { userId: '123' });

      expect(mockRepo.createDelivery).toHaveBeenCalledTimes(2);
    });
  });

  describe('Job Data Structure', () => {
    it('should create job with proper WebhookDeliveryJobData structure', async () => {
      const mockSubscription = buildSubscriptionDb();
      const deliveryId = randomUUID();
      const mockDelivery = buildMockDelivery(deliveryId);

      mockRepo.getActiveSubscriptionsForEvent.mockResolvedValue([mockSubscription]);
      mockRepo.createDelivery.mockResolvedValue(mockDelivery);

      let capturedJobData: WebhookDeliveryJobData | undefined;
      const captureAdd = vi
        .fn()
        .mockImplementation((_name: string, data: WebhookDeliveryJobData) => {
          capturedJobData = data;
          return Promise.resolve({ id: `webhook-${deliveryId}` });
        });
      vi.spyOn(WebhookService.prototype, 'getDeliveryQueue').mockReturnValue({
        add: captureAdd,
      } as never);

      await service.queueEvent(mockTenantId, 'auth.user.created', { userId: '123' });

      expect(capturedJobData).toMatchObject({
        type: 'deliver-webhook',
        deliveryId,
        subscriptionId: mockSubscriptionId,
        tenantId: mockTenantId,
        targetUrl: 'https://example.com/webhook',
        eventType: 'auth.user.created',
        attemptNumber: 1,
        maxAttempts: WEBHOOK_DEFAULT_MAX_ATTEMPTS,
      });
      expect(capturedJobData?.payload).toBeDefined();
      expect(capturedJobData?.eventId).toBeDefined();
    });
  });
});

describe('WebhookService getRetryDelayMs Unit Tests', () => {
  let service: WebhookService;

  beforeAll(() => {
    service = new WebhookService();
  });

  it('should return correct delay for first attempt', () => {
    expect(service.getRetryDelayMs(1)).toBe(WEBHOOK_RETRY_DELAYS_MS[0]);
  });

  it('should return correct delay for second attempt', () => {
    expect(service.getRetryDelayMs(2)).toBe(WEBHOOK_RETRY_DELAYS_MS[1]);
  });

  it('should return correct delay for third attempt', () => {
    expect(service.getRetryDelayMs(3)).toBe(WEBHOOK_RETRY_DELAYS_MS[2]);
  });

  it('should return correct delay for fourth attempt', () => {
    expect(service.getRetryDelayMs(4)).toBe(WEBHOOK_RETRY_DELAYS_MS[3]);
  });

  it('should return correct delay for fifth attempt', () => {
    expect(service.getRetryDelayMs(5)).toBe(WEBHOOK_RETRY_DELAYS_MS[4]);
  });

  it('should cap retry delay at maximum', () => {
    const maxDelay = WEBHOOK_RETRY_DELAYS_MS[WEBHOOK_RETRY_DELAYS_MS.length - 1];
    expect(service.getRetryDelayMs(100)).toBe(maxDelay);
  });
});
