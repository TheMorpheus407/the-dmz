import { z } from 'zod';

export const FederatedRevocationSourceType = {
  SAML: 'saml',
  OIDC: 'oidc',
  SCIM: 'scim',
  ADMIN: 'admin',
} as const;

export type FederatedRevocationSourceType =
  (typeof FederatedRevocationSourceType)[keyof typeof FederatedRevocationSourceType];

export const federatedRevocationSourceTypeSchema = z.enum([
  FederatedRevocationSourceType.SAML,
  FederatedRevocationSourceType.OIDC,
  FederatedRevocationSourceType.SCIM,
  FederatedRevocationSourceType.ADMIN,
]);

export const FederatedRevocationResult = {
  REVOKED: 'revoked',
  ALREADY_REVOKED: 'already_revoked',
  IGNORED_INVALID: 'ignored_invalid',
  FAILED: 'failed',
} as const;

export type FederatedRevocationResult =
  (typeof FederatedRevocationResult)[keyof typeof FederatedRevocationResult];

export const federatedRevocationResultSchema = z.enum([
  FederatedRevocationResult.REVOKED,
  FederatedRevocationResult.ALREADY_REVOKED,
  FederatedRevocationResult.IGNORED_INVALID,
  FederatedRevocationResult.FAILED,
]);

export const SAMLLogoutReason = {
  IDP_INITIATED: 'idp_initiated',
  SP_INITIATED: 'sp_initiated',
  SINGLE_LOGOUT: 'single_logout',
  SESSION_TIMEOUT: 'session_timeout',
  USER_REQUEST: 'user_request',
} as const;

export type SAMLLogoutReason = (typeof SAMLLogoutReason)[keyof typeof SAMLLogoutReason];

export const samlLogoutReasonSchema = z.enum([
  SAMLLogoutReason.IDP_INITIATED,
  SAMLLogoutReason.SP_INITIATED,
  SAMLLogoutReason.SINGLE_LOGOUT,
  SAMLLogoutReason.SESSION_TIMEOUT,
  SAMLLogoutReason.USER_REQUEST,
]);

export const SAMLLogoutStatus = {
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILURE: 'failure',
} as const;

export type SAMLLogoutStatus = (typeof SAMLLogoutStatus)[keyof typeof SAMLLogoutStatus];

export const samlLogoutStatusSchema = z.enum([
  SAMLLogoutStatus.SUCCESS,
  SAMLLogoutStatus.PARTIAL,
  SAMLLogoutStatus.FAILURE,
]);

export const SAMLLogoutPayloadSchema = z.object({
  issuer: z.string().min(1),
  destination: z.string().url().optional(),
  sessionIndex: z.string().optional(),
  nameId: z.string().optional(),
  reason: samlLogoutReasonSchema.optional(),
  status: samlLogoutStatusSchema.optional(),
  relayState: z.string().optional(),
  signature: z.string().optional(),
  signatureAlgorithm: z.string().optional(),
  SAMLResponse: z.string().optional(),
});

export type SAMLLogoutPayload = z.infer<typeof SAMLLogoutPayloadSchema>;

export const OIDCLogoutType = {
  BACK_CHANNEL: 'back_channel',
  FRONT_CHANNEL: 'front_channel',
  POST_LOGOUT_REDIRECT: 'post_logout_redirect',
} as const;

export type OIDCLogoutType = (typeof OIDCLogoutType)[keyof typeof OIDCLogoutType];

export const oidcLogoutTypeSchema = z.enum([
  OIDCLogoutType.BACK_CHANNEL,
  OIDCLogoutType.FRONT_CHANNEL,
  OIDCLogoutType.POST_LOGOUT_REDIRECT,
]);

export const OIDCLogoutPayloadSchema = z.object({
  issuer: z.string().min(1),
  logoutType: oidcLogoutTypeSchema,
  sub: z.string().optional(),
  sid: z.string().optional(),
  aud: z.string().optional(),
  nonce: z.string().optional(),
  idTokenHint: z.string().optional(),
  postLogoutRedirectUri: z.string().url().optional(),
  state: z.string().optional(),
});

