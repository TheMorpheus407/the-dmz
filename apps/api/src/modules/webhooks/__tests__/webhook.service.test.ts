import { randomUUID } from 'crypto';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  WebhookSubscriptionStatus,
  WebhookDeliveryStatus,
  WEBHOOK_REPLAY_WINDOW_MS,
  WEBHOOK_RETRY_DELAYS_MS,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_CIRCUIT_BREAKER,
  WEBHOOK_RATE_LIMITS,
  webhookDeliveryBaseSchema,
  httpWebhookDeliverySchema,
  webhookTestResultBaseSchema,
  httpWebhookTestResultSchema,
} from '@the-dmz/shared/contracts';

import { WebhookService } from '../webhook.service.js';
import {
  WebhookSubscriptionNotFoundError,
  WebhookSignatureInvalidError,
  WebhookSignatureExpiredError,
  WebhookCircuitBreakerOpenError,
  WebhookSubscriptionInvalidStatusError,
  WebhookDeliveryMaxRetriesExceededError,
} from '../webhook.errors.js';
import { webhookRepo } from '../webhook.repo.js';

import type {
  WebhookCircuitBreakerDb,
  WebhookSubscriptionDb,
  WebhookDeliveryDb,
} from '../../../db/schema/webhooks.js';

vi.mock('../webhook.repo.js');

