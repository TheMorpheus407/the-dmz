import {
  TenantTier,
  m1TierQuotaMatrix,
  effectiveQuotaPolicySchema,
  type EffectiveQuotaPolicy,
} from '@the-dmz/shared/contracts';

const DEFAULT_CREDENTIAL_CLASS = 'api_key' as const;

const PLAN_ID_TO_TIER: Record<string, TenantTier> = {
  free: TenantTier.STANDARD,
  standard: TenantTier.STANDARD,
  professional: TenantTier.PROFESSIONAL,
  enterprise: TenantTier.ENTERPRISE,
  custom: TenantTier.CUSTOM,
};

export function resolveTenantTierFromPlanId(planId: string | null | undefined): TenantTier {
  if (!planId) {
    return TenantTier.STANDARD;
  }
  return PLAN_ID_TO_TIER[planId.toLowerCase()] ?? TenantTier.STANDARD;
}

export function getBaselineForTier(tier: TenantTier) {
  const baseline = m1TierQuotaMatrix.baselines.find((b) => b.tier === tier);
  if (!baseline) {
    return m1TierQuotaMatrix.baselines.find((b) => b.tier === TenantTier.STANDARD)!;
  }
  return baseline;
}

export interface QuotaOverride {
  id: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export function resolveEffectiveQuotaPolicy(
  tenant: { planId: string | null; override?: QuotaOverride | null },
  credentialClass: 'api_key' | 'pat' | 'service_client' = DEFAULT_CREDENTIAL_CLASS,
): EffectiveQuotaPolicy {
  const tier = resolveTenantTierFromPlanId(tenant.planId);
  const baseline = getBaselineForTier(tier);

  if (tenant.override) {
    return effectiveQuotaPolicySchema.parse({
      requestsPerMinute: tenant.override.requestsPerMinute,
      requestsPerHour: tenant.override.requestsPerHour,
      burstLimit: tenant.override.burstLimit,
      tier,
      credentialClass,
      isOverridden: true,
      overrideId: tenant.override.id,
      policyVersion: m1TierQuotaMatrix.policyVersion,
    });
  }

  return effectiveQuotaPolicySchema.parse({
    requestsPerMinute: baseline.requestsPerMinute,
    requestsPerHour: baseline.requestsPerHour,
    burstLimit: baseline.burstLimit,
    tier,
    credentialClass,
    isOverridden: false,
    overrideId: null,
    policyVersion: m1TierQuotaMatrix.policyVersion,
  });
}
