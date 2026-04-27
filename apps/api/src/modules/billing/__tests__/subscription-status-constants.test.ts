import { describe, it, expect, vi, beforeEach } from 'vitest';

import { subscriptionStatuses } from '../../../db/schema/billing/index.js';
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

describe('subscriptionService status constants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscriptionStatus', () => {
    it('should return isActive=true for status "active"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active' as const,
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

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(false);
      expect(result.isExpired).toBe(false);
    });

    it('should return isActive=true and isTrial=true for status "trial"', async () => {
      const trialEndDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5);
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial' as const,
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

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(true);
      expect(result.isExpired).toBe(false);
    });

    it('should return isActive=false for status "expired"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'expired' as const,
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

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(false);
      expect(result.isTrial).toBe(false);
      expect(result.isExpired).toBe(true);
    });

    it('should return isActive=false for status "suspended"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'suspended' as const,
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

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(false);
      expect(result.isTrial).toBe(false);
      expect(result.isExpired).toBe(false);
    });

    it('should return isActive=false for status "cancelled"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'cancelled' as const,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelledAt: new Date(),
        cancelAtPeriodEnd: false,
        seatLimit: -1,
        overagePolicy: 'deny',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(false);
      expect(result.isTrial).toBe(false);
      expect(result.isExpired).toBe(false);
    });

    it('should return isActive=false for status "past_due"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'past_due' as const,
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

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);

      const result = await subscriptionService.getSubscriptionStatus('tenant-123');

      expect(result.isActive).toBe(false);
      expect(result.isTrial).toBe(false);
      expect(result.isExpired).toBe(false);
    });
  });

  describe('isTrialExpired', () => {
    it('should return false for status "trial" with future trialEndsAt', () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial' as const,
        trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
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

      const result = subscriptionService.isTrialExpired(subscription);

      expect(result).toBe(false);
    });

    it('should return true for status "trial" with past trialEndsAt', () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial' as const,
        trialEndsAt: new Date(Date.now() - 1000),
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

      const result = subscriptionService.isTrialExpired(subscription);

      expect(result).toBe(true);
    });

    it('should return false for status "active" regardless of trialEndsAt', () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active' as const,
        trialEndsAt: new Date(Date.now() - 1000),
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

      const result = subscriptionService.isTrialExpired(subscription);

      expect(result).toBe(false);
    });
  });

  describe('transitionFromTrial', () => {
    it('should transition from "trial" to "active"', async () => {
      const trialSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial' as const,
        trialEndsAt: new Date(),
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

      const activeSubscription = {
        ...trialSubscription,
        status: 'active' as const,
        trialEndsAt: null,
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(trialSubscription);
      vi.mocked(billingRepo.updateSubscription).mockResolvedValue(activeSubscription);

      const result = await subscriptionService.transitionFromTrial('tenant-123');

      expect(result?.status).toBe('active');
      expect(result?.trialEndsAt).toBeNull();
    });

    it('should return null when subscription status is not "trial"', async () => {
      const activeSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active' as const,
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

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(activeSubscription);

      const result = await subscriptionService.transitionFromTrial('tenant-123');

      expect(result).toBeNull();
    });
  });

  describe('expireTrial', () => {
    it('should expire trial subscription by setting status to "expired"', async () => {
      const trialSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial' as const,
        trialEndsAt: new Date(),
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

      const expiredSubscription = {
        ...trialSubscription,
        status: 'expired' as const,
        trialEndsAt: null,
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(trialSubscription);
      vi.mocked(billingRepo.updateSubscription).mockResolvedValue(expiredSubscription);

      const result = await subscriptionService.expireTrial('tenant-123');

      expect(result?.status).toBe('expired');
      expect(result?.trialEndsAt).toBeNull();
    });

    it('should return null when subscription status is not "trial"', async () => {
      const activeSubscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active' as const,
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

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(activeSubscription);

      const result = await subscriptionService.expireTrial('tenant-123');

      expect(result).toBeNull();
    });
  });

  describe('suspendSubscription', () => {
    it('should set status to "suspended"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active' as const,
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

      const suspendedSubscription = {
        ...subscription,
        status: 'suspended' as const,
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);
      vi.mocked(billingRepo.updateSubscriptionStatus).mockResolvedValue(suspendedSubscription);

      const result = await subscriptionService.suspendSubscription('tenant-123');

      expect(result?.status).toBe('suspended');
      expect(billingRepo.updateSubscriptionStatus).toHaveBeenCalledWith(
        'sub-123',
        'suspended',
        undefined,
      );
    });
  });

  describe('markPastDue', () => {
    it('should set status to "past_due"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active' as const,
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

      const pastDueSubscription = {
        ...subscription,
        status: 'past_due' as const,
      };

      vi.mocked(billingRepo.getSubscriptionByTenantId).mockResolvedValue(subscription);
      vi.mocked(billingRepo.updateSubscriptionStatus).mockResolvedValue(pastDueSubscription);

      const result = await subscriptionService.markPastDue('tenant-123');

      expect(result?.status).toBe('past_due');
      expect(billingRepo.updateSubscriptionStatus).toHaveBeenCalledWith(
        'sub-123',
        'past_due',
        undefined,
      );
    });
  });

  describe('subscriptionStatuses constant coverage', () => {
    it('should have all expected status values in subscriptionStatuses array', () => {
      expect(subscriptionStatuses).toContain('trial');
      expect(subscriptionStatuses).toContain('active');
      expect(subscriptionStatuses).toContain('suspended');
      expect(subscriptionStatuses).toContain('cancelled');
      expect(subscriptionStatuses).toContain('past_due');
      expect(subscriptionStatuses).toContain('expired');
    });
  });
});