describe('WebhookService', () => {
  let service: WebhookService;
  const mockRepo = vi.mocked(webhookRepo);

  const mockTenantId = randomUUID();
  const mockSubscriptionId = randomUUID();
  const mockSecret = 'test-secret';
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

  beforeAll(() => {
    service = new WebhookService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a webhook subscription with test_pending status', async () => {
      const mockDbSubscription = buildSubscriptionDb({
        status: 'test_pending',
        testPendingAt: new Date(),
      });

      mockRepo.createSubscription.mockResolvedValue(mockDbSubscription);

      const result = await service.createSubscription(mockTenantId, {
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        eventTypes: ['auth.user.created'],
      });

      expect(result.name).toBe('Test Webhook');
      expect(result.status).toBe(WebhookSubscriptionStatus.TEST_PENDING);
      expect(mockRepo.createSubscription).toHaveBeenCalled();
    });
  });

  describe('getSubscription', () => {
    it('should return subscription when found', async () => {
      const mockDbSubscription = buildSubscriptionDb();

      mockRepo.getSubscriptionById.mockResolvedValue(mockDbSubscription);

      const result = await service.getSubscription(mockTenantId, mockSubscriptionId);

      expect(result.id).toBe(mockSubscriptionId);
      expect(result.status).toBe('active');
    });

    it('should throw WebhookSubscriptionNotFoundError when not found', async () => {
      mockRepo.getSubscriptionById.mockResolvedValue(undefined);

      await expect(service.getSubscription(mockTenantId, randomUUID())).rejects.toThrow(
        WebhookSubscriptionNotFoundError,
      );
    });
  });

  describe('listSubscriptions', () => {
    it('should return subscriptions list', async () => {
      const mockDbSubscriptions = [buildSubscriptionDb()];

      mockRepo.listSubscriptions.mockResolvedValue({
        subscriptions: mockDbSubscriptions,
      });

      const result = await service.listSubscriptions(mockTenantId);

      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0]?.name).toBe('Test Webhook');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription status', async () => {
      const mockDbSubscription = buildSubscriptionDb({
        status: 'disabled',
        disabledAt: new Date(),
      });

      mockRepo.getSubscriptionById.mockResolvedValue({
        ...mockDbSubscription,
        status: 'active',
      });
      mockRepo.updateSubscription.mockResolvedValue(mockDbSubscription);

      const result = await service.updateSubscription(mockTenantId, mockSubscriptionId, {
        status: WebhookSubscriptionStatus.DISABLED,
      });

      expect(result.status).toBe(WebhookSubscriptionStatus.DISABLED);
      expect(mockRepo.updateSubscription).toHaveBeenCalled();
    });
  });

  describe('deleteSubscription', () => {
    it('should delete subscription when found', async () => {
      mockRepo.getSubscriptionById.mockResolvedValue(buildSubscriptionDb());
      mockRepo.deleteSubscription.mockResolvedValue(true);

      await expect(
        service.deleteSubscription(mockTenantId, mockSubscriptionId),
      ).resolves.not.toThrow();
    });

    it('should throw error when subscription not found', async () => {
      mockRepo.deleteSubscription.mockResolvedValue(false);

      await expect(service.deleteSubscription(mockTenantId, randomUUID())).rejects.toThrow(
        WebhookSubscriptionNotFoundError,
      );
    });
  });

  describe('HTTPS Validation', () => {
    it('should reject HTTP URLs in createSubscription', async () => {
      await expect(
        service.createSubscription(mockTenantId, {
          name: 'Test Webhook',
          targetUrl: 'http://example.com/webhook',
          eventTypes: ['auth.user.created'],
        }),
      ).rejects.toThrow('Webhook target URL must use HTTPS protocol');
    });

    it('should accept HTTPS URLs in createSubscription', async () => {
      const mockDbSubscription = buildSubscriptionDb({
        status: 'test_pending',
        testPendingAt: new Date(),
      });

      mockRepo.createSubscription.mockResolvedValue(mockDbSubscription);

      const result = await service.createSubscription(mockTenantId, {
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        eventTypes: ['auth.user.created'],
      });

      expect(result.name).toBe('Test Webhook');
    });

    it('should reject HTTP URLs in updateSubscription', async () => {
      mockRepo.getSubscriptionById.mockResolvedValue(buildSubscriptionDb());

      await expect(
        service.updateSubscription(mockTenantId, mockSubscriptionId, {
          targetUrl: 'http://example.com/webhook',
        }),
      ).rejects.toThrow('Webhook target URL must use HTTPS protocol');
    });
  });

  describe('rotateSecret', () => {
    it('should rotate secret and return new secret', async () => {
      const mockDbSubscription = buildSubscriptionDb();

      mockRepo.getSubscriptionById.mockResolvedValue(mockDbSubscription);
      mockRepo.updateSubscription.mockResolvedValue({
        ...mockDbSubscription,
        secretHash: 'new-hashed-secret',
      });

      const result = await service.rotateSecret(mockTenantId, mockSubscriptionId);

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result.rotatedAt).toBeDefined();
      expect(mockRepo.updateSubscription).toHaveBeenCalled();
    });

    it('should throw error when subscription not found', async () => {
      mockRepo.getSubscriptionById.mockResolvedValue(undefined);

      await expect(service.rotateSecret(mockTenantId, randomUUID())).rejects.toThrow(
        WebhookSubscriptionNotFoundError,
      );
    });
  });

  describe('IP Allowlist', () => {
    it('should store ipAllowlist when creating subscription', async () => {
      const mockDbSubscription = buildSubscriptionDb({
        ipAllowlist: JSON.stringify(['192.168.1.1', '10.0.0.1']),
      });

      mockRepo.createSubscription.mockResolvedValue(mockDbSubscription);

      const result = await service.createSubscription(mockTenantId, {
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        eventTypes: ['auth.user.created'],
        ipAllowlist: ['192.168.1.1', '10.0.0.1'],
      });

      expect(result.ipAllowlist).toEqual(['192.168.1.1', '10.0.0.1']);
      expect(mockRepo.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAllowlist: ['192.168.1.1', '10.0.0.1'],
        }),
      );
    });

    it('should update ipAllowlist when updating subscription', async () => {
      const mockDbSubscription = buildSubscriptionDb({
        ipAllowlist: JSON.stringify(['192.168.1.1']),
      });

      mockRepo.getSubscriptionById.mockResolvedValue(buildSubscriptionDb());
      mockRepo.updateSubscription.mockResolvedValue(mockDbSubscription);

      const result = await service.updateSubscription(mockTenantId, mockSubscriptionId, {
        ipAllowlist: ['192.168.1.1', '10.0.0.1'],
      });

      expect(result.ipAllowlist).toEqual(['192.168.1.1']);
      expect(mockRepo.updateSubscription).toHaveBeenCalledWith(
        mockTenantId,
        mockSubscriptionId,
        expect.objectContaining({
          ipAllowlist: ['192.168.1.1', '10.0.0.1'],
        }),
      );
    });
  });

  describe('HMAC Signature Generation', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const payload = { eventId: '123', data: { test: true } };
      const signature = service.generateSignature(payload, mockSecret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64);
    });

    it('should generate consistent signatures', () => {
      const payload = { eventId: '123', data: { test: true } };
      const sig1 = service.generateSignature(payload, mockSecret);
      const sig2 = service.generateSignature(payload, mockSecret);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = { eventId: '123', data: { test: true } };
      const sig1 = service.generateSignature(payload, 'secret1');
      const sig2 = service.generateSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid signature', () => {
      const payload = { eventId: '123', data: { test: true } };
      const timestamp = Date.now().toString();
      const signature = service.generateSignature(
        { ...payload, timestamp: parseInt(timestamp) },
        mockSecret,
      );

      const result = service.verifySignature(payload, `v1=${signature}`, mockSecret, timestamp);

      expect(result).toBe(true);
    });

    it('should reject expired signature (replay protection)', () => {
      const payload = { eventId: '123', data: { test: true } };
      const expiredTimestamp = (Date.now() - WEBHOOK_REPLAY_WINDOW_MS - 1000).toString();

      expect(() => {
        service.verifySignature(payload, 'v1=somesignature', mockSecret, expiredTimestamp);
      }).toThrow(WebhookSignatureExpiredError);
    });

    it('should reject invalid signature', () => {
      const payload = { eventId: '123', data: { test: true } };
      const timestamp = Date.now().toString();

      expect(() => {
        service.verifySignature(
          payload,
          'v1=invalidsignature12345678901234567890123456789012345678901234',
          mockSecret,
          timestamp,
        );
      }).toThrow(WebhookSignatureInvalidError);
    });
  });

  describe('Retry Logic', () => {
    it('should return correct retry delays', () => {
      expect(service['getRetryDelayMs'](1)).toBe(WEBHOOK_RETRY_DELAYS_MS[0]);
      expect(service['getRetryDelayMs'](2)).toBe(WEBHOOK_RETRY_DELAYS_MS[1]);
      expect(service['getRetryDelayMs'](3)).toBe(WEBHOOK_RETRY_DELAYS_MS[2]);
      expect(service['getRetryDelayMs'](4)).toBe(WEBHOOK_RETRY_DELAYS_MS[3]);
      expect(service['getRetryDelayMs'](5)).toBe(WEBHOOK_RETRY_DELAYS_MS[4]);
    });

    it('should cap retry delay at maximum', () => {
      const maxDelay = WEBHOOK_RETRY_DELAYS_MS[WEBHOOK_RETRY_DELAYS_MS.length - 1];
      expect(service['getRetryDelayMs'](100)).toBe(maxDelay);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker when failure rate exceeds threshold', async () => {
      const mockBreaker = buildCircuitBreakerDb({
        totalRequests: 19,
        failedRequests: 18,
        consecutiveFailures: 18,
        isOpen: false,
      });

      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(mockBreaker);
      mockRepo.updateCircuitBreaker.mockResolvedValue({ ...mockBreaker, isOpen: true });

      await service['updateCircuitBreaker'](mockSubscriptionId, false);

      expect(mockRepo.updateCircuitBreaker).toHaveBeenCalled();
    });

    it('should close circuit breaker when success occurs', async () => {
      const mockBreaker = buildCircuitBreakerDb({
        totalRequests: 20,
        failedRequests: 19,
        consecutiveFailures: 1,
        isOpen: true,
        openedAt: new Date(),
      });

      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(mockBreaker);
      mockRepo.updateCircuitBreaker.mockResolvedValue({ ...mockBreaker, isOpen: false });

      await service['updateCircuitBreaker'](mockSubscriptionId, true);

      expect(mockRepo.updateCircuitBreaker).toHaveBeenCalledWith(
        mockSubscriptionId,
        expect.objectContaining({ isOpen: false }),
      );
    });
  });
});

