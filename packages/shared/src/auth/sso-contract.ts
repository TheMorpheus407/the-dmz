import { z } from 'zod';

export const SSOProviderType = {
  SAML: 'saml',
  OIDC: 'oidc',
} as const;

export type SSOProviderType = (typeof SSOProviderType)[keyof typeof SSOProviderType];

export const ssoProviderTypeSchema = z.enum([SSOProviderType.SAML, SSOProviderType.OIDC]);

export const SAMLSignatureAlgorithm = {
  RSA_SHA256: 'RSA-SHA256',
  RSA_SHA384: 'RSA-SHA384',
  RSA_SHA512: 'RSA-SHA512',
  ECDSA_SHA256: 'ECDSA-SHA256',
  ECDSA_SHA384: 'ECDSA-SHA384',
  ECDSA_SHA512: 'ECDSA-SHA512',
} as const;

export type SAMLSignatureAlgorithm =
  (typeof SAMLSignatureAlgorithm)[keyof typeof SAMLSignatureAlgorithm];

export const samlSignatureAlgorithmSchema = z.enum([
  SAMLSignatureAlgorithm.RSA_SHA256,
  SAMLSignatureAlgorithm.RSA_SHA384,
  SAMLSignatureAlgorithm.RSA_SHA512,
  SAMLSignatureAlgorithm.ECDSA_SHA256,
  SAMLSignatureAlgorithm.ECDSA_SHA384,
  SAMLSignatureAlgorithm.ECDSA_SHA512,
]);

export const OIDCSignatureAlgorithm = {
  RS256: 'RS256',
  RS384: 'RS384',
  RS512: 'RS512',
  ES256: 'ES256',
  ES384: 'ES384',
  ES512: 'ES512',
  PS256: 'PS256',
  PS384: 'PS384',
  PS512: 'PS512',
} as const;

export type OIDCSignatureAlgorithm =
  (typeof OIDCSignatureAlgorithm)[keyof typeof OIDCSignatureAlgorithm];

export const oidcSignatureAlgorithmSchema = z.enum([
  OIDCSignatureAlgorithm.RS256,
  OIDCSignatureAlgorithm.RS384,
  OIDCSignatureAlgorithm.RS512,
  OIDCSignatureAlgorithm.ES256,
  OIDCSignatureAlgorithm.ES384,
  OIDCSignatureAlgorithm.ES512,
  OIDCSignatureAlgorithm.PS256,
  OIDCSignatureAlgorithm.PS384,
  OIDCSignatureAlgorithm.PS512,
]);

export interface SAMLProviderConfig {
  type: typeof SSOProviderType.SAML;
  issuer: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  signatureAlgorithm: SAMLSignatureAlgorithm;
  wantAssertionsSigned: boolean;
  wantMessagesSigned: boolean;
  allowedClockSkewSeconds: number;
  attributeConsumingServiceIndex?: string | undefined;
}

export interface OIDCProviderConfig {
  type: typeof SSOProviderType.OIDC;
  issuer: string;
  clientId: string;
  clientSecret?: string | undefined;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string | undefined;
  jwksUri: string;
  scopes: string[];
  idTokenSignedResponseAlg: OIDCSignatureAlgorithm;
  idTokenAlg?: OIDCSignatureAlgorithm | undefined;
  allowedClockSkewSeconds: number;
  responseType: string;
  responseMode?: 'query' | 'fragment' | 'form_post' | undefined;
}

export type SSOProviderConfig = SAMLProviderConfig | OIDCProviderConfig;

export const samlProviderConfigSchema = z.object({
  type: z.literal(SSOProviderType.SAML),
  issuer: z.string().min(1),
  entityId: z.string().min(1),
  ssoUrl: z.string().url(),
  certificate: z.string().min(1),
  signatureAlgorithm: samlSignatureAlgorithmSchema,
  wantAssertionsSigned: z.boolean(),
  wantMessagesSigned: z.boolean(),
  allowedClockSkewSeconds: z.number().int().min(0).max(3600),
  attributeConsumingServiceIndex: z.string().optional(),
});

export const oidcProviderConfigSchema = z.object({
  type: z.literal(SSOProviderType.OIDC),
  issuer: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().optional(),
  authorizationEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  userinfoEndpoint: z.string().url().optional(),
  jwksUri: z.string().url(),
  scopes: z.array(z.string()).min(1),
  idTokenSignedResponseAlg: oidcSignatureAlgorithmSchema,
  idTokenAlg: oidcSignatureAlgorithmSchema.optional(),
  allowedClockSkewSeconds: z.number().int().min(0).max(3600),
  responseType: z.string(),
  responseMode: z.enum(['query', 'fragment', 'form_post']).optional(),
});

export const ssoProviderConfigSchema = z.discriminatedUnion('type', [
  samlProviderConfigSchema,
  oidcProviderConfigSchema,
]);

export const SSOIdentityClaimSchema = z.object({
  subject: z.string().min(1),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  groups: z.array(z.string()).optional(),
  tenantHint: z.string().optional(),
});

export type SSOIdentityClaim = z.infer<typeof SSOIdentityClaimSchema>;

