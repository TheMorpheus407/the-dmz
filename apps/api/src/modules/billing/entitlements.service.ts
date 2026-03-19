import { subscriptionService } from './subscription.service.js';
import { seatService } from './seat.service.js';
import { PLAN_FEATURES, PLAN_LIMITS, type EntitlementResult } from './billing.types.js';

import type { AppConfig } from '../../config.js';

const ENTITLEMENTS_CACHE_TTL_SECONDS = 60;
const ENTITLEMENTS_CACHE_KEY_PREFIX = 'entitlements';

interface CachedEntitlements {
  features: Record<string, boolean>;
  limits: {
    seatLimit: number;
    storageGb: number;
    apiRateLimit: number;
  };
  cachedAt: number;
  ttl: number;
}

const entitlementsCache: Map<string, { data: CachedEntitlements; expiresAt: number }> = new Map();

function buildEntitlementsCacheKey(tenantId: string, userId?: string): string {
  const base = `${ENTITLEMENTS_CACHE_KEY_PREFIX}:${tenantId}`;
  return userId ? `${base}:user:${userId}` : `${base}:tenant`;
}

async function getCachedEntitlements(
  tenantId: string,
  userId?: string,
): Promise<CachedEntitlements | null> {
  const key = buildEntitlementsCacheKey(tenantId, userId);
  const cached = entitlementsCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  return null;
}

async function setCachedEntitlements(
  tenantId: string,
  data: CachedEntitlements,
  userId?: string,
): Promise<void> {
  const key = buildEntitlementsCacheKey(tenantId, userId);
  const expiresAt = Date.now() + ENTITLEMENTS_CACHE_TTL_SECONDS * 1000;
  entitlementsCache.set(key, { data, expiresAt });
}

async function invalidateEntitlementsCache(tenantId: string, userId?: string): Promise<void> {
  const key = buildEntitlementsCacheKey(tenantId, userId);
  entitlementsCache.delete(key);

  if (!userId) {
    const pattern = `${ENTITLEMENTS_CACHE_KEY_PREFIX}:${tenantId}:user:*`;
    for (const k of entitlementsCache.keys()) {
      if (k.startsWith(pattern)) {
        entitlementsCache.delete(k);
      }
    }
  }
}

