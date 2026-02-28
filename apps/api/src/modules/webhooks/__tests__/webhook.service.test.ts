import { randomUUID } from 'crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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

vi.mock('../webhook.repo.js');

describe('WebhookService', () => {
  let service: WebhookService;
  let mockRepo: {
    createSubscription: ReturnType<typeof vi.fn>;
    getSubscriptionById: ReturnType<typeof vi.fn>;
    listSubscriptions: ReturnType<typeof vi.fn>;
    updateSubscription: ReturnType<typeof vi.fn>;
    deleteSubscription: ReturnType<typeof vi.fn>;
    getActiveSubscriptionsForEvent: ReturnType<typeof vi.fn>;
    createDelivery: ReturnType<typeof vi.fn>;
    getDeliveryById: ReturnType<typeof vi.fn>;
    listDeliveries: ReturnType<typeof vi.fn>;
    updateDelivery: ReturnType<typeof vi.fn>;
    getOrCreateCircuitBreaker: ReturnType<typeof vi.fn>;
    updateCircuitBreaker: ReturnType<typeof vi.fn>;
  };

  const mockTenantId = randomUUID();
  const mockSubscriptionId = randomUUID();
  const mockSecret = 'test-secret';
  const mockSecretHash = 'hashed-secret';

  beforeAll(() => {
    service = new WebhookService();
    mockRepo = {
      createSubscription: vi.fn(),
      getSubscriptionById: vi.fn(),
      listSubscriptions: vi.fn(),
      updateSubscription: vi.fn(),
      deleteSubscription: vi.fn(),
      getActiveSubscriptionsForEvent: vi.fn(),
      createDelivery: vi.fn(),
      getDeliveryById: vi.fn(),
      listDeliveries: vi.fn(),
      updateDelivery: vi.fn(),
      getOrCreateCircuitBreaker: vi.fn(),
      updateCircuitBreaker: vi.fn(),
    };
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a webhook subscription with test_pending status', async () => {
      const mockDbSubscription = {
        id: mockSubscriptionId,
        tenantId: mockTenantId,
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        eventTypes: JSON.stringify(['auth.user.created']),
        status: 'test_pending',
        secretHash: mockSecretHash,
        filters: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        testPendingAt: new Date(),
      };

      mockRepo.createSubscription.mockResolvedValue([mockDbSubscription]);

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
      const mockDbSubscription = {
        id: mockSubscriptionId,
        tenantId: mockTenantId,
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        eventTypes: JSON.stringify(['auth.user.created']),
        status: 'active',
        secretHash: mockSecretHash,
        filters: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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
      const mockDbSubscriptions = [
        {
          id: mockSubscriptionId,
          tenantId: mockTenantId,
          name: 'Test Webhook',
          targetUrl: 'https://example.com/webhook',
          eventTypes: JSON.stringify(['auth.user.created']),
          status: 'active',
          secretHash: mockSecretHash,
          filters: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

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
      const mockDbSubscription = {
        id: mockSubscriptionId,
        tenantId: mockTenantId,
        name: 'Test Webhook',
        targetUrl: 'https://example.com/webhook',
        eventTypes: JSON.stringify(['auth.user.created']),
        status: 'disabled',
        secretHash: mockSecretHash,
        filters: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        disabledAt: new Date(),
      };

      mockRepo.getSubscriptionById.mockResolvedValue({
        ...mockDbSubscription,
        status: 'active',
      });
      mockRepo.updateSubscription.mockResolvedValue([mockDbSubscription]);

      const result = await service.updateSubscription(mockTenantId, mockSubscriptionId, {
        status: WebhookSubscriptionStatus.DISABLED,
      });

      expect(result.status).toBe(WebhookSubscriptionStatus.DISABLED);
      expect(mockRepo.updateSubscription).toHaveBeenCalled();
    });
  });

  describe('deleteSubscription', () => {
    it('should delete subscription when found', async () => {
      mockRepo.getSubscriptionById.mockResolvedValue({
        id: mockSubscriptionId,
        tenantId: mockTenantId,
      });
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
      const mockBreaker = {
        id: randomUUID(),
        subscriptionId: mockSubscriptionId,
        totalRequests: 19,
        failedRequests: 18,
        consecutiveFailures: 18,
        isOpen: false,
      };

      mockRepo.getOrCreateCircuitBreaker.mockResolvedValue(mockBreaker);
      mockRepo.updateCircuitBreaker.mockResolvedValue({ ...mockBreaker, isOpen: true });

      await service['updateCircuitBreaker'](mockSubscriptionId, false);

      expect(mockRepo.updateCircuitBreaker).toHaveBeenCalled();
    });

    it('should close circuit breaker when success occurs', async () => {
      const mockBreaker = {
        id: randomUUID(),
        subscriptionId: mockSubscriptionId,
        totalRequests: 20,
        failedRequests: 19,
        consecutiveFailures: 1,
        isOpen: true,
        openedAt: new Date(),
      };

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
    expect(WEBHOOK_RETRY_DELAYS_MS[4]).toBe(8 * 60 * 60 * 1000);
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
