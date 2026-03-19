import { billingRepo } from './billing.repo.js';
import {
  PLAN_LIMITS,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
} from './billing.types.js';

import type { Subscription } from '../../db/schema/billing/index.js';
import type { AppConfig } from '../../config.js';

const DEFAULT_TRIAL_DAYS = 14;

export interface SubscriptionResult {
  subscription: Subscription;
  isNew: boolean;
}

export const subscriptionService = {
  async getSubscription(tenantId: string, config?: AppConfig): Promise<Subscription | null> {
    return billingRepo.getSubscriptionByTenantId(tenantId, config);
  },

  async getSubscriptionById(
    subscriptionId: string,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    return billingRepo.getSubscriptionById(subscriptionId, config);
  },

  async createSubscription(
    input: CreateSubscriptionInput,
    config?: AppConfig,
  ): Promise<SubscriptionResult> {
    const existing = await billingRepo.getSubscriptionByTenantId(input.tenantId, config);

    if (existing) {
      return { subscription: existing, isNew: false };
    }

    const trialDays = input.trialDays ?? DEFAULT_TRIAL_DAYS;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    const planLimits = PLAN_LIMITS[input.planId] ?? {
      seatLimit: -1,
      storageGb: -1,
      apiRateLimit: -1,
    };
    const seatLimit = input.seatLimit ?? planLimits.seatLimit;

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const subscription = await billingRepo.createSubscription(
      {
        tenantId: input.tenantId,
        planId: input.planId,
        status: trialDays > 0 ? 'trial' : 'active',
        trialEndsAt: trialDays > 0 ? trialEndDate : null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        seatLimit,
        overagePolicy: input.overagePolicy ?? 'deny',
        metadata: input.metadata ?? {},
      },
      config,
    );

    return { subscription, isNew: true };
  },

  async updateSubscription(
    tenantId: string,
    input: UpdateSubscriptionInput,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    const existing = await billingRepo.getSubscriptionByTenantId(tenantId, config);
    if (!existing) {
      return null;
    }

    const updateData: Partial<Subscription> = {};

    if (input.planId !== undefined) {
      updateData.planId = input.planId;
      const planLimits = PLAN_LIMITS[input.planId] ?? {
        seatLimit: -1,
        storageGb: -1,
        apiRateLimit: -1,
      };
      if (input.seatLimit === undefined) {
        updateData.seatLimit = planLimits.seatLimit;
      }
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.trialEndsAt !== undefined) {
      updateData.trialEndsAt = input.trialEndsAt;
    }

    if (input.currentPeriodStart !== undefined) {
      updateData.currentPeriodStart = input.currentPeriodStart;
    }

    if (input.currentPeriodEnd !== undefined) {
      updateData.currentPeriodEnd = input.currentPeriodEnd;
    }

    if (input.seatLimit !== undefined) {
      updateData.seatLimit = input.seatLimit;
    }

    if (input.overagePolicy !== undefined) {
      updateData.overagePolicy = input.overagePolicy;
    }

    if (input.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
    }

    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata;
    }

    return billingRepo.updateSubscription(existing.id, updateData, config);
  },

  async cancelSubscription(
    tenantId: string,
    cancelAtPeriodEnd: boolean = true,
    config?: AppConfig,
  ): Promise<Subscription | null> {
    const existing = await billingRepo.getSubscriptionByTenantId(tenantId, config);
    if (!existing) {
      return null;
    }

    const updateData: Partial<Subscription> = {
      cancelAtPeriodEnd,
    };

    if (!cancelAtPeriodEnd) {
      updateData.status = 'cancelled';
      updateData.cancelledAt = new Date();
    }

    return billingRepo.updateSubscription(existing.id, updateData, config);
  },

  async reactivateSubscription(tenantId: string, config?: AppConfig): Promise<Subscription | null> {
    const existing = await billingRepo.getSubscriptionByTenantId(tenantId, config);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const updateData: Partial<Subscription> = {
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
      cancelAtPeriodEnd: false,
    };

    return billingRepo.updateSubscription(existing.id, updateData, config);
  },

  async transitionFromTrial(tenantId: string, config?: AppConfig): Promise<Subscription | null> {
    const existing = await billingRepo.getSubscriptionByTenantId(tenantId, config);
    if (!existing || existing.status !== 'trial') {
      return null;
    }

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const updateData: Partial<Subscription> = {
      status: 'active',
      trialEndsAt: null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    };

    return billingRepo.updateSubscription(existing.id, updateData, config);
  },

  async expireTrial(tenantId: string, config?: AppConfig): Promise<Subscription | null> {
    const existing = await billingRepo.getSubscriptionByTenantId(tenantId, config);
    if (!existing || existing.status !== 'trial') {
      return null;
    }

    const updateData: Partial<Subscription> = {
      status: 'expired',
      trialEndsAt: null,
    };

    return billingRepo.updateSubscription(existing.id, updateData, config);
  },

  async suspendSubscription(tenantId: string, config?: AppConfig): Promise<Subscription | null> {
    const existing = await billingRepo.getSubscriptionByTenantId(tenantId, config);
    if (!existing) {
      return null;
    }

    return billingRepo.updateSubscriptionStatus(existing.id, 'suspended', config);
  },

  async markPastDue(tenantId: string, config?: AppConfig): Promise<Subscription | null> {
    const existing = await billingRepo.getSubscriptionByTenantId(tenantId, config);
    if (!existing) {
      return null;
    }

    return billingRepo.updateSubscriptionStatus(existing.id, 'past_due', config);
  },

  isTrialExpired(subscription: Subscription): boolean {
    if (subscription.status !== 'trial' || !subscription.trialEndsAt) {
      return false;
    }
    return new Date() > subscription.trialEndsAt;
  },

  async getSubscriptionStatus(
    tenantId: string,
    config?: AppConfig,
  ): Promise<{
    isActive: boolean;
    isTrial: boolean;
    isExpired: boolean;
    daysUntilExpiry: number | null;
    planId: string | null;
  }> {
    const subscription = await billingRepo.getSubscriptionByTenantId(tenantId, config);

    if (!subscription) {
      return {
        isActive: false,
        isTrial: false,
        isExpired: false,
        daysUntilExpiry: null,
        planId: null,
      };
    }

    const isTrial = subscription.status === 'trial';
    const isExpired = subscription.status === 'expired';
    const isActive = subscription.status === 'active';

    let daysUntilExpiry: number | null = null;
    if (isTrial && subscription.trialEndsAt) {
      const now = new Date();
      const diff = subscription.trialEndsAt.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      isActive: isActive || isTrial,
      isTrial,
      isExpired,
      daysUntilExpiry,
      planId: subscription.planId,
    };
  },
};
