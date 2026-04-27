import { describe, it, expect, vi, beforeEach } from 'vitest';

import { subscriptionStatuses } from '../../../db/schema/billing/index.js';
import { entitlementsService } from '../entitlements.service.js';
import { subscriptionService } from '../subscription.service.js';

vi.mock('../../shared/database/connection.js', () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock('../subscription.service', () => ({
  subscriptionService: {
    getSubscription: vi.fn(),
  },
}));

vi.mock('../seat.service', () => ({
  seatService: {
    getSeatInfo: vi.fn(),
  },
}));

describe('entitlementsService status constants', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await entitlementsService.invalidateCache('tenant-123');
  });

  describe('getEntitlements isActive logic', () => {
    it('should return isActive=true when subscription status is "active"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active' as const,
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.planId).toBe('enterprise');
    });

    it('should return isActive=true when subscription status is "trial"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'trial' as const,
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.planId).toBe('enterprise');
    });

    it('should return isActive=false when subscription status is "expired"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'expired' as const,
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(false);
    });

    it('should return isActive=false when subscription status is "suspended"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'suspended' as const,
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(false);
    });

    it('should return isActive=false when subscription status is "cancelled"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'cancelled' as const,
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(false);
    });

    it('should return isActive=false when subscription status is "past_due"', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'past_due' as const,
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(false);
    });

    it('should return isActive=false when no subscription exists', async () => {
      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(null);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(false);
      expect(result.planId).toBeNull();
      expect(Object.keys(result.features).length).toBe(0);
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
