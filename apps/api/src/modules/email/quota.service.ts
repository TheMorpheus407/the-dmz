export enum PlanTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export interface QuotaLimits {
  dailyLimit: number;
  hourlyLimit: number;
  minutelyLimit: number;
  maxRecipientsPerSend: number;
}

export interface QuotaUsage {
  tenantId: string;
  integrationId: string;
  date: string;
  dailySent: number;
  dailyRemaining: number;
  hourlySent: number;
  hourlyRemaining: number;
  minutelySent: number;
  minutelyRemaining: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
}

export const PLAN_QUOTA_LIMITS: Record<PlanTier, QuotaLimits> = {
  [PlanTier.STARTER]: {
    dailyLimit: 1000,
    hourlyLimit: 100,
    minutelyLimit: 10,
    maxRecipientsPerSend: 10,
  },
  [PlanTier.PROFESSIONAL]: {
    dailyLimit: 10000,
    hourlyLimit: 1000,
    minutelyLimit: 50,
    maxRecipientsPerSend: 50,
  },
  [PlanTier.BUSINESS]: {
    dailyLimit: 50000,
    hourlyLimit: 5000,
    minutelyLimit: 200,
    maxRecipientsPerSend: 200,
  },
  [PlanTier.ENTERPRISE]: {
    dailyLimit: 1000000,
    hourlyLimit: 50000,
    minutelyLimit: 1000,
    maxRecipientsPerSend: 1000,
  },
};

interface QuotaState {
  tenantId: string;
  integrationId: string;
  tier: PlanTier;
  dailyCount: number;
  hourlyCounts: Map<number, number>;
  minutelyCounts: Map<number, number>;
  lastDailyReset: string;
  lastHourlyReset: string;
  lastMinutelyReset: string;
}

const quotaStates = new Map<string, QuotaState>();

function getTimeKey(date: Date, type: 'daily' | 'hourly' | 'minutely'): string {
  if (type === 'daily') {
    return date.toISOString().split('T')[0]!;
  }
  if (type === 'hourly') {
    return `${date.toISOString().split('T')[0]!}-${date.getHours()}`;
  }
  return `${date.toISOString().split('T')[0]!}-${date.getHours()}-${date.getMinutes()}`;
}

function shouldReset(lastReset: string, currentKey: string): boolean {
  return lastReset !== currentKey;
}

