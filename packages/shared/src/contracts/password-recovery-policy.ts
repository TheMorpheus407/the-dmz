import { z } from 'zod';

export const PasswordRecoveryErrorCode = {
  EXPIRED: 'AUTH_PASSWORD_RESET_TOKEN_EXPIRED',
  INVALID: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
  ALREADY_USED: 'AUTH_PASSWORD_RESET_TOKEN_ALREADY_USED',
  POLICY_DENIED: 'AUTH_PASSWORD_RESET_POLICY_DENIED',
  RATE_LIMITED: 'AUTH_PASSWORD_RESET_RATE_LIMITED',
} as const;

export type PasswordRecoveryErrorCode =
  (typeof PasswordRecoveryErrorCode)[keyof typeof PasswordRecoveryErrorCode];

export const PASSWORD_RECOVERY_ERROR_CODES = {
  EXPIRED: 'AUTH_PASSWORD_RESET_TOKEN_EXPIRED',
  INVALID: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
  ALREADY_USED: 'AUTH_PASSWORD_RESET_TOKEN_ALREADY_USED',
  POLICY_DENIED: 'AUTH_PASSWORD_RESET_POLICY_DENIED',
  RATE_LIMITED: 'AUTH_PASSWORD_RESET_RATE_LIMITED',
} as const;

export type PasswordRecoveryErrorCodes =
  (typeof PASSWORD_RECOVERY_ERROR_CODES)[keyof typeof PASSWORD_RECOVERY_ERROR_CODES];

export const passwordRecoveryOutcomeSchema = z.enum([
  'reset_requested',
  'reset_completed',
  'reset_failed_expired',
  'reset_failed_invalid',
  'reset_failed_already_used',
  'reset_failed_policy_denied',
  'reset_failed_rate_limited',
]);

export type PasswordRecoveryOutcome = z.infer<typeof passwordRecoveryOutcomeSchema>;

export const passwordRecoveryErrorCodeSchema = z.enum([
  PasswordRecoveryErrorCode.EXPIRED,
  PasswordRecoveryErrorCode.INVALID,
  PasswordRecoveryErrorCode.ALREADY_USED,
  PasswordRecoveryErrorCode.POLICY_DENIED,
  PasswordRecoveryErrorCode.RATE_LIMITED,
]);

export const passwordRecoveryPolicyManifestSchema = z.object({
  version: z.string().describe('Policy version'),
  enabled: z.boolean().describe('Whether password recovery is enabled'),
  defaults: z.object({
    tokenTtlSeconds: z
      .number()
      .int()
      .positive()
      .describe('Token time-to-live in seconds (default 1 hour)'),
    tokenLength: z.number().int().positive().describe('Length of reset token'),
    maxRequestsPerWindow: z
      .number()
      .int()
      .positive()
      .describe('Max reset requests per rate limit window'),
    rateLimitWindowSeconds: z.number().int().positive().describe('Rate limit window in seconds'),
  }),
  guardrails: z.object({
    minTokenTtlSeconds: z
      .number()
      .int()
      .positive()
      .describe('Minimum allowed token TTL for tenant overrides'),
    maxTokenTtlSeconds: z
      .number()
      .int()
      .positive()
      .describe('Maximum allowed token TTL for tenant overrides'),
    minTokenLength: z.number().int().positive().describe('Minimum token length'),
    maxTokenLength: z.number().int().positive().describe('Maximum token length'),
  }),
  errorContract: z.object({
    errorCodes: z.record(passwordRecoveryErrorCodeSchema, z.string()).describe('Error codes'),
    requiredDetails: z.array(z.string()).describe('Required fields in error details'),
  }),
  securityContract: z.object({
    tokenStorage: z.enum(['hashed']).describe('How tokens are stored'),
    singleUse: z.boolean().describe('Tokens are single-use only'),
    tenantIsolation: z.boolean().describe('Tokens are tenant-scoped'),
    sessionRevocationOnSuccess: z
      .boolean()
      .describe('Revoke all sessions on successful password change'),
  }),
});

export type PasswordRecoveryPolicyManifest = z.infer<typeof passwordRecoveryPolicyManifestSchema>;

export type M1PasswordRecoveryPolicyManifest = PasswordRecoveryPolicyManifest;

const M1_DEFAULTS = {
  tokenTtlSeconds: 3600,
  tokenLength: 32,
  maxRequestsPerWindow: 3,
  rateLimitWindowSeconds: 3600,
};

const M1_GUARDRAILS = {
  minTokenTtlSeconds: 300,
  maxTokenTtlSeconds: 86400,
  minTokenLength: 16,
  maxTokenLength: 64,
};

export const m1PasswordRecoveryPolicyManifest: M1PasswordRecoveryPolicyManifest = {
  version: '1.0.0',
  enabled: true,
  defaults: M1_DEFAULTS,
  guardrails: M1_GUARDRAILS,
  errorContract: {
    errorCodes: {
      [PasswordRecoveryErrorCode.EXPIRED]: 'Password reset token has expired',
      [PasswordRecoveryErrorCode.INVALID]: 'Password reset token is invalid',
      [PasswordRecoveryErrorCode.ALREADY_USED]: 'Password reset token has already been used',
      [PasswordRecoveryErrorCode.POLICY_DENIED]: 'Password does not meet policy requirements',
      [PasswordRecoveryErrorCode.RATE_LIMITED]:
        'Too many password reset requests. Please try again later.',
    },
    requiredDetails: ['reason'],
  },
  securityContract: {
    tokenStorage: 'hashed',
    singleUse: true,
    tenantIsolation: true,
    sessionRevocationOnSuccess: true,
  },
} as const;

export type M1PasswordRecoveryPolicy = typeof m1PasswordRecoveryPolicyManifest;

export interface PasswordResetTokenData {
  userId: string;
  tenantId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export const generateResetToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
};

export const getTenantRecoveryPolicy = (
  tenantOverrides:
    | Partial<{
        tokenTtlSeconds: number;
        tokenLength: number;
        maxRequestsPerWindow: number;
        rateLimitWindowSeconds: number;
      }>
    | undefined,
  manifest: M1PasswordRecoveryPolicyManifest = m1PasswordRecoveryPolicyManifest,
): {
  tokenTtlSeconds: number;
  tokenLength: number;
  maxRequestsPerWindow: number;
  rateLimitWindowSeconds: number;
} => {
  const defaults = manifest.defaults;
  const guardrails = manifest.guardrails;

  return {
    tokenTtlSeconds: Math.max(
      guardrails.minTokenTtlSeconds,
      Math.min(
        tenantOverrides?.tokenTtlSeconds ?? defaults.tokenTtlSeconds,
        guardrails.maxTokenTtlSeconds,
      ),
    ),
    tokenLength: Math.max(
      guardrails.minTokenLength,
      Math.min(tenantOverrides?.tokenLength ?? defaults.tokenLength, guardrails.maxTokenLength),
    ),
    maxRequestsPerWindow: tenantOverrides?.maxRequestsPerWindow ?? defaults.maxRequestsPerWindow,
    rateLimitWindowSeconds:
      tenantOverrides?.rateLimitWindowSeconds ?? defaults.rateLimitWindowSeconds,
  };
};
