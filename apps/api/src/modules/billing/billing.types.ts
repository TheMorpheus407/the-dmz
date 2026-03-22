import type {
  Subscription,
  NewSubscription,
  SubscriptionStatus,
  Plan,
  Seat,
  NewSeat,
  SeatHistory,
  StripeCustomer,
  NewStripeCustomer,
  Invoice,
} from '../../db/schema/billing/index.js';

export interface CreateSubscriptionInput {
  tenantId: string;
  planId: string;
  trialDays?: number;
  seatLimit?: number;
  overagePolicy?: 'allow' | 'deny' | 'notify';
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  status?: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  seatLimit?: number;
  overagePolicy?: 'allow' | 'deny' | 'notify';
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionWithPlan extends Subscription {
  plan?: Plan;
}

export interface SeatAllocationResult {
  success: boolean;
  allocated: boolean;
  seatCount: number;
  seatLimit: number;
  reason?: string;
}

export interface SeatDeallocationResult {
  success: boolean;
  deallocated: boolean;
  seatCount: number;
}

export interface EntitlementCheck {
  tenantId: string;
  userId?: string;
  resource: 'feature' | 'api' | 'seat' | 'storage';
  action: string;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: string | undefined;
  limit?: number | undefined;
  current?: number | undefined;
  cached: boolean;
  ttl: number;
}

export interface PlanFeatures {
  trainingCampaigns: boolean;
  phishingSimulation: boolean;
  basicReporting: boolean;
  advancedReporting: boolean;
  scormExport: boolean;
  ltiIntegration: boolean;
  advancedAnalytics: boolean;
  ssoIntegration: boolean;
  scimProvisioning: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  dedicatedSupport: boolean;
  customIntegrations: boolean;
  fedrampCompliance: boolean;
  dataResidency: boolean;
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  starter: {
    trainingCampaigns: true,
    phishingSimulation: true,
    basicReporting: true,
    advancedReporting: false,
    scormExport: true,
    ltiIntegration: false,
    advancedAnalytics: false,
    ssoIntegration: false,
    scimProvisioning: false,
    customBranding: false,
    apiAccess: false,
    dedicatedSupport: false,
    customIntegrations: false,
    fedrampCompliance: false,
    dataResidency: false,
  },
  professional: {
    trainingCampaigns: true,
    phishingSimulation: true,
    basicReporting: true,
    advancedReporting: true,
    scormExport: true,
    ltiIntegration: true,
    advancedAnalytics: true,
    ssoIntegration: true,
    scimProvisioning: true,
    customBranding: true,
    apiAccess: false,
    dedicatedSupport: false,
    customIntegrations: false,
    fedrampCompliance: false,
    dataResidency: false,
  },
  enterprise: {
    trainingCampaigns: true,
    phishingSimulation: true,
    basicReporting: true,
    advancedReporting: true,
    scormExport: true,
    ltiIntegration: true,
    advancedAnalytics: true,
    ssoIntegration: true,
    scimProvisioning: true,
    customBranding: true,
    apiAccess: true,
    dedicatedSupport: true,
    customIntegrations: true,
    fedrampCompliance: false,
    dataResidency: false,
  },
  government: {
    trainingCampaigns: true,
    phishingSimulation: true,
    basicReporting: true,
    advancedReporting: true,
    scormExport: true,
    ltiIntegration: true,
    advancedAnalytics: true,
    ssoIntegration: true,
    scimProvisioning: true,
    customBranding: true,
    apiAccess: true,
    dedicatedSupport: true,
    customIntegrations: true,
    fedrampCompliance: true,
    dataResidency: true,
  },
};

export const PLAN_LIMITS: Record<
  string,
  { seatLimit: number; storageGb: number; apiRateLimit: number }
> = {
  starter: { seatLimit: 100, storageGb: 10, apiRateLimit: 100 },
  professional: { seatLimit: 500, storageGb: 100, apiRateLimit: 500 },
  enterprise: { seatLimit: -1, storageGb: -1, apiRateLimit: -1 },
  government: { seatLimit: -1, storageGb: -1, apiRateLimit: -1 },
};

export type {
  Subscription,
  NewSubscription,
  SubscriptionStatus,
  Plan,
  Seat,
  NewSeat,
  SeatHistory,
  StripeCustomer,
  NewStripeCustomer,
  Invoice,
};
