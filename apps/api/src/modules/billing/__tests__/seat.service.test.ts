/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { seatService } from '../seat.service.js';
import { billingRepo } from '../billing.repo.js';
import { subscriptionService } from '../subscription.service.js';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    query: {
      seats: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  })),
}));

vi.mock('../billing.repo', () => ({
  billingRepo: {
    getSubscriptionByTenantId: vi.fn(),
    countSeats: vi.fn(),
    getSeat: vi.fn(),
    allocateSeat: vi.fn(),
    deallocateSeat: vi.fn(),
    recordSeatHistory: vi.fn(),
    getSeatHistory: vi.fn(),
  },
}));

vi.mock('../subscription.service', () => ({
  subscriptionService: {
    getSubscription: vi.fn(),
  },
}));

describe('seatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSeatInfo', () => {
    it('should return seat info for unlimited plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(250);

      const result = await seatService.getSeatInfo('tenant-123');

      expect(result.currentSeats).toBe(250);
      expect(result.seatLimit).toBe(-1);
      expect(result.isUnlimited).toBe(true);
      expect(result.availableSeats).toBe(-1);
      expect(result.usagePercentage).toBe(0);
    });

    it('should return seat info with correct usage for limited plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'professional',
        status: 'active',
        seatLimit: 500,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(400);

      const result = await seatService.getSeatInfo('tenant-123');

      expect(result.currentSeats).toBe(400);
      expect(result.seatLimit).toBe(500);
      expect(result.isUnlimited).toBe(false);
      expect(result.availableSeats).toBe(100);
      expect(result.usagePercentage).toBe(80);
    });

    it('should return zero available seats when at limit', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(100);

      const result = await seatService.getSeatInfo('tenant-123');

      expect(result.availableSeats).toBe(0);
      expect(result.usagePercentage).toBe(100);
    });

    it('should return zero limits when no subscription exists', async () => {
      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(null);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(0);

      const result = await seatService.getSeatInfo('tenant-123');

      expect(result.currentSeats).toBe(0);
      expect(result.seatLimit).toBe(0);
      expect(result.isUnlimited).toBe(false);
      expect(result.availableSeats).toBe(0);
    });
  });

  describe('allocateSeat', () => {
    it('should allocate seat when under limit', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.getSeat).mockResolvedValue(null);
      vi.mocked(billingRepo.countSeats).mockResolvedValueOnce(50).mockResolvedValueOnce(51);
      vi.mocked(billingRepo.allocateSeat).mockResolvedValue({
        id: 'seat-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        allocatedAt: new Date(),
      } as any);
      vi.mocked(billingRepo.recordSeatHistory).mockResolvedValue({
        id: 'history-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        action: 'allocated',
        seatsDelta: 1,
      } as any);

      const result = await seatService.allocateSeat('tenant-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.allocated).toBe(true);
      expect(result.seatCount).toBe(51);
    });

    it('should deny allocation when at limit with deny policy', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.getSeat).mockResolvedValue(null);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(100);

      const result = await seatService.allocateSeat('tenant-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.allocated).toBe(false);
      expect(result.reason).toBe('Seat limit reached');
    });

    it('should allow allocation when at limit with allow policy', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'allow',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.getSeat).mockResolvedValue(null);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(100);
      vi.mocked(billingRepo.allocateSeat).mockResolvedValue({
        id: 'seat-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        allocatedAt: new Date(),
      } as any);
      vi.mocked(billingRepo.recordSeatHistory).mockResolvedValue({
        id: 'history-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        action: 'allocated',
        seatsDelta: 1,
      } as any);

      const result = await seatService.allocateSeat('tenant-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.allocated).toBe(true);
    });

    it('should return existing seat if already allocated', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.getSeat).mockResolvedValue({
        id: 'seat-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      } as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(50);

      const result = await seatService.allocateSeat('tenant-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.allocated).toBe(true);
      expect(result.reason).toBe('User already has a seat allocated');
    });

    it('should fail when no subscription exists', async () => {
      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(null);

      const result = await seatService.allocateSeat('tenant-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('No subscription found for tenant');
    });
  });

  describe('deallocateSeat', () => {
    it('should deallocate existing seat', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.getSeat).mockResolvedValue({
        id: 'seat-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      } as any);
      vi.mocked(billingRepo.deallocateSeat).mockResolvedValue(true);
      vi.mocked(billingRepo.recordSeatHistory).mockResolvedValue({
        id: 'history-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        action: 'deallocated',
        seatsDelta: -1,
      } as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(49);

      const result = await seatService.deallocateSeat('tenant-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.deallocated).toBe(true);
      expect(result.seatCount).toBe(49);
    });

    it('should handle deallocating non-existent seat gracefully', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.getSeat).mockResolvedValue(null);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(50);

      const result = await seatService.deallocateSeat('tenant-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.deallocated).toBe(false);
      expect(result.seatCount).toBe(50);
    });
  });

  describe('hasAvailableSeats', () => {
    it('should return true when seats available', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(50);

      const result = await seatService.hasAvailableSeats('tenant-123');

      expect(result).toBe(true);
    });

    it('should return false when at limit', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(100);

      const result = await seatService.hasAvailableSeats('tenant-123');

      expect(result).toBe(false);
    });

    it('should return true for unlimited plan', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'enterprise',
        status: 'active',
        seatLimit: -1,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(10000);

      const result = await seatService.hasAvailableSeats('tenant-123');

      expect(result).toBe(true);
    });
  });

  describe('checkSeatAlertThresholds', () => {
    it('should return warning alert at 80% usage', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(80);

      const result = await seatService.checkSeatAlertThresholds('tenant-123', {
        warning: 0.8,
        critical: 1.0,
      });

      expect(result.alert).toBe('warning');
      expect(result.percentage).toBe(80);
    });

    it('should return critical alert at 100% usage', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(100);

      const result = await seatService.checkSeatAlertThresholds('tenant-123', {
        warning: 0.8,
        critical: 1.0,
      });

      expect(result.alert).toBe('critical');
      expect(result.percentage).toBe(100);
    });

    it('should return none alert under threshold', async () => {
      const subscription = {
        id: 'sub-123',
        tenantId: 'tenant-123',
        planId: 'starter',
        status: 'active',
        seatLimit: 100,
        overagePolicy: 'deny',
      };

      vi.mocked(subscriptionService.getSubscription).mockResolvedValue(subscription as any);
      vi.mocked(billingRepo.countSeats).mockResolvedValue(50);

      const result = await seatService.checkSeatAlertThresholds('tenant-123', {
        warning: 0.8,
        critical: 1.0,
      });

      expect(result.alert).toBe('none');
      expect(result.percentage).toBe(50);
    });
  });
});
