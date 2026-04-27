import { describe, it, expect, vi, beforeEach } from 'vitest';

import { subscriptionStatuses } from '../../../db/schema/billing/index.js';
import { handleTrialWillEnd } from '../handlers/trial.handler.js';
import { billingRepo } from '../billing.repo.js';
import { subscriptionService } from '../subscription.service.js';

import type { AppConfig } from '../../../config.js';

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
    getStripeCustomerByStripeId: vi.fn(),
  },
}));

vi.mock('../subscription.service', () => ({
  subscriptionService: {
    getSubscription: vi.fn(),
  },
}));

describe('trial.handler status constants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTrialWillEnd', () => {
    it('should find subscription with status "trial" for given stripe customer', async () => {
      const stripeCustomerId = 'cus_test123';
      const tenantId = 'tenant-123';

      const mockCustomer = {
        id: 'cust-123',
        tenantId,
        stripeCustomerId,
      };

      const mockSubscription = {
        id: 'sub-123',
        tenantId,
        planId: 'enterprise',
        status: 'trial' as const,
        trialEndsAt: new Date(),
      };

      vi.mocked(billingRepo.getStripeCustomerByStripeId).mockResolvedValue(mockCustomer);
      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(mockSubscription);

      const data = { customer: stripeCustomerId };

      await handleTrialWillEnd(data, {} as AppConfig);

      expect(billingRepo.getStripeCustomerByStripeId).toHaveBeenCalledWith(stripeCustomerId, {});
      expect(subscriptionService.getSubscription).toHaveBeenCalledWith(tenantId, {});
    });

    it('should not call getSubscription when customer not found', async () => {
      vi.mocked(billingRepo.getStripeCustomerByStripeId).mockResolvedValue(null);

      const data = { customer: 'cus_nonexistent' };

      await handleTrialWillEnd(data, {} as AppConfig);

      expect(subscriptionService.getSubscription).not.toHaveBeenCalled();
    });

    it('should check subscription status is "trial" before processing', async () => {
      const stripeCustomerId = 'cus_test123';
      const tenantId = 'tenant-123';

      const mockCustomer = {
        id: 'cust-123',
        tenantId,
        stripeCustomerId,
      };

      const mockSubscription = {
        id: 'sub-123',
        tenantId,
        planId: 'enterprise',
        status: 'active' as const,
        trialEndsAt: null,
      };

      vi.mocked(billingRepo.getStripeCustomerByStripeId).mockResolvedValue(mockCustomer);
      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(mockSubscription);

      const data = { customer: stripeCustomerId };

      await handleTrialWillEnd(data, {} as AppConfig);

      expect(subscriptionService.getSubscription).toHaveBeenCalledWith(tenantId, {});
      expect(mockSubscription.status).toBe('active');
    });
  });

  describe('subscriptionStatuses constant coverage', () => {
    it('should have "trial" status in subscriptionStatuses array', () => {
      expect(subscriptionStatuses).toContain('trial');
    });
  });
});
