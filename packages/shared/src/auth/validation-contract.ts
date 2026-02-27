import { z } from 'zod';

export const ValidationStatus = {
  OK: 'ok',
  WARNING: 'warning',
  FAILED: 'failed',
} as const;

export type ValidationStatus = (typeof ValidationStatus)[keyof typeof ValidationStatus];

export const validationStatusSchema = z.enum([
  ValidationStatus.OK,
  ValidationStatus.WARNING,
  ValidationStatus.FAILED,
]);

export const SSOValidationType = {
  SAML: 'saml',
  OIDC: 'oidc',
  SCIM: 'scim',
} as const;

export type SSOValidationType = (typeof SSOValidationType)[keyof typeof SSOValidationType];

export const ssoValidationTypeSchema = z.enum([
  SSOValidationType.SAML,
  SSOValidationType.OIDC,
  SSOValidationType.SCIM,
]);

export const SSOValidationCheckType = {
  METADATA_FETCH: 'metadata_fetch',
  METADATA_PARSE: 'metadata_parse',
  CERTIFICATE_VALIDITY: 'certificate_validity',
  AUDIENCE_ALIGNMENT: 'audience_alignment',
  ACS_ALIGNMENT: 'acs_alignment',
  DISCOVERY_FETCH: 'discovery_fetch',
  ISSUER_VALIDATION: 'issuer_validation',
  JWKS_REACHABILITY: 'jwks_reachability',
  CLAIM_MAPPING: 'claim_mapping',
  TOKEN_EXCHANGE: 'token_exchange',
  SCIM_BASE_URL_REACHABILITY: 'scim_base_url_reachability',
  SCIM_AUTHENTICATION: 'scim_authentication',
  SCIM_ENDPOINT_AVAILABILITY: 'scim_endpoint_availability',
  SCIM_DRY_RUN: 'scim_dry_run',
} as const;

export type SSOValidationCheckType =
  (typeof SSOValidationCheckType)[keyof typeof SSOValidationCheckType];

export const ssoValidationCheckTypeSchema = z.enum([
  SSOValidationCheckType.METADATA_FETCH,
  SSOValidationCheckType.METADATA_PARSE,
  SSOValidationCheckType.CERTIFICATE_VALIDITY,
  SSOValidationCheckType.AUDIENCE_ALIGNMENT,
  SSOValidationCheckType.ACS_ALIGNMENT,
  SSOValidationCheckType.DISCOVERY_FETCH,
  SSOValidationCheckType.ISSUER_VALIDATION,
  SSOValidationCheckType.JWKS_REACHABILITY,
  SSOValidationCheckType.CLAIM_MAPPING,
  SSOValidationCheckType.TOKEN_EXCHANGE,
  SSOValidationCheckType.SCIM_BASE_URL_REACHABILITY,
  SSOValidationCheckType.SCIM_AUTHENTICATION,
  SSOValidationCheckType.SCIM_ENDPOINT_AVAILABILITY,
  SSOValidationCheckType.SCIM_DRY_RUN,
]);

export const ssoValidationCheckResultSchema = z.object({
  checkType: ssoValidationCheckTypeSchema,
  status: validationStatusSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  correlationId: z.string().uuid().optional(),
  timestamp: z.date(),
});

export type SSOValidationCheckResult = z.infer<typeof ssoValidationCheckResultSchema>;

export const ssoValidationResultSchema = z.object({
  validationId: z.string().uuid(),
  providerId: z.string().uuid(),
  validationType: ssoValidationTypeSchema,
  overallStatus: validationStatusSchema,
  checks: z.array(ssoValidationCheckResultSchema),
  correlationId: z.string().uuid(),
  executedAt: z.date(),
  expiresAt: z.date(),
  isFresh: z.boolean(),
  warnings: z.array(z.string()).optional(),
});

export type SSOValidationResult = z.infer<typeof ssoValidationResultSchema>;

