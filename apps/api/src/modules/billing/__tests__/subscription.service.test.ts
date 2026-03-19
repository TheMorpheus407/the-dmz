/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { subscriptionService } from '../subscription.service.js';
import { billingRepo } from '../billing.repo.js';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    query: {
      subscriptions: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
  })),
}));

vi.mock('../billing.repo', () => ({
  billingRepo: {
    getSubscriptionByTenantId: vi.fn(),
    getSubscriptionById: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
  },
}));

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscription', () => {
    it('should return subscription for tenant', async () => {
      const mockSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(mockSubscription as any);

      const result = await subscriptionService.getSubscription('tenant-123');

      expect(result).toEqual(mockSubscription);
      expect(billingRepo.getSubscriptionByTenantId).toHaveBeenCalledWith('tenant-123', undefined);
    });

    it('should return null when no subscription exists', async () => {
      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(null);

      const result = await subscriptionService.getSubscription('tenant-123');

      expect(result).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription with trial period', async () => {
      const input = {
        tenantId: 'tenant-123',
        planId: 'enterprise',
        trialDays: 14,
      };

      const mockSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial',
        trialEndsAt: expect.any(Date),
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(null);
      vi.mocked(billingRepo.createSubscription).mockResolvedValue(mockSubscription as any);

      const result = await subscriptionService.createSubscription(input);

      expect(result.isNew).toBe(true);
      expect(result.subscription.status).toBe('trial');
      expect(billingRepo.createSubscription).toHaveBeenCalled();
    });

    it('should return existing subscription if already exists', async () => {
      const existingSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(
        existingSubscription as any,
      );

      const result = await subscriptionService.createSubscription({
        tenantId: 'tenant-123',
        planId: 'enterprise',
      });

      expect(result.isNew).toBe(false);
      expect(result.subscription).toEqual(existingSubscription);
      expect(billingRepo.createSubscription).not.toHaveBeenCalled();
    });

    it('should create subscription without trial when trialDays is 0', async () => {
      const input = {
        tenantId: 'tenant-123',
        planId: 'starter',
        trialDays: 0,
      };

      const mockSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        trialEndsAt: null,
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(null);
      vi.mocked(billingRepo.createSubscription).mockResolvedValue(mockSubscription as any);

      const result = await subscriptionService.createSubscription(input);

      expect(result.isNew).toBe(true);
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.trialEndsAt).toBeNull();
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription when it exists', async () => {
      const existingSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      const updatedSubscription = {
        ...existingSubscription,
        planId: 'professional',
        seatLimit: 500,
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(
        existingSubscription as any,
      );
      vi.mocked(billingRepo.updateSubscription).mockResolvedValue(updatedSubscription as any);

      const result = await subscriptionService.updateSubscription('tenant-123', {
        planId: 'professional',
      });

      expect(result).toEqual(updatedSubscription);
      expect(billingRepo.updateSubscription).toHaveBeenCalledWith(
        'sub-123',
        expect.objectContaining({ planId: 'professional' }),
        undefined,
      );
    });

    it('should return null when subscription does not exist', async () => {
      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(null);

      const result = await subscriptionService.updateSubscription('tenant-123', {
        planId: 'professional',
      });

      expect(result).toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const existingSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        cancelAtPeriodEnd: false,
      };

      const cancelledSubscription = {
        ...existingSubscription,
        cancelAtPeriodEnd: true,
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(
        existingSubscription as any,
      );
      vi.mocked(billingRepo.updateSubscription).mockResolvedValue(cancelledSubscription as any);

      const result = await subscriptionService.cancelSubscription('tenant-123', true);

      expect(result?.cancelAtPeriodEnd).toBe(true);
      expect(result?.status).toBe('active');
    });

    it('should cancel subscription immediately', async () => {
      const existingSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      };

      const cancelledSubscription = {
        ...existingSubscription,
        status: 'cancelled',
        cancelledAt: expect.any(Date),
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(
        existingSubscription as any,
      );
      vi.mocked(billingRepo.updateSubscription).mockResolvedValue(cancelledSubscription as any);

      const result = await subscriptionService.cancelSubscription('tenant-123', false);

      expect(result?.status).toBe('cancelled');
      expect(result?.cancelledAt).toBeDefined();
    });
  });

  describe('transitionFromTrial', () => {
    it('should transition trial subscription to active', async () => {
      const trialSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial',
        trialEndsAt: new Date(),
      };

      const activeSubscription = {
        ...trialSubscription,
        status: 'active',
        trialEndsAt: null,
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(trialSubscription as any);
      vi.mocked(billingRepo.updateSubscription).mockResolvedValue(activeSubscription as any);

      const result = await subscriptionService.transitionFromTrial('tenant-123');

      expect(result?.status).toBe('active');
      expect(result?.trialEndsAt).toBeNull();
    });

    it('should return null if subscription is not in trial', async () => {
      const activeSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(activeSubscription as any);

      const result = await subscriptionService.transitionFromTrial('tenant-123');

      expect(result).toBeNull();
    });
  });

  describe('isTrialExpired', () => {
    it('should return true if trial has expired', () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial',
        trialEndsAt: new Date(Date.now() - 1000),
      };

      const result = subscriptionService.isTrialExpired(subscription as any);

      expect(result).toBe(true);
    });

    it('should return false if trial has not expired', () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      };

      const result = subscriptionService.isTrialExpired(subscription as any);

      expect(result).toBe(false);
    });

    it('should return false if subscription is not in trial', () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelledAt: null,
        cancelAtPeriodEnd: false,
        seatLimit: -1,
        overagePolicy: 'deny',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = subscriptionService.isTrialExpired(subscription as any);

      expect(result).toBe(false);
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return correct status for active subscription', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelledAt: null,
        cancelAtPeriodEnd: false,
        seatLimit: -1,
        overagePolicy: 'deny',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription as any);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(false);
      expect(result.isExpired).toBe(false);
      expect(result.planId).toBe('enterprise');
    });

    it('should return correct status for trial subscription with days remaining', async () => {
      const trialEndDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5);
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'professional',
        status: 'trial',
        trialEndsAt: trialEndDate,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelledAt: null,
        cancelAtPeriodEnd: false,
        seatLimit: -1,
        overagePolicy: 'deny',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription as any);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.daysUntilExpiry).toBe(5);
    });

    it('should return inactive status when no subscription exists', async () => {
      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(null);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(false);
      expect(result.isTrial).toBe(false);
      expect(result.isExpired).toBe(false);
      expect(result.planId).toBeNull();
    });
  });
});
