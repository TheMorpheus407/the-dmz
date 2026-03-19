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
} from '@the-dmz/shared/contracts';

import { WebhookService } from '../webhook.service.js';
import {
  WebhookSubscriptionNotFoundError,
  WebhookSignatureInvalidError,
  WebhookSignatureExpiredError,
} from '../webhook.errors.js';
import { webhookRepo } from '../webhook.repo.js';

import type {
  WebhookCircuitBreakerDb,
  WebhookSubscriptionDb,
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
    expect(WEBHOOK_RATE_LIMITS.TEST.limit).toBe(10);
  });
});