export const SSOTrustFailureReason = {
  INVALID_SIGNATURE: 'invalid_signature',
  ISSUER_MISMATCH: 'issuer_mismatch',
  AUDIENCE_MISMATCH: 'audience_mismatch',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_EARLY: 'token_early',
  REPLAY_DETECTED: 'replay_detected',
  STATE_MISMATCH: 'state_mismatch',
  NONCE_MISMATCH: 'nonce_mismatch',
  MISSING_REQUIRED_CLAIM: 'missing_required_claim',
  INVALID_ASSERTION: 'invalid_assertion',
  METADATA_FETCH_FAILED: 'metadata_fetch_failed',
  METADATA_INVALID: 'metadata_invalid',
  CONFIGURATION_ERROR: 'configuration_error',
} as const;

export type SSOTrustFailureReason =
  (typeof SSOTrustFailureReason)[keyof typeof SSOTrustFailureReason];

export const ssoTrustFailureReasonSchema = z.enum([
  SSOTrustFailureReason.INVALID_SIGNATURE,
  SSOTrustFailureReason.ISSUER_MISMATCH,
  SSOTrustFailureReason.AUDIENCE_MISMATCH,
  SSOTrustFailureReason.TOKEN_EXPIRED,
  SSOTrustFailureReason.TOKEN_EARLY,
  SSOTrustFailureReason.REPLAY_DETECTED,
  SSOTrustFailureReason.STATE_MISMATCH,
  SSOTrustFailureReason.NONCE_MISMATCH,
  SSOTrustFailureReason.MISSING_REQUIRED_CLAIM,
  SSOTrustFailureReason.INVALID_ASSERTION,
  SSOTrustFailureReason.METADATA_FETCH_FAILED,
  SSOTrustFailureReason.METADATA_INVALID,
  SSOTrustFailureReason.CONFIGURATION_ERROR,
]);

export const SSOAccountLinkingOutcome = {
  LINKED_EXISTING: 'linked_existing',
  LINKED_NEW: 'linked_new',
  LINKED_NEW_JIT: 'linked_new_jit',
  DENIED_EXISTING_MISMATCH: 'denied_existing_mismatch',
  DENIED_NO_EMAIL: 'denied_no_email',
  DENIED_TENANT_MISMATCH: 'denied_tenant_mismatch',
  DENIED_BLOCKED: 'denied_blocked',
  DENIED_ROLE_ESCALATION: 'denied_role_escalation',
} as const;

export type SSOAccountLinkingOutcome =
  (typeof SSOAccountLinkingOutcome)[keyof typeof SSOAccountLinkingOutcome];

export const ssoAccountLinkingOutcomeSchema = z.enum([
  SSOAccountLinkingOutcome.LINKED_EXISTING,
  SSOAccountLinkingOutcome.LINKED_NEW,
  SSOAccountLinkingOutcome.LINKED_NEW_JIT,
  SSOAccountLinkingOutcome.DENIED_EXISTING_MISMATCH,
  SSOAccountLinkingOutcome.DENIED_NO_EMAIL,
  SSOAccountLinkingOutcome.DENIED_TENANT_MISMATCH,
  SSOAccountLinkingOutcome.DENIED_BLOCKED,
  SSOAccountLinkingOutcome.DENIED_ROLE_ESCALATION,
]);

export const JITProvisioningBehavior = {
  CREATE: 'create',
  UPDATE: 'update',
  LINK: 'link',
  DENY: 'deny',
} as const;

export type JITProvisioningBehavior =
  (typeof JITProvisioningBehavior)[keyof typeof JITProvisioningBehavior];

export const jitProvisioningBehaviorSchema = z.enum([
  JITProvisioningBehavior.CREATE,
  JITProvisioningBehavior.UPDATE,
  JITProvisioningBehavior.LINK,
  JITProvisioningBehavior.DENY,
]);

export interface SSOTrustContract {
  version: string;
  providerConfigs: SSOProviderConfig[];
  defaultRole: string;
  allowedRolesForJIT: string[];
  jitProvisioningBehavior: JITProvisioningBehavior;
  allowGroupRoleMapping: boolean;
  groupToRoleMapping: Record<string, string>;
  clockSkewDefaultSeconds: number;
}

export const ssoTrustContractSchema: z.ZodType<SSOTrustContract> = z.object({
  version: z.string(),
  providerConfigs: z.array(ssoProviderConfigSchema),
  defaultRole: z.string(),
  allowedRolesForJIT: z.array(z.string()),
  jitProvisioningBehavior: jitProvisioningBehaviorSchema,
  allowGroupRoleMapping: z.boolean(),
  groupToRoleMapping: z.record(z.string()),
  clockSkewDefaultSeconds: z.number().int().min(0).max(3600),
});

export const SSOAuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  scope: z.string().optional(),
  user: SSOIdentityClaimSchema,
});

export type SSOAuthResponse = z.infer<typeof SSOAuthResponseSchema>;

export const SSOErrorResponseSchema = z.object({
  error: z.string(),
  errorDescription: z.string().optional(),
  errorCode: z.string(),
  correlationId: z.string().optional(),
});

export type SSOErrorResponse = z.infer<typeof SSOErrorResponseSchema>;

export interface IdPMetadata {
  issuer: string;
  entityId?: string;
  ssoUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUri?: string;
  certificates: string[];
  lastFetched: Date;
  expiresAt: Date;
}

export const idpMetadataSchema = z.object({
  issuer: z.string(),
  entityId: z.string().optional(),
  ssoUrl: z.string().optional(),
  authorizationEndpoint: z.string().optional(),
  tokenEndpoint: z.string().optional(),
  jwksUri: z.string().optional(),
  certificates: z.array(z.string()),
  lastFetched: z.date(),
  expiresAt: z.date(),
});