describe('WebhookPolicy Contract Tests', () => {
  it('should have valid WEBHOOK_EVENT_TYPES', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('auth.user.created');
    expect(WEBHOOK_EVENT_TYPES).toContain('game.session.started');
    expect(WEBHOOK_EVENT_TYPES).toContain('enterprise.tenant.created');
  });

  it('should have all required event types from issue #234', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('auth.user.role_changed');
    expect(WEBHOOK_EVENT_TYPES).toContain('campaign.started');
    expect(WEBHOOK_EVENT_TYPES).toContain('campaign.completed');
    expect(WEBHOOK_EVENT_TYPES).toContain('campaign.paused');
    expect(WEBHOOK_EVENT_TYPES).toContain('training.completed');
    expect(WEBHOOK_EVENT_TYPES).toContain('training.started');
    expect(WEBHOOK_EVENT_TYPES).toContain('training.failed');
    expect(WEBHOOK_EVENT_TYPES).toContain('session.created');
    expect(WEBHOOK_EVENT_TYPES).toContain('session.updated');
    expect(WEBHOOK_EVENT_TYPES).toContain('session.deleted');
    expect(WEBHOOK_EVENT_TYPES).toContain('competency.updated');
    expect(WEBHOOK_EVENT_TYPES).toContain('competency.domain_updated');
  });

  it('should have valid WebhookSubscriptionStatus values', () => {
    expect(WebhookSubscriptionStatus.ACTIVE).toBe('active');
    expect(WebhookSubscriptionStatus.DISABLED).toBe('disabled');
    expect(WebhookSubscriptionStatus.TEST_PENDING).toBe('test_pending');
    expect(WebhookSubscriptionStatus.FAILURE_DISABLED).toBe('failure_disabled');
  });

  it('should have valid WebhookDeliveryStatus values', () => {
    expect(WebhookDeliveryStatus.PENDING).toBe('pending');
    expect(WebhookDeliveryStatus.IN_PROGRESS).toBe('in_progress');
    expect(WebhookDeliveryStatus.SUCCESS).toBe('success');
    expect(WebhookDeliveryStatus.FAILED).toBe('failed');
    expect(WebhookDeliveryStatus.DLQ).toBe('dlq');
  });

  it('should have correct retry delays', () => {
    expect(WEBHOOK_RETRY_DELAYS_MS).toHaveLength(5);
    expect(WEBHOOK_RETRY_DELAYS_MS[0]).toBe(60 * 1000);
    expect(WEBHOOK_RETRY_DELAYS_MS[4]).toBe(24 * 60 * 60 * 1000);
  });

  it('should have correct circuit breaker configuration', () => {
    expect(WEBHOOK_CIRCUIT_BREAKER.FAILURE_THRESHOLD).toBe(0.95);
    expect(WEBHOOK_CIRCUIT_BREAKER.MIN_REQUESTS).toBe(20);
    expect(WEBHOOK_CIRCUIT_BREAKER.FAILURE_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('should have correct rate limits', () => {
    expect(WEBHOOK_RATE_LIMITS.CREATE.limit).toBe(20);
    expect(WEBHOOK_RATE_LIMITS.LIST.limit).toBe(60);
    expect(WEBHOOK_RATE_LIMITS.GET.limit).toBe(60);
    expect(WEBHOOK_RATE_LIMITS.UPDATE.limit).toBe(30);
    expect(WEBHOOK_RATE_LIMITS.DELETE.limit).toBe(30);
    expect(WEBHOOK_RATE_LIMITS.TEST.limit).toBe(10);
    expect(WEBHOOK_RATE_LIMITS.ROTATE_SECRET.limit).toBe(10);
    expect(WEBHOOK_RATE_LIMITS.DELIVERY_LIST.limit).toBe(60);
    expect(WEBHOOK_RATE_LIMITS.DELIVERY_GET.limit).toBe(60);
  });
});

describe('testSubscription', () => {
  let service: WebhookService;
  const mockRepo = vi.mocked(webhookRepo);
  const mockTenantId = randomUUID();
  const mockSubscriptionId = randomUUID();
  const fixedDate = new Date('2026-03-10T00:00:00.000Z');

  beforeAll(() => {
    service = new WebhookService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return HttpWebhookTestResult with statusCode and latencyMs on success', async () => {
    const mockDbSubscription = {
      id: mockSubscriptionId,
      tenantId: mockTenantId,
      name: 'Test Webhook',
      targetUrl: 'https://example.com/webhook',
      eventTypes: JSON.stringify(['auth.user.created']),
      status: 'test_pending',
      secretHash: 'hashed-secret',
      filters: null,
      ipAllowlist: null,
      createdAt: fixedDate,
      updatedAt: fixedDate,
      disabledAt: null,
      testPendingAt: new Date(),
      failureDisabledAt: null,
    };

    mockRepo.getSubscriptionById.mockResolvedValue(mockDbSubscription);
    mockRepo.getOrCreateCircuitBreaker.mockResolvedValue({
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
    });
    mockRepo.updateSubscription.mockResolvedValue({
      ...mockDbSubscription,
      status: 'active',
      testPendingAt: null,
    });

    const result = await service.testSubscription(mockTenantId, mockSubscriptionId);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBeDefined();
    expect(result.latencyMs).toBeDefined();
    expect(result.signatureValid).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });

  it('should return HttpWebhookTestResult with errorMessage but NOT statusCode on failure', async () => {
    const mockDbSubscription = {
      id: mockSubscriptionId,
      tenantId: mockTenantId,
      name: 'Test Webhook',
      targetUrl: 'https://invalid.example.com/webhook',
      eventTypes: JSON.stringify(['auth.user.created']),
      status: 'test_pending',
      secretHash: 'hashed-secret',
      filters: null,
      ipAllowlist: null,
      createdAt: fixedDate,
      updatedAt: fixedDate,
      disabledAt: null,
      testPendingAt: new Date(),
      failureDisabledAt: null,
    };

    mockRepo.getSubscriptionById.mockResolvedValue(mockDbSubscription);
    mockRepo.getOrCreateCircuitBreaker.mockResolvedValue({
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
    });
    mockRepo.updateSubscription.mockResolvedValue(mockDbSubscription);

    const result = await service.testSubscription(mockTenantId, mockSubscriptionId);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBeUndefined();
    expect(result.errorMessage).toBeDefined();
    expect(result.signatureValid).toBe(true);
  });

  it('should throw WebhookSubscriptionNotFoundError when subscription not found', async () => {
    mockRepo.getSubscriptionById.mockResolvedValue(undefined);

    await expect(service.testSubscription(mockTenantId, mockSubscriptionId)).rejects.toThrow(
      WebhookSubscriptionNotFoundError,
    );
  });

  it('should throw WebhookCircuitBreakerOpenError when circuit breaker is open', async () => {
    const mockDbSubscription = {
      id: mockSubscriptionId,
      tenantId: mockTenantId,
      name: 'Test Webhook',
      targetUrl: 'https://example.com/webhook',
      eventTypes: JSON.stringify(['auth.user.created']),
      status: 'active',
      secretHash: 'hashed-secret',
      filters: null,
      ipAllowlist: null,
      createdAt: fixedDate,
      updatedAt: fixedDate,
      disabledAt: null,
      testPendingAt: null,
      failureDisabledAt: null,
    };

    mockRepo.getSubscriptionById.mockResolvedValue(mockDbSubscription);
    mockRepo.getOrCreateCircuitBreaker.mockResolvedValue({
      id: randomUUID(),
      subscriptionId: mockSubscriptionId,
      totalRequests: 20,
      failedRequests: 19,
      consecutiveFailures: 19,
      isOpen: true,
      openedAt: new Date(),
      closedAt: null,
      lastCheckedAt: fixedDate,
      createdAt: fixedDate,
      updatedAt: fixedDate,
    });

    await expect(service.testSubscription(mockTenantId, mockSubscriptionId)).rejects.toThrow(
      WebhookCircuitBreakerOpenError,
    );
  });
});

describe('listDeliveries', () => {
  let service: WebhookService;
  const mockRepo = vi.mocked(webhookRepo);
  const mockTenantId = randomUUID();
  const mockDeliveryId = randomUUID();
  const mockSubscriptionId = randomUUID();
  const fixedDate = new Date('2026-03-10T00:00:00.000Z');

  beforeAll(() => {
    service = new WebhookService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return deliveries with HTTP fields responseStatusCode, responseBody, latencyMs', async () => {
    const mockDbDelivery: WebhookDeliveryDb = {
      id: mockDeliveryId,
      subscriptionId: mockSubscriptionId,
      eventId: randomUUID(),
      eventType: 'auth.user.created',
      tenantId: mockTenantId,
      targetUrl: 'https://example.com/webhook',
      status: 'success',
      attemptNumber: 1,
      maxAttempts: 5,
      nextAttemptAt: null,
      lastAttemptAt: fixedDate,
      responseStatusCode: 200,
      responseBody: '{"status":"ok"}',
      errorMessage: null,
      latencyMs: 150,
      payload: { test: true },
      signatureHeaders: { 'X-Webhook-Id': '123' },
      createdAt: fixedDate,
      updatedAt: fixedDate,
    };

    mockRepo.listDeliveries.mockResolvedValue({
      deliveries: [mockDbDelivery],
    });

    const result = await service.listDeliveries(mockTenantId);

    expect(result.deliveries).toHaveLength(1);
    const delivery = result.deliveries[0];
    expect(delivery.id).toBe(mockDeliveryId);
    expect(delivery.responseStatusCode).toBe(200);
    expect(delivery.responseBody).toBe('{"status":"ok"}');
    expect(delivery.latencyMs).toBe(150);
    expect(delivery.subscriptionId).toBe(mockSubscriptionId);
    expect(delivery.eventType).toBe('auth.user.created');
    expect(delivery.status).toBe('success');
  });

  it('should return empty list when no deliveries exist', async () => {
    mockRepo.listDeliveries.mockResolvedValue({
      deliveries: [],
    });

    const result = await service.listDeliveries(mockTenantId);

    expect(result.deliveries).toHaveLength(0);
  });

  it('should return nextCursor when provided by repo', async () => {
    const mockCursor = 'cursor-123';
    mockRepo.listDeliveries.mockResolvedValue({
      deliveries: [],
      nextCursor: mockCursor,
    });

    const result = await service.listDeliveries(mockTenantId);

    expect(result.nextCursor).toBe(mockCursor);
  });

  it('should pass subscriptionId filter to repo', async () => {
    const filterSubscriptionId = randomUUID();
    mockRepo.listDeliveries.mockResolvedValue({
      deliveries: [],
    });

    await service.listDeliveries(mockTenantId, { subscriptionId: filterSubscriptionId });

    expect(mockRepo.listDeliveries).toHaveBeenCalledWith(mockTenantId, {
      subscriptionId: filterSubscriptionId,
    });
  });

  it('should pass status filter to repo', async () => {
    mockRepo.listDeliveries.mockResolvedValue({
      deliveries: [],
    });

    await service.listDeliveries(mockTenantId, { status: 'failed' });

    expect(mockRepo.listDeliveries).toHaveBeenCalledWith(mockTenantId, {
      status: 'failed',
    });
  });

  it('should pass limit option to repo', async () => {
    mockRepo.listDeliveries.mockResolvedValue({
      deliveries: [],
    });

    await service.listDeliveries(mockTenantId, { limit: 10 });

    expect(mockRepo.listDeliveries).toHaveBeenCalledWith(mockTenantId, {
      limit: 10,
    });
  });

  it('should return both deliveries and nextCursor when both are present', async () => {
    const mockCursor = 'cursor-456';
    const mockDbDelivery: WebhookDeliveryDb = {
      id: mockDeliveryId,
      subscriptionId: mockSubscriptionId,
      eventId: randomUUID(),
      eventType: 'auth.user.created',
      tenantId: mockTenantId,
      targetUrl: 'https://example.com/webhook',
      status: 'success',
      attemptNumber: 1,
      maxAttempts: 5,
      nextAttemptAt: null,
      lastAttemptAt: fixedDate,
      responseStatusCode: 200,
      responseBody: '{"status":"ok"}',
      errorMessage: null,
      latencyMs: 150,
      payload: { test: true },
      signatureHeaders: { 'X-Webhook-Id': '123' },
      createdAt: fixedDate,
      updatedAt: fixedDate,
    };

    mockRepo.listDeliveries.mockResolvedValue({
      deliveries: [mockDbDelivery],
      nextCursor: mockCursor,
    });

    const result = await service.listDeliveries(mockTenantId);

    expect(result.deliveries).toHaveLength(1);
    expect(result.nextCursor).toBe(mockCursor);
  });
});

describe('getDelivery', () => {
  let service: WebhookService;
  const mockRepo = vi.mocked(webhookRepo);
  const mockTenantId = randomUUID();
  const mockDeliveryId = randomUUID();
  const mockSubscriptionId = randomUUID();
  const fixedDate = new Date('2026-03-10T00:00:00.000Z');

  beforeAll(() => {
    service = new WebhookService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return HttpWebhookDelivery with HTTP fields responseStatusCode, responseBody, latencyMs', async () => {
    const mockDbDelivery: WebhookDeliveryDb = {
      id: mockDeliveryId,
      subscriptionId: mockSubscriptionId,
      eventId: randomUUID(),
      eventType: 'auth.user.created',
      tenantId: mockTenantId,
      targetUrl: 'https://example.com/webhook',
      status: 'success',
      attemptNumber: 1,
      maxAttempts: 5,
      nextAttemptAt: null,
      lastAttemptAt: fixedDate,
      responseStatusCode: 201,
      responseBody: '{"id":"123"}',
      errorMessage: null,
      latencyMs: 85,
      payload: { test: true },
      signatureHeaders: { 'X-Webhook-Id': '123' },
      createdAt: fixedDate,
      updatedAt: fixedDate,
    };

    mockRepo.getDeliveryById.mockResolvedValue(mockDbDelivery);

    const result = await service.getDelivery(mockTenantId, mockDeliveryId);

    expect(result.id).toBe(mockDeliveryId);
    expect(result.responseStatusCode).toBe(201);
    expect(result.responseBody).toBe('{"id":"123"}');
    expect(result.latencyMs).toBe(85);
    expect(result.subscriptionId).toBe(mockSubscriptionId);
    expect(result.eventType).toBe('auth.user.created');
    expect(result.status).toBe('success');
    expect(result.attemptNumber).toBe(1);
  });

  it('should throw error when delivery not found', async () => {
    mockRepo.getDeliveryById.mockResolvedValue(undefined);

    await expect(service.getDelivery(mockTenantId, randomUUID())).rejects.toThrow();
  });
});

describe('WebhookPolicy Schema Tests', () => {
  it('webhookDeliveryBaseSchema should NOT have responseStatusCode, responseBody, latencyMs fields', () => {
    const baseSchemaShape = webhookDeliveryBaseSchema.shape;
    expect(baseSchemaShape.responseStatusCode).toBeUndefined();
    expect(baseSchemaShape.responseBody).toBeUndefined();
    expect(baseSchemaShape.latencyMs).toBeUndefined();
  });

  it('httpWebhookDeliverySchema should extend base with responseStatusCode, responseBody, latencyMs fields', () => {
    const httpSchemaShape = httpWebhookDeliverySchema.shape;
    expect(httpSchemaShape.responseStatusCode).toBeDefined();
    expect(httpSchemaShape.responseBody).toBeDefined();
    expect(httpSchemaShape.latencyMs).toBeDefined();
  });

  it('httpWebhookDeliverySchema should parse valid HTTP delivery with all fields', () => {
    const validDelivery = {
      id: randomUUID(),
      subscriptionId: randomUUID(),
      eventId: randomUUID(),
      eventType: 'auth.user.created',
      tenantId: randomUUID(),
      targetUrl: 'https://example.com/webhook',
      status: 'success',
      attemptNumber: 1,
      maxAttempts: 5,
      nextAttemptAt: new Date(),
      lastAttemptAt: new Date(),
      errorMessage: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      responseStatusCode: 200,
      responseBody: '{"status":"ok"}',
      latencyMs: 100,
    };

    const result = httpWebhookDeliverySchema.safeParse(validDelivery);
    expect(result.success).toBe(true);
  });

  it('webhookDeliveryBaseSchema should NOT accept responseStatusCode', () => {
    const invalidDelivery = {
      id: randomUUID(),
      subscriptionId: randomUUID(),
      eventId: randomUUID(),
      eventType: 'auth.user.created',
      tenantId: randomUUID(),
      targetUrl: 'https://example.com/webhook',
      status: 'success',
      attemptNumber: 1,
      maxAttempts: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      responseStatusCode: 200,
    };

    const result = webhookDeliveryBaseSchema.safeParse(invalidDelivery);
    expect(result.success).toBe(false);
  });

  it('webhookTestResultBaseSchema should NOT have statusCode, latencyMs fields', () => {
    const baseSchemaShape = webhookTestResultBaseSchema.shape;
    expect(baseSchemaShape.statusCode).toBeUndefined();
    expect(baseSchemaShape.latencyMs).toBeUndefined();
  });

  it('httpWebhookTestResultSchema should extend base with statusCode, latencyMs fields', () => {
    const httpSchemaShape = httpWebhookTestResultSchema.shape;
    expect(httpSchemaShape.statusCode).toBeDefined();
    expect(httpSchemaShape.latencyMs).toBeDefined();
  });

  it('httpWebhookTestResultSchema should parse valid HTTP test result with all fields', () => {
    const validResult = {
      success: true,
      statusCode: 200,
      latencyMs: 50,
      signatureValid: true,
    };

    const result = httpWebhookTestResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it('httpWebhookTestResultSchema should parse result with errorMessage but no statusCode', () => {
    const errorResult = {
      success: false,
      errorMessage: 'Connection refused',
      signatureValid: true,
    };

    const result = httpWebhookTestResultSchema.safeParse(errorResult);
    expect(result.success).toBe(true);
    expect(result.data?.errorMessage).toBe('Connection refused');
    expect(result.data?.statusCode).toBeUndefined();
  });

  it('webhookTestResultBaseSchema should NOT accept statusCode', () => {
    const invalidResult = {
      success: true,
      statusCode: 200,
    };

    const result = webhookTestResultBaseSchema.safeParse(invalidResult);
    expect(result.success).toBe(false);
  });
});

describe('processDelivery error paths', () => {
  let service: WebhookService;
  const mockRepo = vi.mocked(webhookRepo);
  const mockTenantId = randomUUID();
  const mockSubscriptionId = randomUUID();
  const mockDeliveryId = randomUUID();
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
    secretHash: 'hashed-secret',
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

  beforeAll(() => {
    service = new WebhookService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('circuit breaker open', () => {
    it('throws WebhookCircuitBreakerOpenError when circuit breaker is open', async () => {
      const mockBreaker = buildCircuitBreakerDb({ isOpen: true });

      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(mockBreaker);

      await expect(
        service.processDelivery(
          mockDeliveryId,
          mockSubscriptionId,
          mockTenantId,
          'https://example.com/webhook',
          { eventId: randomUUID() },
          randomUUID(),
          'auth.user.created',
          1,
          3,
        ),
      ).rejects.toThrow(WebhookCircuitBreakerOpenError);
    });
  });

  describe('subscription invalid status', () => {
    it('throws WebhookSubscriptionInvalidStatusError when subscription is null', async () => {
      const mockBreaker = buildCircuitBreakerDb({ isOpen: false });

      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(mockBreaker);
      mockRepo.getSubscriptionById.mockResolvedValue(undefined);

      await expect(
        service.processDelivery(
          mockDeliveryId,
          mockSubscriptionId,
          mockTenantId,
          'https://example.com/webhook',
          { eventId: randomUUID() },
          randomUUID(),
          'auth.user.created',
          1,
          3,
        ),
      ).rejects.toThrow(WebhookSubscriptionInvalidStatusError);
    });

    it('throws WebhookSubscriptionInvalidStatusError when subscription status is not active', async () => {
      const mockBreaker = buildCircuitBreakerDb({ isOpen: false });
      const mockSubscription = buildSubscriptionDb({ status: 'disabled' });

      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(mockBreaker);
      mockRepo.getSubscriptionById.mockResolvedValue(mockSubscription);

      await expect(
        service.processDelivery(
          mockDeliveryId,
          mockSubscriptionId,
          mockTenantId,
          'https://example.com/webhook',
          { eventId: randomUUID() },
          randomUUID(),
          'auth.user.created',
          1,
          3,
        ),
      ).rejects.toThrow(WebhookSubscriptionInvalidStatusError);
    });
  });

  describe('max retries exceeded', () => {
    it('throws WebhookDeliveryMaxRetriesExceededError when delivery fails after max attempts', async () => {
      const mockBreaker = buildCircuitBreakerDb({ isOpen: false });
      const mockSubscription = buildSubscriptionDb({ status: 'active' });

      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(mockBreaker);
      mockRepo.getSubscriptionById.mockResolvedValue(mockSubscription);
      mockRepo.updateDelivery.mockResolvedValue({} as WebhookDeliveryDb);
      mockRepo.updateCircuitBreaker.mockResolvedValue(mockBreaker);

      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }),
        );

      await expect(
        service.processDelivery(
          mockDeliveryId,
          mockSubscriptionId,
          mockTenantId,
          'https://example.com/webhook',
          { eventId: randomUUID() },
          randomUUID(),
          'auth.user.created',
          3,
          3,
        ),
      ).rejects.toThrow(WebhookDeliveryMaxRetriesExceededError);

      fetchMock.mockRestore();
    });
  });
});
