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
  training_campaigns: boolean;
  phishing_simulation: boolean;
  basic_reporting: boolean;
  advanced_reporting: boolean;
  scorm_export: boolean;
  lti_integration: boolean;
  advanced_analytics: boolean;
  sso_integration: boolean;
  scim_provisioning: boolean;
  custom_branding: boolean;
  api_access: boolean;
  dedicated_support: boolean;
  custom_integrations: boolean;
  fedramp_compliance: boolean;
  data_residency: boolean;
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  starter: {
    training_campaigns: true,
    phishing_simulation: true,
    basic_reporting: true,
    advanced_reporting: false,
    scorm_export: true,
    lti_integration: false,
    advanced_analytics: false,
    sso_integration: false,
    scim_provisioning: false,
    custom_branding: false,
    api_access: false,
    dedicated_support: false,
    custom_integrations: false,
    fedramp_compliance: false,
    data_residency: false,
  },
  professional: {
    training_campaigns: true,
    phishing_simulation: true,
    basic_reporting: true,
    advanced_reporting: true,
    scorm_export: true,
    lti_integration: true,
    advanced_analytics: true,
    sso_integration: true,
    scim_provisioning: true,
    custom_branding: true,
    api_access: false,
    dedicated_support: false,
    custom_integrations: false,
    fedramp_compliance: false,
    data_residency: false,
  },
  enterprise: {
    training_campaigns: true,
    phishing_simulation: true,
    basic_reporting: true,
    advanced_reporting: true,
    scorm_export: true,
    lti_integration: true,
    advanced_analytics: true,
    sso_integration: true,
    scim_provisioning: true,
    custom_branding: true,
    api_access: true,
    dedicated_support: true,
    custom_integrations: true,
    fedramp_compliance: false,
    data_residency: false,
  },
  government: {
    training_campaigns: true,
    phishing_simulation: true,
    basic_reporting: true,
    advanced_reporting: true,
    scorm_export: true,
    lti_integration: true,
    advanced_analytics: true,
    sso_integration: true,
    scim_provisioning: true,
    custom_branding: true,
    api_access: true,
    dedicated_support: true,
    custom_integrations: true,
    fedramp_compliance: true,
    data_residency: true,
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