export const SSOActivationStatus = {
  NOT_ACTIVATED: 'not_activated',
  VALIDATION_REQUIRED: 'validation_required',
  VALIDATION_STALE: 'validation_stale',
  READY_TO_ACTIVATE: 'ready_to_activate',
  ACTIVATED: 'activated',
  ACTIVATION_FAILED: 'activation_failed',
} as const;

export type SSOActivationStatus = (typeof SSOActivationStatus)[keyof typeof SSOActivationStatus];

export const ssoActivationStatusSchema = z.enum([
  SSOActivationStatus.NOT_ACTIVATED,
  SSOActivationStatus.VALIDATION_REQUIRED,
  SSOActivationStatus.VALIDATION_STALE,
  SSOActivationStatus.READY_TO_ACTIVATE,
  SSOActivationStatus.ACTIVATED,
  SSOActivationStatus.ACTIVATION_FAILED,
]);

export const SSOActivationGateSchema = z.object({
  providerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  activationStatus: ssoActivationStatusSchema,
  lastValidationId: z.string().uuid().nullable(),
  lastValidationAt: z.date().nullable(),
  lastValidationStatus: validationStatusSchema.nullable(),
  activatedAt: z.date().nullable(),
  activatedBy: z.string().uuid().nullable(),
  canActivate: z.boolean(),
  validationFreshnessSeconds: z.number().int().positive(),
  isStale: z.boolean(),
});

export type SSOActivationGate = z.infer<typeof SSOActivationGateSchema>;

export const SSOActivationRequestSchema = z.object({
  providerId: z.string().uuid(),
  enforceSSOOnly: z.boolean(),
});

export type SSOActivationRequest = z.infer<typeof SSOActivationRequestSchema>;

export const SSOActivationResponseSchema = z.object({
  providerId: z.string().uuid(),
  previousStatus: ssoActivationStatusSchema,
  newStatus: ssoActivationStatusSchema,
  enforceSSOOnly: z.boolean(),
  correlationId: z.string().uuid(),
  message: z.string(),
  requiresValidation: z.boolean(),
});

export type SSOActivationResponse = z.infer<typeof SSOActivationResponseSchema>;

export const SSOValidationRequestSchema = z.object({
  providerId: z.string().uuid(),
  validationType: ssoValidationTypeSchema,
  testClaims: z
    .object({
      email: z.string().email(),
      groups: z.array(z.string()),
    })
    .optional(),
});

export type SSOValidationRequest = z.infer<typeof SSOValidationRequestSchema>;

export const SSOValidationPreflightRequestSchema = z.object({
  providerId: z.string().uuid(),
});

export type SSOValidationPreflightRequest = z.infer<typeof SSOValidationPreflightRequestSchema>;

export const SCIMValidationRequestSchema = z.object({
  baseUrl: z.string().url(),
  bearerToken: z.string().min(1),
  tenantId: z.string().uuid(),
  dryRunEmail: z.string().email().optional(),
});

export type SCIMValidationRequest = z.infer<typeof SCIMValidationRequestSchema>;

export const SSOValidationPreflightResponseSchema = z.object({
  providerId: z.string().uuid(),
  validationType: ssoValidationTypeSchema,
  supportedChecks: z.array(ssoValidationCheckTypeSchema),
  requiresCredentials: z.boolean(),
  timeoutSeconds: z.number().int().positive(),
});

export type SSOValidationPreflightResponse = z.infer<typeof SSOValidationPreflightResponseSchema>;

export const SSOValidationSummarySchema = z.object({
  providerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  providerType: ssoValidationTypeSchema,
  lastValidationAt: z.date().nullable(),
  lastValidationStatus: validationStatusSchema.nullable(),
  activationStatus: ssoActivationStatusSchema,
  isStale: z.boolean(),
  staleWarning: z.string().optional(),
  canActivate: z.boolean(),
});

export type SSOValidationSummary = z.infer<typeof SSOValidationSummarySchema>;

export const DEFAULT_VALIDATION_FRESHNESS_SECONDS = 86400;

export const VALIDATION_WARNING_THRESHOLD_SECONDS = 43200;