export type OIDCLogoutPayload = z.infer<typeof OIDCLogoutPayloadSchema>;

export const SCIMDeprovisionTriggerSchema = z.object({
  scimUserId: z.string().min(1),
  externalId: z.string().optional(),
  email: z.string().email().optional(),
  reason: z.enum(['deactivate', 'delete', 'suspend']),
  idempotencyKey: z.string().min(1),
});

export type SCIMDeprovisionTrigger = z.infer<typeof SCIMDeprovisionTriggerSchema>;

export const FederatedRevocationRequestSchema = z.object({
  sourceType: federatedRevocationSourceTypeSchema,
  tenantId: z.string().uuid(),
  correlationId: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
  samlPayload: SAMLLogoutPayloadSchema.optional(),
  oidcPayload: OIDCLogoutPayloadSchema.optional(),
  scimPayload: SCIMDeprovisionTriggerSchema.optional(),
});

export type FederatedRevocationRequest = z.infer<typeof FederatedRevocationRequestSchema>;

export const FederatedRevocationResponseSchema = z.object({
  result: federatedRevocationResultSchema,
  sourceType: federatedRevocationSourceTypeSchema,
  sessionsRevoked: z.number().int().min(0),
  userId: z.string().uuid().optional(),
  correlationId: z.string().uuid().optional(),
  reason: z.string().optional(),
  diagnostics: z
    .object({
      timestamp: z.string().datetime(),
      processingTimeMs: z.number().int().positive(),
      idempotent: z.boolean(),
    })
    .optional(),
});

export type FederatedRevocationResponse = z.infer<typeof FederatedRevocationResponseSchema>;

export const FederatedRevocationErrorSchema = z.object({
  error: z.string(),
  errorCode: z.string(),
  message: z.string(),
  correlationId: z.string().uuid().optional(),
  sourceType: federatedRevocationSourceTypeSchema.optional(),
  reason: z.string().optional(),
});

export type FederatedRevocationError = z.infer<typeof FederatedRevocationErrorSchema>;

export const FederatedRevocationTrustFailureReason = {
  INVALID_SIGNATURE: 'invalid_signature',
  ISSUER_MISMATCH: 'issuer_mismatch',
  AUDIENCE_MISMATCH: 'audience_mismatch',
  TOKEN_EXPIRED: 'token_expired',
  MISSING_REQUIRED_FIELD: 'missing_required_field',
  INVALID_STATE: 'invalid_state',
  TENANT_MISMATCH: 'tenant_mismatch',
  USER_NOT_FOUND: 'user_not_found',
  CONFIGURATION_ERROR: 'configuration_error',
  UNAUTHORIZED: 'unauthorized',
} as const;

export type FederatedRevocationTrustFailureReason =
  (typeof FederatedRevocationTrustFailureReason)[keyof typeof FederatedRevocationTrustFailureReason];

export const federatedRevocationTrustFailureReasonSchema = z.enum([
  FederatedRevocationTrustFailureReason.INVALID_SIGNATURE,
  FederatedRevocationTrustFailureReason.ISSUER_MISMATCH,
  FederatedRevocationTrustFailureReason.AUDIENCE_MISMATCH,
  FederatedRevocationTrustFailureReason.TOKEN_EXPIRED,
  FederatedRevocationTrustFailureReason.MISSING_REQUIRED_FIELD,
  FederatedRevocationTrustFailureReason.INVALID_STATE,
  FederatedRevocationTrustFailureReason.TENANT_MISMATCH,
  FederatedRevocationTrustFailureReason.USER_NOT_FOUND,
  FederatedRevocationTrustFailureReason.CONFIGURATION_ERROR,
  FederatedRevocationTrustFailureReason.UNAUTHORIZED,
]);