export const entitlementsService = {
  async checkEntitlement(
    tenantId: string,
    resource: 'feature' | 'api' | 'seat' | 'storage',
    action: string,
    userId?: string,
    config?: AppConfig,
  ): Promise<EntitlementResult> {
    const startTime = performance.now();
    const cached = await getCachedEntitlements(tenantId, userId);
    const subscription = await subscriptionService.getSubscription(tenantId, config);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'No subscription found',
        cached: false,
        ttl: 0,
      };
    }

    const planId = subscription.planId;
    const features = PLAN_FEATURES[planId] ?? PLAN_FEATURES['starter']!;
    const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS['starter']!;

    if (cached) {
      const allowed = cached.features[action] ?? false;
      const seatInfo = resource === 'seat' ? await seatService.getSeatInfo(tenantId, config) : null;
      return {
        allowed,
        cached: true,
        ttl: ENTITLEMENTS_CACHE_TTL_SECONDS * 1000 - (performance.now() - startTime),
        limit: resource === 'seat' && seatInfo ? seatInfo.seatLimit : undefined,
        current: resource === 'seat' && seatInfo ? seatInfo.currentSeats : undefined,
      };
    }

    const entitlementsData: CachedEntitlements = {
      features: { ...features },
      limits,
      cachedAt: Date.now(),
      ttl: ENTITLEMENTS_CACHE_TTL_SECONDS * 1000,
    };

    await setCachedEntitlements(tenantId, entitlementsData, userId);

    const allowed = (features as unknown as Record<string, boolean>)[action] ?? false;
    const seatInfo = resource === 'seat' ? await seatService.getSeatInfo(tenantId, config) : null;

    return {
      allowed,
      cached: false,
      ttl: ENTITLEMENTS_CACHE_TTL_SECONDS * 1000 - (performance.now() - startTime),
      limit: resource === 'seat' && seatInfo ? seatInfo.seatLimit : undefined,
      current: resource === 'seat' && seatInfo ? seatInfo.currentSeats : undefined,
    };
  },

  async checkFeature(
    tenantId: string,
    featureKey: string,
    userId?: string,
    config?: AppConfig,
  ): Promise<EntitlementResult> {
    return this.checkEntitlement(tenantId, 'feature', featureKey, userId, config);
  },

  async checkApiAccess(tenantId: string, config?: AppConfig): Promise<EntitlementResult> {
    return this.checkEntitlement(tenantId, 'api', 'api_access', undefined, config);
  },

  async checkSeatAllocation(tenantId: string, config?: AppConfig): Promise<EntitlementResult> {
    const subscription = await subscriptionService.getSubscription(tenantId, config);
    const seatInfo = await seatService.getSeatInfo(tenantId, config);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'No subscription found',
        cached: false,
        ttl: 0,
      };
    }

    if (seatInfo.isUnlimited) {
      return {
        allowed: true,
        cached: false,
        ttl: 0,
        limit: -1,
        current: seatInfo.currentSeats,
      };
    }

    const overagePolicy = subscription.overagePolicy;
    const hasAvailable = seatInfo.availableSeats > 0;

    if (!hasAvailable && overagePolicy === 'deny') {
      return {
        allowed: false,
        reason: 'Seat limit reached',
        cached: false,
        ttl: 0,
        limit: seatInfo.seatLimit,
        current: seatInfo.currentSeats,
      };
    }

    return {
      allowed: true,
      cached: false,
      ttl: 0,
      limit: seatInfo.seatLimit,
      current: seatInfo.currentSeats,
      reason: overagePolicy === 'notify' ? 'Seat limit reached - notification sent' : undefined,
    };
  },

  async checkStorageLimit(
    tenantId: string,
    requestedGb: number,
    config?: AppConfig,
  ): Promise<EntitlementResult> {
    const subscription = await subscriptionService.getSubscription(tenantId, config);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'No subscription found',
        cached: false,
        ttl: 0,
      };
    }

    const planId = subscription.planId;
    const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS['starter']!;

    if (limits.storageGb === -1) {
      return {
        allowed: true,
        cached: false,
        ttl: 0,
        limit: -1,
      };
    }

    return {
      allowed: requestedGb <= limits.storageGb,
      reason: requestedGb > limits.storageGb ? 'Storage limit exceeded' : undefined,
      cached: false,
      ttl: 0,
      limit: limits.storageGb,
    };
  },

  async getEntitlements(
    tenantId: string,
    userId?: string,
    config?: AppConfig,
  ): Promise<{
    features: Record<string, boolean>;
    limits: { seatLimit: number; storageGb: number; apiRateLimit: number };
    isActive: boolean;
    planId: string | null;
  }> {
    const cached = await getCachedEntitlements(tenantId, userId);
    const subscription = await subscriptionService.getSubscription(tenantId, config);

    if (!subscription) {
      return {
        features: {},
        limits: { seatLimit: 0, storageGb: 0, apiRateLimit: 0 },
        isActive: false,
        planId: null,
      };
    }

    if (cached) {
      return {
        features: cached.features,
        limits: cached.limits,
        isActive: subscription.status === 'active' || subscription.status === 'trial',
        planId: subscription.planId,
      };
    }

    const planId = subscription.planId;
    const features = PLAN_FEATURES[planId] ?? PLAN_FEATURES['starter']!;
    const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS['starter']!;

    const entitlementsData: CachedEntitlements = {
      features: { ...features },
      limits,
      cachedAt: Date.now(),
      ttl: ENTITLEMENTS_CACHE_TTL_SECONDS * 1000,
    };

    await setCachedEntitlements(tenantId, entitlementsData, userId);

    return {
      features: { ...features },
      limits,
      isActive: subscription.status === 'active' || subscription.status === 'trial',
      planId,
    };
  },

  async invalidateCache(tenantId: string, userId?: string): Promise<void> {
    await invalidateEntitlementsCache(tenantId, userId);
  },

  async isFeatureEnabled(
    tenantId: string,
    featureKey: string,
    config?: AppConfig,
  ): Promise<boolean> {
    const result = await this.checkFeature(tenantId, featureKey, undefined, config);
    return result.allowed;
  },

  async getPlanFeatures(tenantId: string, config?: AppConfig): Promise<Record<string, boolean>> {
    const subscription = await subscriptionService.getSubscription(tenantId, config);
    const planId = subscription?.planId ?? 'starter';
    return { ...(PLAN_FEATURES[planId] ?? PLAN_FEATURES['starter']!) };
  },
};
