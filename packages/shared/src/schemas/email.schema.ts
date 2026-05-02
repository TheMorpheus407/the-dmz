import { z } from 'zod';

import { DEFAULT_EMAIL_TIMEOUT_MS } from '../constants/index.js';

export enum EmailProviderType {
  SMTP = 'smtp',
  EXCHANGE_ONLINE = 'exchange_online',
  GOOGLE_WORKSPACE = 'google_workspace',
}

export enum EmailIntegrationStatus {
  DRAFT = 'draft',
  VALIDATING = 'validating',
  READY = 'ready',
  DEGRADED = 'degraded',
  DISABLED = 'disabled',
}

export enum AuthenticationPostureStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  UNKNOWN = 'unknown',
}

export enum ValidationFailureReason {
  DKIM_KEY_TOO_SHORT = 'dkim_key_too_short',
  DKIM_KEY_INVALID = 'dkim_key_invalid',
  SPF_NOT_CONFIGURED = 'spf_not_configured',
  SPF_INVALID = 'spf_invalid',
  DMARC_NOT_CONFIGURED = 'dmarc_not_configured',
  DMARC_INVALID = 'dmarc_invalid',
  CREDENTIAL_EXPIRED = 'credential_expired',
  CREDENTIAL_INVALID = 'credential_invalid',
  CREDENTIAL_REVOKED = 'credential_revoked',
  TENANT_ISOLATION_VIOLATED = 'tenant_isolation_violated',
  CONFIGURATION_INVALID = 'configuration_invalid',
  NETWORK_UNREACHABLE = 'network_unreachable',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

export const smtpEncryptionTypeSchema = z.enum(['none', 'starttls', 'tls']);

export type SmtpEncryptionType = z.infer<typeof smtpEncryptionTypeSchema>;

export const smtpConfigInputSchema = z
  .object({
    host: z.string().min(1).max(255),
    port: z.number().int().min(1).max(65535),
    encryption: smtpEncryptionTypeSchema.optional(),
    username: z.string().min(1).max(256).optional(),
    passwordRef: z.string().min(1).max(256).optional(),
    fromAddress: z.string().email().max(320),
    fromName: z.string().max(100).optional(),
    replyToAddress: z.string().email().max(320).optional(),
    maxConnections: z.number().int().positive().max(100).optional(),
    timeoutMs: z.number().int().positive().max(60000).optional(),
  })
  .strict();

export const smtpConfigSchema = z
  .object({
    host: z.string().min(1).max(255),
    port: z.number().int().min(1).max(65535),
    encryption: smtpEncryptionTypeSchema.default('tls'),
    username: z.string().min(1).max(256).optional(),
    passwordRef: z.string().min(1).max(256).optional(),
    fromAddress: z.string().email().max(320),
    fromName: z.string().max(100).optional(),
    replyToAddress: z.string().email().max(320).optional(),
    maxConnections: z.number().int().positive().max(100).default(5),
    timeoutMs: z.number().int().positive().max(60000).default(DEFAULT_EMAIL_TIMEOUT_MS),
  })
  .strict();

export type SmtpConfig = z.infer<typeof smtpConfigSchema>;

export const exchangeAuthTypeSchema = z.enum(['oauth2', 'basic']);

export type ExchangeAuthType = z.infer<typeof exchangeAuthTypeSchema>;

export const exchangeConfigInputSchema = z
  .object({
    authType: exchangeAuthTypeSchema.optional(),
    tenantId: z.string().uuid(),
    clientId: z.string().min(1).max(256),
    clientSecretRef: z.string().min(1).max(256).optional(),
    authorityHost: z.string().url().optional(),
    scopes: z.array(z.string().min(1)).min(1),
    fromAddress: z.string().email().max(320),
    fromName: z.string().max(100).optional(),
    replyToAddress: z.string().email().max(320).optional(),
    webhooks: z
      .object({
        statusCallbackUrl: z.string().url().optional(),
        bounceCallbackUrl: z.string().url().optional(),
      })
      .optional(),
  })
  .strict();

export const exchangeConfigSchema = z
  .object({
    authType: exchangeAuthTypeSchema.default('oauth2'),
    tenantId: z.string().uuid(),
    clientId: z.string().min(1).max(256),
    clientSecretRef: z.string().min(1).max(256).optional(),
    authorityHost: z.string().url().default('https://login.microsoftonline.com'),
    scopes: z.array(z.string().min(1)).min(1),
    fromAddress: z.string().email().max(320),
    fromName: z.string().max(100).optional(),
    replyToAddress: z.string().email().max(320).optional(),
    webhooks: z
      .object({
        statusCallbackUrl: z.string().url().optional(),
        bounceCallbackUrl: z.string().url().optional(),
      })
      .optional(),
  })
  .strict();

export type ExchangeConfig = z.infer<typeof exchangeConfigSchema>;

export const googleWorkspaceAuthTypeSchema = z.enum(['oauth2', 'service_account']);

export type GoogleWorkspaceAuthType = z.infer<typeof googleWorkspaceAuthTypeSchema>;

export const googleWorkspaceConfigInputSchema = z
  .object({
    authType: googleWorkspaceAuthTypeSchema.optional(),
    clientId: z.string().min(1).max(256),
    clientSecretRef: z.string().min(1).max(256).optional(),
    refreshTokenRef: z.string().min(1).max(256).optional(),
    serviceAccountKeyRef: z.string().min(1).max(4096).optional(),
    delegatedUser: z.string().email().max(320).optional(),
    scopes: z.array(z.string().min(1)).min(1),
    fromAddress: z.string().email().max(320),
    fromName: z.string().max(100).optional(),
    replyToAddress: z.string().email().max(320).optional(),
  })
  .strict();

export const googleWorkspaceConfigSchema = z
  .object({
    authType: googleWorkspaceAuthTypeSchema.default('oauth2'),
    clientId: z.string().min(1).max(256),
    clientSecretRef: z.string().min(1).max(256).optional(),
    refreshTokenRef: z.string().min(1).max(256).optional(),
    serviceAccountKeyRef: z.string().min(1).max(4096).optional(),
    delegatedUser: z.string().email().max(320).optional(),
    scopes: z.array(z.string().min(1)).min(1),
    fromAddress: z.string().email().max(320),
    fromName: z.string().max(100).optional(),
    replyToAddress: z.string().email().max(320).optional(),
  })
  .strict();

export type GoogleWorkspaceConfig = z.infer<typeof googleWorkspaceConfigSchema>;

export const emailProviderConfigSchema = z.discriminatedUnion('providerType', [
  smtpConfigSchema.extend({ providerType: z.literal(EmailProviderType.SMTP) }),
  exchangeConfigSchema.extend({ providerType: z.literal(EmailProviderType.EXCHANGE_ONLINE) }),
  googleWorkspaceConfigSchema.extend({
    providerType: z.literal(EmailProviderType.GOOGLE_WORKSPACE),
  }),
]);

export type EmailProviderConfig = z.infer<typeof emailProviderConfigSchema>;

export const emailProviderConfigInputSchema = z.discriminatedUnion('providerType', [
  smtpConfigInputSchema.extend({ providerType: z.literal(EmailProviderType.SMTP) }),
  exchangeConfigInputSchema.extend({ providerType: z.literal(EmailProviderType.EXCHANGE_ONLINE) }),
  googleWorkspaceConfigInputSchema.extend({
    providerType: z.literal(EmailProviderType.GOOGLE_WORKSPACE),
  }),
]);

export type EmailProviderConfigInput = z.infer<typeof emailProviderConfigInputSchema>;

export const dkimConfigSchema = z
  .object({
    enabled: z.boolean(),
    selector: z.string().min(1).max(100).optional(),
    publicKey: z.string().max(4096).optional(),
    privateKeyRef: z.string().max(256).optional(),
    keyType: z.enum(['rsa', 'ed25519']).default('rsa'),
    keySize: z.number().int().min(1024).max(4096).default(2048),
    signingAlgorithm: z.enum(['sha256', 'sha512']).default('sha256'),
  })
  .strict();

export type DkimConfig = z.infer<typeof dkimConfigSchema>;

export const spfConfigSchema = z
  .object({
    enabled: z.boolean(),
    record: z.string().max(255).optional(),
    includeDomains: z.array(z.string().min(1).max(253)).default([]),
  })
  .strict();

export type SpfConfig = z.infer<typeof spfConfigSchema>;

export const dmarcPolicySchema = z.enum(['none', 'quarantine', 'reject']);

export type DmarcPolicy = z.infer<typeof dmarcPolicySchema>;

export const dmarcConfigSchema = z
  .object({
    enabled: z.boolean(),
    policy: dmarcPolicySchema.default('none'),
    ruaUri: z.string().max(255).optional(),
    rufUri: z.string().max(255).optional(),
    subdomainPolicy: dmarcPolicySchema.optional(),
    percent: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export type DmarcConfig = z.infer<typeof dmarcConfigSchema>;

export const authenticationPostureSchema = z
  .object({
    spf: z.object({
      status: z.nativeEnum(AuthenticationPostureStatus),
      record: z.string().max(255).optional(),
      aligned: z.boolean().optional(),
      checkedAt: z.string().datetime().optional(),
    }),
    dkim: z.object({
      status: z.nativeEnum(AuthenticationPostureStatus),
      selector: z.string().max(100).optional(),
      publicKeySize: z.number().int().optional(),
      aligned: z.boolean().optional(),
      checkedAt: z.string().datetime().optional(),
    }),
    dmarc: z.object({
      status: z.nativeEnum(AuthenticationPostureStatus),
      policy: dmarcPolicySchema.optional(),
      aligned: z.boolean().optional(),
      checkedAt: z.string().datetime().optional(),
    }),
  })
  .strict();

export type AuthenticationPosture = z.infer<typeof authenticationPostureSchema>;

export const validationFailureSchema = z.object({
  reason: z.nativeEnum(ValidationFailureReason),
  field: z.string().optional(),
  message: z.string().max(500),
  detectedAt: z.string().datetime(),
});

export type ValidationFailure = z.infer<typeof validationFailureSchema>;

export const emailIntegrationSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string().min(1).max(255),
    providerType: z.nativeEnum(EmailProviderType),
    config: emailProviderConfigSchema,
    status: z.nativeEnum(EmailIntegrationStatus),
    authenticationPosture: authenticationPostureSchema.optional(),
    validationFailures: z.array(validationFailureSchema).default([]),
    capabilities: z
      .object({
        maxDailyVolume: z.number().int().positive().optional(),
        supportsTracking: z.boolean().default(false),
        supportsTemplates: z.boolean().default(false),
        supportsWebhooks: z.boolean().default(false),
      })
      .default({}),
    tenantIsolationMetadata: z
      .object({
        isolatedTenantId: z.string().uuid(),
        dedicatedIpPool: z.string().max(100).optional(),
        ipWarmupStatus: z.enum(['not_started', 'in_progress', 'complete']).optional(),
      })
      .optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    lastValidatedAt: z.date().optional(),
  })
  .strict();

export type EmailIntegration = z.infer<typeof emailIntegrationSchema>;

export const createEmailIntegrationSchema = z
  .object({
    name: z.string().min(1).max(255),
    providerType: z.nativeEnum(EmailProviderType),
    config: emailProviderConfigInputSchema,
    capabilities: z
      .object({
        maxDailyVolume: z.number().int().positive().optional(),
        supportsTracking: z.boolean().optional(),
        supportsTemplates: z.boolean().optional(),
        supportsWebhooks: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

export type CreateEmailIntegrationInput = z.infer<typeof createEmailIntegrationSchema>;

export const updateEmailIntegrationSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    config: emailProviderConfigInputSchema.optional(),
    status: z.nativeEnum(EmailIntegrationStatus).optional(),
  })
  .strict();

export type UpdateEmailIntegrationInput = z.infer<typeof updateEmailIntegrationSchema>;

export const emailReadinessCheckSchema = z
  .object({
    integrationId: z.string().uuid(),
    requireSpf: z.boolean().default(true),
    requireDkim: z.boolean().default(true),
    requireDmarc: z.boolean().default(true),
    minDkimKeySize: z.number().int().min(1024).max(4096).default(2048),
    enforceTenantIsolation: z.boolean().default(true),
  })
  .strict();

export type EmailReadinessCheckInput = z.infer<typeof emailReadinessCheckSchema>;

export const emailReadinessResultSchema = z
  .object({
    integrationId: z.string().uuid(),
    ready: z.boolean(),
    checksPassed: z.array(z.string()),
    failures: z.array(validationFailureSchema),
    checkedAt: z.string().datetime(),
  })
  .strict();

export type EmailReadinessResult = z.infer<typeof emailReadinessResultSchema>;

export const DKIM_MIN_KEY_SIZE = 2048;

export const isValidDkimKeySize = (keySize: number): boolean => {
  return keySize >= DKIM_MIN_KEY_SIZE;
};

export const canTransitionToReady = (posture: AuthenticationPosture): boolean => {
  const spfValid =
    posture.spf.status === AuthenticationPostureStatus.VALID && posture.spf.aligned === true;
  const dkimValid =
    posture.dkim.status === AuthenticationPostureStatus.VALID && posture.dkim.aligned === true;
  const dmarcValid =
    posture.dmarc.status === AuthenticationPostureStatus.VALID && posture.dmarc.aligned == true;

  return spfValid && dkimValid && dmarcValid;
};

export const getValidationFailuresForReadiness = (
  posture: AuthenticationPosture,
  minDkimKeySize: number = DKIM_MIN_KEY_SIZE,
): ValidationFailure[] => {
  const failures: ValidationFailure[] = [];
  const now = new Date().toISOString();

  if (posture.spf.status !== AuthenticationPostureStatus.VALID || posture.spf.aligned !== true) {
    failures.push({
      reason:
        posture.spf.status === AuthenticationPostureStatus.PENDING
          ? ValidationFailureReason.SPF_NOT_CONFIGURED
          : ValidationFailureReason.SPF_INVALID,
      field: 'authenticationPosture.spf',
      message: 'SPF must be configured and aligned for email sending',
      detectedAt: now,
    });
  }

  if (posture.dkim.status !== AuthenticationPostureStatus.VALID || posture.dkim.aligned !== true) {
    failures.push({
      reason:
        posture.dkim.status === AuthenticationPostureStatus.PENDING
          ? ValidationFailureReason.DKIM_KEY_INVALID
          : ValidationFailureReason.DKIM_KEY_INVALID,
      field: 'authenticationPosture.dkim',
      message: 'DKIM must be configured and aligned for email sending',
      detectedAt: now,
    });
  }

  if (posture.dkim.publicKeySize !== undefined && posture.dkim.publicKeySize < minDkimKeySize) {
    failures.push({
      reason: ValidationFailureReason.DKIM_KEY_TOO_SHORT,
      field: 'authenticationPosture.dkim.keySize',
      message: `DKIM key size must be at least ${minDkimKeySize} bits`,
      detectedAt: now,
    });
  }

  if (
    posture.dmarc.status !== AuthenticationPostureStatus.VALID ||
    posture.dmarc.aligned !== true
  ) {
    failures.push({
      reason:
        posture.dmarc.status === AuthenticationPostureStatus.PENDING
          ? ValidationFailureReason.DMARC_NOT_CONFIGURED
          : ValidationFailureReason.DMARC_INVALID,
      field: 'authenticationPosture.dmarc',
      message: 'DMARC must be configured and aligned for email sending',
      detectedAt: now,
    });
  }

  return failures;
};