export const quotaService = {
  async initialize(
    tenantId: string,
    integrationId: string,
    tier: PlanTier = PlanTier.STARTER,
  ): Promise<void> {
    const key = `${tenantId}:${integrationId}`;
    const now = new Date();

    quotaStates.set(key, {
      tenantId,
      integrationId,
      tier,
      dailyCount: 0,
      hourlyCounts: new Map(),
      minutelyCounts: new Map(),
      lastDailyReset: getTimeKey(now, 'daily'),
      lastHourlyReset: getTimeKey(now, 'hourly'),
      lastMinutelyReset: getTimeKey(now, 'minutely'),
    });
  },

  async getLimits(tier: PlanTier): Promise<QuotaLimits> {
    return PLAN_QUOTA_LIMITS[tier];
  },

  async getUsage(tenantId: string, integrationId: string): Promise<QuotaUsage | null> {
    const key = `${tenantId}:${integrationId}`;
    const state = quotaStates.get(key);
    if (!state) return null;

    const limits = PLAN_QUOTA_LIMITS[state.tier];
    const now = new Date();
    const currentMinuteKey = parseInt(getTimeKey(now, 'minutely').split('-')[2] || '0');

    const minutelyCount = state.minutelyCounts.get(currentMinuteKey) || 0;
    const hourlyCount = Array.from(state.hourlyCounts.values()).reduce((a, b) => a + b, 0);

    return {
      tenantId,
      integrationId,
      date: getTimeKey(now, 'daily'),
      dailySent: state.dailyCount,
      dailyRemaining: Math.max(0, limits.dailyLimit - state.dailyCount),
      hourlySent: hourlyCount,
      hourlyRemaining: Math.max(0, limits.hourlyLimit - hourlyCount),
      minutelySent: minutelyCount,
      minutelyRemaining: Math.max(0, limits.minutelyLimit - minutelyCount),
    };
  },

  async checkQuota(
    tenantId: string,
    integrationId: string,
    recipientCount: number = 1,
  ): Promise<QuotaCheckResult> {
    const key = `${tenantId}:${integrationId}`;
    let state = quotaStates.get(key);

    if (!state) {
      await this.initialize(tenantId, integrationId);
      state = quotaStates.get(key)!;
    }

    const now = new Date();
    const dailyKey = getTimeKey(now, 'daily');
    const hourlyKey = getTimeKey(now, 'hourly');
    const minutelyKey = getTimeKey(now, 'minutely');

    if (shouldReset(state.lastDailyReset, dailyKey)) {
      state.dailyCount = 0;
      state.lastDailyReset = dailyKey;
    }

    if (shouldReset(state.lastHourlyReset, hourlyKey)) {
      state.hourlyCounts.clear();
      state.lastHourlyReset = hourlyKey;
    }

    if (shouldReset(state.lastMinutelyReset, minutelyKey)) {
      state.minutelyCounts.clear();
      state.lastMinutelyReset = minutelyKey;
    }

    const limits = PLAN_QUOTA_LIMITS[state.tier];

    if (recipientCount > limits.maxRecipientsPerSend) {
      return {
        allowed: false,
        reason: `Maximum ${limits.maxRecipientsPerSend} recipients per send exceeded`,
      };
    }

    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();

    const minutelyCount = (state.minutelyCounts.get(currentMinute) || 0) + recipientCount;
    const hourlyCount =
      Array.from(state.hourlyCounts.entries())
        .filter(([hour]) => hour === currentHour)
        .reduce((sum, [, count]) => sum + count, 0) + recipientCount;

    if (minutelyCount > limits.minutelyLimit) {
      return {
        allowed: false,
        reason: `Minutely rate limit (${limits.minutelyLimit}) exceeded`,
        retryAfter: 60,
      };
    }

    if (hourlyCount > limits.hourlyLimit) {
      return {
        allowed: false,
        reason: `Hourly rate limit (${limits.hourlyLimit}) exceeded`,
        retryAfter: 3600,
      };
    }

    if (state.dailyCount + recipientCount > limits.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit (${limits.dailyLimit}) exceeded`,
        retryAfter: 86400,
      };
    }

    return { allowed: true };
  },

  async consumeQuota(
    tenantId: string,
    integrationId: string,
    recipientCount: number = 1,
  ): Promise<QuotaCheckResult> {
    const check = await this.checkQuota(tenantId, integrationId, recipientCount);

    if (!check.allowed) {
      return check;
    }

    const key = `${tenantId}:${integrationId}`;
    const state = quotaStates.get(key);

    if (state) {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentHour = now.getHours();

      state.dailyCount += recipientCount;
      state.minutelyCounts.set(
        currentMinute,
        (state.minutelyCounts.get(currentMinute) || 0) + recipientCount,
      );
      state.hourlyCounts.set(
        currentHour,
        (state.hourlyCounts.get(currentHour) || 0) + recipientCount,
      );
    }

    return { allowed: true };
  },

  async updateTier(tenantId: string, integrationId: string, tier: PlanTier): Promise<void> {
    const key = `${tenantId}:${integrationId}`;
    const state = quotaStates.get(key);

    if (state) {
      state.tier = tier;
    } else {
      await this.initialize(tenantId, integrationId, tier);
    }
  },

  async resetQuota(tenantId: string, integrationId: string): Promise<void> {
    const key = `${tenantId}:${integrationId}`;
    quotaStates.delete(key);
  },

  getTierFromString(tier: string): PlanTier {
    return PLAN_QUOTA_LIMITS[tier as PlanTier] ? (tier as PlanTier) : PlanTier.STARTER;
  },
};
