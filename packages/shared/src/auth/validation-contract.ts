import { z } from 'zod';

export const ValidationStatus = {
  OK: 'ok',
  WARNING: 'warning',
  FAILED: 'failed',
} as const;

export type ValidationStatus = (typeof ValidationStatus)[keyof typeof ValidationStatus];

export const VALIDATION_STATUS_SCHEMA = z.enum([
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

export const SSO_VALIDATION_TYPE_SCHEMA = z.enum([
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

export const SSO_VALIDATION_CHECK_TYPE_SCHEMA = z.enum([
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

export const SSO_VALIDATION_CHECK_RESULT_SCHEMA = z.object({
  checkType: SSO_VALIDATION_CHECK_TYPE_SCHEMA,
  status: VALIDATION_STATUS_SCHEMA,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  correlationId: z.string().uuid().optional(),
  timestamp: z.date(),
});

export type SSOValidationCheckResult = z.infer<typeof SSO_VALIDATION_CHECK_RESULT_SCHEMA>;

export const SSO_VALIDATION_RESULT_SCHEMA = z.object({
  validationId: z.string().uuid(),
  providerId: z.string().uuid(),
  validationType: SSO_VALIDATION_TYPE_SCHEMA,
  overallStatus: VALIDATION_STATUS_SCHEMA,
  checks: z.array(SSO_VALIDATION_CHECK_RESULT_SCHEMA),
  correlationId: z.string().uuid(),
  executedAt: z.date(),
  expiresAt: z.date(),
  isFresh: z.boolean(),
  warnings: z.array(z.string()).optional(),
});

export type SSOValidationResult = z.infer<typeof SSO_VALIDATION_RESULT_SCHEMA>;

export const SSOActivationStatus = {
  NOT_ACTIVATED: 'not_activated',
  VALIDATION_REQUIRED: 'validation_required',
  VALIDATION_STALE: 'validation_stale',
  READY_TO_ACTIVATE: 'ready_to_activate',
  ACTIVATED: 'activated',
  ACTIVATION_FAILED: 'activation_failed',
} as const;

export type SSOActivationStatus = (typeof SSOActivationStatus)[keyof typeof SSOActivationStatus];

export const SSO_ACTIVATION_STATUS_SCHEMA = z.enum([
  SSOActivationStatus.NOT_ACTIVATED,
  SSOActivationStatus.VALIDATION_REQUIRED,
  SSOActivationStatus.VALIDATION_STALE,
  SSOActivationStatus.READY_TO_ACTIVATE,
  SSOActivationStatus.ACTIVATED,
  SSOActivationStatus.ACTIVATION_FAILED,
]);

export const SSO_ACTIVATION_GATE_SCHEMA = z.object({
  providerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  activationStatus: SSO_ACTIVATION_STATUS_SCHEMA,
  lastValidationId: z.string().uuid().nullable(),
  lastValidationAt: z.date().nullable(),
  lastValidationStatus: VALIDATION_STATUS_SCHEMA.nullable(),
  activatedAt: z.date().nullable(),
  activatedBy: z.string().uuid().nullable(),
  canActivate: z.boolean(),
  validationFreshnessSeconds: z.number().int().positive(),
  isStale: z.boolean(),
});

export type SSOActivationGate = z.infer<typeof SSO_ACTIVATION_GATE_SCHEMA>;

export const SSO_ACTIVATION_REQUEST_SCHEMA = z.object({
  providerId: z.string().uuid(),
  enforceSSOOnly: z.boolean(),
});

export type SSOActivationRequest = z.infer<typeof SSO_ACTIVATION_REQUEST_SCHEMA>;

export const SSO_ACTIVATION_RESPONSE_SCHEMA = z.object({
  providerId: z.string().uuid(),
  previousStatus: SSO_ACTIVATION_STATUS_SCHEMA,
  newStatus: SSO_ACTIVATION_STATUS_SCHEMA,
  enforceSSOOnly: z.boolean(),
  correlationId: z.string().uuid(),
  message: z.string(),
  requiresValidation: z.boolean(),
});

export type SSOActivationResponse = z.infer<typeof SSO_ACTIVATION_RESPONSE_SCHEMA>;

export const SSO_VALIDATION_REQUEST_SCHEMA = z.object({
  providerId: z.string().uuid(),
  validationType: SSO_VALIDATION_TYPE_SCHEMA,
  testClaims: z
    .object({
      email: z.string().email(),
      groups: z.array(z.string()),
    })
    .optional(),
});

export type SSOValidationRequest = z.infer<typeof SSO_VALIDATION_REQUEST_SCHEMA>;

export const SSO_VALIDATION_PREFLIGHT_REQUEST_SCHEMA = z.object({
  providerId: z.string().uuid(),
});

export type SSOValidationPreflightRequest = z.infer<typeof SSO_VALIDATION_PREFLIGHT_REQUEST_SCHEMA>;

export const SCIM_VALIDATION_REQUEST_SCHEMA = z.object({
  baseUrl: z.string().url(),
  bearerToken: z.string().min(1),
  tenantId: z.string().uuid(),
  dryRunEmail: z.string().email().optional(),
});

export type SCIMValidationRequest = z.infer<typeof SCIM_VALIDATION_REQUEST_SCHEMA>;

export const SSO_VALIDATION_PREFLIGHT_RESPONSE_SCHEMA = z.object({
  providerId: z.string().uuid(),
  validationType: SSO_VALIDATION_TYPE_SCHEMA,
  supportedChecks: z.array(SSO_VALIDATION_CHECK_TYPE_SCHEMA),
  requiresCredentials: z.boolean(),
  timeoutSeconds: z.number().int().positive(),
});

export type SSOValidationPreflightResponse = z.infer<
  typeof SSO_VALIDATION_PREFLIGHT_RESPONSE_SCHEMA
>;

export const SSO_VALIDATION_SUMMARY_SCHEMA = z.object({
  providerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  providerType: SSO_VALIDATION_TYPE_SCHEMA,
  lastValidationAt: z.date().nullable(),
  lastValidationStatus: VALIDATION_STATUS_SCHEMA.nullable(),
  activationStatus: SSO_ACTIVATION_STATUS_SCHEMA,
  isStale: z.boolean(),
  staleWarning: z.string().optional(),
  canActivate: z.boolean(),
});

export type SSOValidationSummary = z.infer<typeof SSO_VALIDATION_SUMMARY_SCHEMA>;

export const DEFAULT_VALIDATION_FRESHNESS_SECONDS = 86400;

export const VALIDATION_WARNING_THRESHOLD_SECONDS = 43200;
