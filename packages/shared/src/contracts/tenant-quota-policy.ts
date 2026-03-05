import { z } from 'zod';

export const TenantTier = {
  STANDARD: 'standard',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
  CUSTOM: 'custom',
} as const;

export type TenantTier = (typeof TenantTier)[keyof typeof TenantTier];

export const tenantTierSchema = z.enum([
  TenantTier.STANDARD,
  TenantTier.PROFESSIONAL,
  TenantTier.ENTERPRISE,
  TenantTier.CUSTOM,
]);

export const CredentialClass = {
  API_KEY: 'api_key',
  PAT: 'pat',
  SERVICE_CLIENT: 'service_client',
} as const;

export type CredentialClass = (typeof CredentialClass)[keyof typeof CredentialClass];

export const credentialClassSchema = z.enum([
  CredentialClass.API_KEY,
  CredentialClass.PAT,
  CredentialClass.SERVICE_CLIENT,
]);

export const QUOTA_WINDOWS = {
  MINUTE: 'minute',
  HOUR: 'hour',
} as const;

export type QuotaWindow = (typeof QUOTA_WINDOWS)[keyof typeof QUOTA_WINDOWS];

export const quotaWindowSchema = z.enum([QUOTA_WINDOWS.MINUTE, QUOTA_WINDOWS.HOUR]);

export const tierQuotaBaselineSchema = z.object({
  tier: tenantTierSchema,
  requestsPerMinute: z.number().int().positive(),
  requestsPerHour: z.number().int().positive(),
  burstLimit: z.number().int().positive(),
  credentialClasses: z.array(credentialClassSchema).min(1),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
});

export type TierQuotaBaseline = z.infer<typeof tierQuotaBaselineSchema>;

export const TIER_QUOTA_BASELINES: readonly TierQuotaBaseline[] = [
  {
    tier: TenantTier.STANDARD,
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstLimit: 20,
    credentialClasses: [
      CredentialClass.API_KEY,
      CredentialClass.PAT,
      CredentialClass.SERVICE_CLIENT,
    ],
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  {
    tier: TenantTier.PROFESSIONAL,
    requestsPerMinute: 300,
    requestsPerHour: 10_000,
    burstLimit: 50,
    credentialClasses: [
      CredentialClass.API_KEY,
      CredentialClass.PAT,
      CredentialClass.SERVICE_CLIENT,
    ],
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  {
    tier: TenantTier.ENTERPRISE,
    requestsPerMinute: 1000,
    requestsPerHour: 100_000,
    burstLimit: 200,
    credentialClasses: [
      CredentialClass.API_KEY,
      CredentialClass.PAT,
      CredentialClass.SERVICE_CLIENT,
    ],
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  {
    tier: TenantTier.CUSTOM,
    requestsPerMinute: 0,
    requestsPerHour: 0,
    burstLimit: 0,
    credentialClasses: [
      CredentialClass.API_KEY,
      CredentialClass.PAT,
      CredentialClass.SERVICE_CLIENT,
    ],
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
] as const;

export const tierQuotaMatrixSchema = z.object({
  version: z.string(),
  baselines: z.array(tierQuotaBaselineSchema),
  defaultTier: tenantTierSchema,
  policyVersion: z.string(),
  lastUpdated: z.string().datetime(),
});

export type TierQuotaMatrix = z.infer<typeof tierQuotaMatrixSchema>;

export const m1TierQuotaMatrix: TierQuotaMatrix = {
  version: '1.0.0',
  baselines: [...TIER_QUOTA_BASELINES],
  defaultTier: TenantTier.STANDARD,
  policyVersion: '1.0.0',
  lastUpdated: '2024-01-01T00:00:00Z',
};

export const overrideStatusSchema = z.enum(['pending', 'active', 'expired', 'revoked']);

export type OverrideStatus = z.infer<typeof overrideStatusSchema>;

export const tenantQuotaOverrideSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tier: tenantTierSchema,
  requestsPerMinute: z.number().int().nonnegative(),
  requestsPerHour: z.number().int().nonnegative(),
  burstLimit: z.number().int().nonnegative(),
  credentialClasses: z.array(credentialClassSchema).min(1),
  status: overrideStatusSchema,
  requestedBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable(),
  requestedAt: z.string().datetime(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  revokedBy: z.string().uuid().nullable(),
  reason: z.string().max(500).nullable(),
  policyVersion: z.string(),
});

export type TenantQuotaOverride = z.infer<typeof tenantQuotaOverrideSchema>;

export const createQuotaOverrideSchema = z.object({
  tier: tenantTierSchema,
  requestsPerMinute: z.number().int().nonnegative(),
  requestsPerHour: z.number().int().nonnegative(),
  burstLimit: z.number().int().nonnegative(),
  credentialClasses: z.array(credentialClassSchema).min(1),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

export type CreateQuotaOverrideInput = z.infer<typeof createQuotaOverrideSchema>;

export const updateQuotaOverrideSchema = z.object({
  requestsPerMinute: z.number().int().nonnegative().optional(),
  requestsPerHour: z.number().int().nonnegative().optional(),
  burstLimit: z.number().int().nonnegative().optional(),
  effectiveUntil: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

export type UpdateQuotaOverrideInput = z.infer<typeof updateQuotaOverrideSchema>;

export const revokeQuotaOverrideSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RevokeQuotaOverrideInput = z.infer<typeof revokeQuotaOverrideSchema>;

export const effectiveQuotaPolicySchema = z.object({
  requestsPerMinute: z.number().int().positive(),
  requestsPerHour: z.number().int().positive(),
  burstLimit: z.number().int().positive(),
  tier: tenantTierSchema,
  credentialClass: credentialClassSchema,
  isOverridden: z.boolean(),
  overrideId: z.string().uuid().nullable(),
  policyVersion: z.string(),
});

export type EffectiveQuotaPolicy = z.infer<typeof effectiveQuotaPolicySchema>;

export const REQUIRED_QUOTA_HEADERS = [
  'x-quota-limit-minute',
  'x-quota-remaining-minute',
  'x-quota-limit-hour',
  'x-quota-remaining-hour',
] as const;

export const QUOTA_ERROR_CODE = 'QUOTA_EXCEEDED';
