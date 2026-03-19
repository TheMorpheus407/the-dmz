import { billingRepo } from './billing.repo.js';
import { subscriptionService } from './subscription.service.js';

import type { SeatAllocationResult, SeatDeallocationResult } from './billing.types.js';
import type { AppConfig } from '../../config.js';

export interface SeatInfo {
  currentSeats: number;
  seatLimit: number;
  availableSeats: number;
  isUnlimited: boolean;
  usagePercentage: number;
}

export interface SeatAlertThresholds {
  warning: number;
  critical: number;
}

const DEFAULT_SEAT_ALERT_THRESHOLDS: SeatAlertThresholds = {
  warning: 0.8,
  critical: 1.0,
};

export const seatService = {
  async getSeatInfo(tenantId: string, config?: AppConfig): Promise<SeatInfo> {
    const subscription = await subscriptionService.getSubscription(tenantId, config);
    const currentSeats = await billingRepo.countSeats(tenantId, config);

    if (!subscription) {
      return {
        currentSeats,
        seatLimit: 0,
        availableSeats: 0,
        isUnlimited: false,
        usagePercentage: 100,
      };
    }

    const seatLimit = subscription.seatLimit;
    const isUnlimited = seatLimit === -1;

    if (isUnlimited) {
      return {
        currentSeats,
        seatLimit: -1,
        availableSeats: -1,
        isUnlimited: true,
        usagePercentage: 0,
      };
    }

    const availableSeats = Math.max(0, seatLimit - currentSeats);
    const usagePercentage = seatLimit > 0 ? (currentSeats / seatLimit) * 100 : 100;

    return {
      currentSeats,
      seatLimit,
      availableSeats,
      isUnlimited: false,
      usagePercentage,
    };
  },

  async allocateSeat(
    tenantId: string,
    userId: string,
    allocatedBy?: string,
    config?: AppConfig,
  ): Promise<SeatAllocationResult> {
    const subscription = await subscriptionService.getSubscription(tenantId, config);

    if (!subscription) {
      return {
        success: false,
        allocated: false,
        seatCount: 0,
        seatLimit: 0,
        reason: 'No subscription found for tenant',
      };
    }

    const seatLimit = subscription.seatLimit;
    const isUnlimited = seatLimit === -1;
    const overagePolicy = subscription.overagePolicy;

    const existingSeat = await billingRepo.getSeat(tenantId, userId, config);
    if (existingSeat) {
      return {
        success: true,
        allocated: true,
        seatCount: await billingRepo.countSeats(tenantId, config),
        seatLimit,
        reason: 'User already has a seat allocated',
      };
    }

    const currentSeats = await billingRepo.countSeats(tenantId, config);

    if (!isUnlimited && currentSeats >= seatLimit) {
      if (overagePolicy === 'allow') {
        // Allow overage - proceed with allocation
      } else if (overagePolicy === 'notify') {
        // Allow but log for notification (proceed with allocation)
      } else {
        // deny
        return {
          success: false,
          allocated: false,
          seatCount: currentSeats,
          seatLimit,
          reason: 'Seat limit reached',
        };
      }
    }

    try {
      await billingRepo.allocateSeat(
        {
          tenantId,
          userId,
          allocatedBy: allocatedBy ?? null,
        },
        config,
      );

      await billingRepo.recordSeatHistory(
        {
          tenantId,
          userId,
          action: 'allocated',
          seatsDelta: 1,
          seatLimitAtAction: seatLimit,
          performedBy: allocatedBy ?? null,
        },
        config,
      );
    } catch {
      const newCount = await billingRepo.countSeats(tenantId, config);
      return {
        success: false,
        allocated: false,
        seatCount: newCount,
        seatLimit,
        reason: 'Failed to allocate seat',
      };
    }

    const newCount = await billingRepo.countSeats(tenantId, config);

    return {
      success: true,
      allocated: true,
      seatCount: newCount,
      seatLimit,
    };
  },

  async deallocateSeat(
    tenantId: string,
    userId: string,
    performedBy?: string,
    config?: AppConfig,
  ): Promise<SeatDeallocationResult> {
    const subscription = await subscriptionService.getSubscription(tenantId, config);
    const seatLimit = subscription?.seatLimit ?? 0;

    const existingSeat = await billingRepo.getSeat(tenantId, userId, config);
    if (!existingSeat) {
      const currentCount = await billingRepo.countSeats(tenantId, config);
      return {
        success: true,
        deallocated: false,
        seatCount: currentCount,
      };
    }

    const deallocated = await billingRepo.deallocateSeat(tenantId, userId, config);

    if (deallocated) {
      await billingRepo.recordSeatHistory(
        {
          tenantId,
          userId,
          action: 'deallocated',
          seatsDelta: -1,
          seatLimitAtAction: seatLimit,
          performedBy: performedBy ?? null,
        },
        config,
      );
    }

    const newCount = await billingRepo.countSeats(tenantId, config);

    return {
      success: deallocated,
      deallocated,
      seatCount: newCount,
    };
  },

  async bulkAllocateSeats(
    tenantId: string,
    userIds: string[],
    allocatedBy?: string,
    config?: AppConfig,
  ): Promise<{ success: boolean; allocated: number; failed: number }> {
    let allocated = 0;
    let failed = 0;

    for (const userId of userIds) {
      const result = await this.allocateSeat(tenantId, userId, allocatedBy, config);
      if (result.success && result.allocated) {
        allocated++;
      } else {
        failed++;
      }
    }

    return {
      success: failed === 0,
      allocated,
      failed,
    };
  },

  async bulkDeallocateSeats(
    tenantId: string,
    userIds: string[],
    performedBy?: string,
    config?: AppConfig,
  ): Promise<{ success: boolean; deallocated: number; failed: number }> {
    let deallocated = 0;
    let failed = 0;

    for (const userId of userIds) {
      const result = await this.deallocateSeat(tenantId, userId, performedBy, config);
      if (result.success && result.deallocated) {
        deallocated++;
      } else {
        failed++;
      }
    }

    return {
      success: failed === 0,
      deallocated,
      failed,
    };
  },

  async getSeatHistory(tenantId: string, limit: number = 100, config?: AppConfig) {
    return billingRepo.getSeatHistory(tenantId, limit, config);
  },

  async checkSeatAlertThresholds(
    tenantId: string,
    thresholds: SeatAlertThresholds = DEFAULT_SEAT_ALERT_THRESHOLDS,
    config?: AppConfig,
  ): Promise<{ alert: 'none' | 'warning' | 'critical'; percentage: number }> {
    const seatInfo = await this.getSeatInfo(tenantId, config);

    if (seatInfo.isUnlimited) {
      return { alert: 'none', percentage: 0 };
    }

    const { warning, critical } = thresholds;

    if (seatInfo.usagePercentage >= critical * 100) {
      return { alert: 'critical', percentage: seatInfo.usagePercentage };
    }

    if (seatInfo.usagePercentage >= warning * 100) {
      return { alert: 'warning', percentage: seatInfo.usagePercentage };
    }

    return { alert: 'none', percentage: seatInfo.usagePercentage };
  },

  async hasAvailableSeats(tenantId: string, config?: AppConfig): Promise<boolean> {
    const seatInfo = await this.getSeatInfo(tenantId, config);

    if (seatInfo.isUnlimited) {
      return true;
    }

    return seatInfo.availableSeats > 0;
  },
};
