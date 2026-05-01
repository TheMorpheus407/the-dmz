import { z } from 'zod';

import { REGULATORY_FRAMEWORKS } from '../constants/frameworks.js';

export const ONBOARDING_STEPS = [
  'not_started',
  'org_profile',
  'idp_config',
  'scim_token',
  'compliance',
  'complete',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const orgProfileSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  industry: z.string().min(1).max(100),
  companySize: z.string().min(1).max(50),
});

export type OrgProfileInput = z.infer<typeof orgProfileSchema>;

export const idpConfigSchema = z.object({
  type: z.enum(['saml', 'oidc']),
  enabled: z.boolean(),
  metadataUrl: z.string().url().optional(),
  entityId: z.string().optional(),
  ssoUrl: z.string().url().optional(),
  certificate: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  issuer: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  authorizedDomains: z.array(z.string()).optional(),
});

export type IdpConfigInput = z.infer<typeof idpConfigSchema>;

export const scimTokenSchema = z.object({
  name: z.string().min(1).max(255),
  expiresInDays: z.number().int().positive().optional(),
});

export type ScimTokenInput = z.infer<typeof scimTokenSchema>;

export const REGULATORY_REGIONS = [
  'us_federal',
  'us_state_local',
  'eu',
  'uk',
  'canada',
  'australia',
  'japan',
  'singapore',
  'other',
] as const;

export type RegulatoryRegion = (typeof REGULATORY_REGIONS)[number];

export const complianceFrameworksSchema = z.object({
  frameworks: z.array(z.enum(REGULATORY_FRAMEWORKS)),
  regulatoryRegion: z.enum(REGULATORY_REGIONS).optional(),
  complianceCoordinatorContact: z
    .object({
      name: z.string().min(1).max(255),
      email: z.string().email().max(255),
      phone: z.string().max(50).optional(),
    })
    .optional(),
});

export type ComplianceFrameworksInput = z.infer<typeof complianceFrameworksSchema>;

export const onboardingStateSchema = z.object({
  currentStep: z.enum(ONBOARDING_STEPS),
  completedSteps: z.array(z.enum(ONBOARDING_STEPS)),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  orgProfile: orgProfileSchema.optional(),
  idpConfig: idpConfigSchema.optional(),
  scimTokenId: z.string().uuid().optional(),
  complianceFrameworks: z.array(z.enum(REGULATORY_FRAMEWORKS)).optional(),
  regulatoryRegion: z.enum(REGULATORY_REGIONS).optional(),
  complianceCoordinatorContact: z
    .object({
      name: z.string().min(1).max(255),
      email: z.string().email().max(255),
      phone: z.string().max(50).optional(),
    })
    .optional(),
});

export type OnboardingStateInput = z.infer<typeof onboardingStateSchema>;

export const onboardingStatusResponseSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  canProceed: z.boolean(),
  nextStep: z.enum(ONBOARDING_STEPS).nullable(),
});

export type OnboardingStatusResponse = z.infer<typeof onboardingStatusResponseSchema>;

export const startOnboardingResponseSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  nextStep: z.enum(ONBOARDING_STEPS),
});

export type StartOnboardingResponse = z.infer<typeof startOnboardingResponseSchema>;

export const orgProfileResponseSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  completed: z.boolean(),
  nextStep: z.enum(ONBOARDING_STEPS).nullable(),
});

export type OrgProfileResponse = z.infer<typeof orgProfileResponseSchema>;

export const idpConfigResponseSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  idpConfig: idpConfigSchema,
  completed: z.boolean(),
  nextStep: z.enum(ONBOARDING_STEPS).nullable(),
});

export type IdpConfigResponse = z.infer<typeof idpConfigResponseSchema>;

export const scimTokenResponseSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  tokenId: z.string().uuid(),
  token: z.string().optional(),
  completed: z.boolean(),
  nextStep: z.enum(ONBOARDING_STEPS).nullable(),
});

export type ScimTokenResponse = z.infer<typeof scimTokenResponseSchema>;

export const complianceResponseSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  frameworks: z.array(z.enum(REGULATORY_FRAMEWORKS)),
  regulatoryRegion: z.enum(REGULATORY_REGIONS).nullable(),
  complianceCoordinatorContact: z
    .object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
    })
    .nullable(),
  completed: z.boolean(),
  nextStep: z.enum(ONBOARDING_STEPS).nullable(),
});

export type ComplianceResponse = z.infer<typeof complianceResponseSchema>;

export const completeOnboardingResponseSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  completed: z.boolean(),
});

export type CompleteOnboardingResponse = z.infer<typeof completeOnboardingResponseSchema>;
