/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { entitlementsService } from '../entitlements.service.js';
import { subscriptionService } from '../subscription.service.js';
import { seatService } from '../seat.service.js';

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

describe('entitlementsService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await entitlementsService.invalidateCache('tenant-123');
  });

  describe('checkFeature', () => {
    it('should return allowed true for enabled feature', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.checkFeature('tenant-123', 'training_campaigns');

      expect(result.allowed).toBe(true);
    });

    it('should return allowed false for disabled feature', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.checkFeature('tenant-123', 'advanced_analytics');

      expect(result.allowed).toBe(false);
    });

    it('should return not allowed when no subscription exists', async () => {
      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(null);

      const result = await entitlementsService.checkFeature('tenant-123', 'training_campaigns');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No subscription found');
    });
  });

  describe('checkApiAccess', () => {
    it('should allow API access for enterprise plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.checkApiAccess('tenant-123');

      expect(result.allowed).toBe(true);
    });

    it('should deny API access for starter plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.checkApiAccess('tenant-123');

      expect(result.allowed).toBe(false);
    });
  });

  describe('checkSeatAllocation', () => {
    it('should allow seat allocation when seats available', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'professional',
        status: 'active',
        seatLimit: 500,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(seatService.getSeatInfo).mockResolvedValue({
        currentSeats: 100,
        seatLimit: 500,
        availableSeats: 400,
        isUnlimited: false,
        usagePercentage: 20,
      });

      const result = await entitlementsService.checkSeatAllocation('tenant-123');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(500);
      expect(result.current).toBe(100);
    });

    it('should allow unlimited seats for enterprise plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(seatService.getSeatInfo).mockResolvedValue({
        currentSeats: 1000,
        seatLimit: -1,
        availableSeats: -1,
        isUnlimited: true,
        usagePercentage: 0,
      });

      const result = await entitlementsService.checkSeatAllocation('tenant-123');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should deny seat allocation when at limit with deny policy', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(seatService.getSeatInfo).mockResolvedValue({
        currentSeats: 100,
        seatLimit: 100,
        availableSeats: 0,
        isUnlimited: false,
        usagePercentage: 100,
      });

      const result = await entitlementsService.checkSeatAllocation('tenant-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Seat limit reached');
    });

    it('should allow overage with notify policy', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'notify',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(seatService.getSeatInfo).mockResolvedValue({
        currentSeats: 100,
        seatLimit: 100,
        availableSeats: 0,
        isUnlimited: false,
        usagePercentage: 100,
      });

      const result = await entitlementsService.checkSeatAllocation('tenant-123');

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('notification');
    });
  });

  describe('checkStorageLimit', () => {
    it('should allow storage within limit', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'professional',
        status: 'active',
        seatLimit: 500,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.checkStorageLimit('tenant-123', 50);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
    });

    it('should deny storage over limit', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.checkStorageLimit('tenant-123', 50);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Storage limit exceeded');
      expect(result.limit).toBe(10);
    });

    it('should allow unlimited storage for enterprise', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.checkStorageLimit('tenant-123', 10000);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe('getEntitlements', () => {
    it('should return entitlements for active subscription', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.planId).toBe('enterprise');
      expect(result.features['training_campaigns']).toBe(true);
      expect(result.features['api_access']).toBe(true);
      expect(result.limits.seatLimit).toBe(-1);
    });

    it('should return inactive for expired subscription', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'expired',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(false);
    });

    it('should return empty entitlements when no subscription', async () => {
      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(null);

      const result = await entitlementsService.getEntitlements('tenant-123');

      expect(result.isActive).toBe(false);
      expect(result.planId).toBeNull();
      expect(Object.keys(result.features).length).toBe(0);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled feature', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'professional',
        status: 'active',
        seatLimit: 500,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.isFeatureEnabled(
        'tenant-123',
        'phishing_simulation',
      );

      expect(result).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'professional',
        status: 'active',
        seatLimit: 500,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.isFeatureEnabled('tenant-123', 'api_access');

      expect(result).toBe(false);
    });
  });

  describe('getPlanFeatures', () => {
    it('should return features for enterprise plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.getPlanFeatures('tenant-123');

      expect(result['training_campaigns']).toBe(true);
      expect(result['api_access']).toBe(true);
      expect(result['fedramp_compliance']).toBe(false);
    });

    it('should return government features for government plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'government',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);

      const result = await entitlementsService.getPlanFeatures('tenant-123');

      expect(result['fedramp_compliance']).toBe(true);
      expect(result['data_residency']).toBe(true);
    });
  });
});
