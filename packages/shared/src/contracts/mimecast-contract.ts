import { z } from 'zod';

export const MIMECAST_INTEGRATION_VERSION = '1.0.0';
export const MIMECAST_COMPATIBILITY_NOTES =
  'Mimecast gateway allowlisting for phishing simulation delivery. Supports sender authentication, SPF/DKIM/DMARC, and bounce notification callbacks.';

export const mimecastAllowlistPayloadSchema = z
  .object({
    version: z.string(),
    payloadType: z.literal('email_allowlist'),
    tenantId: z.string().uuid(),
    configurationId: z.string().uuid(),
    emailIntegrationId: z.string().uuid(),
    senderAuthentication: z
      .object({
        senderDomains: z.array(z.string().min(1).max(253)).min(1),
        senderIps: z.array(z.string().ip({ version: 'v4' })).default([]),
        spfInclude: z.string().max(255).optional(),
        dkimSelector: z.string().max(100).optional(),
        dkimDomain: z.string().max(253).optional(),
      })
      .strict(),
    authenticationRequirements: z
      .object({
        requireSpf: z.boolean().default(true),
        requireDkim: z.boolean().default(true),
        requireDmarc: z.boolean().default(true),
        dmarcAction: z.enum(['none', 'quarantine', 'reject']).default('none'),
      })
      .default({}),
    bounceHandling: z
      .object({
        enabled: z.boolean(),
        returnPath: z.string().max(320).optional(),
        callbackUrl: z.string().url().optional(),
        callbackAuth: z
          .object({
            type: z.enum(['basic', 'bearer', 'api_key']),
            credentialsRef: z.string().max(256),
          })
          .optional(),
      })
      .default({ enabled: false }),
    metadata: z
      .object({
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        requestedBy: z.string().max(255),
        validUntil: z.string().datetime().optional(),
        notes: z.string().max(1000).optional(),
      })
      .strict(),
  })
  .strict();

export type MimecastAllowlistPayload = z.infer<typeof mimecastAllowlistPayloadSchema>;

export const mimecastAuthRequirementsSchema = z.object({
  requiredSenderDomains: z.array(z.string()).min(1),
  requiresSpfAlignment: z.boolean().default(true),
  requiresDkimAlignment: z.boolean().default(true),
  requiresDmarcPolicy: z.boolean().default(true),
  minDkimKeySize: z.number().int().min(1024).max(4096).default(2048),
  supportedDmarcActions: z.array(z.enum(['none', 'quarantine', 'reject'])),
  requiresTenantIsolation: z.boolean().default(true),
});

export type MimecastAuthRequirements = z.infer<typeof mimecastAuthRequirementsSchema>;

export const mimecastBounceNotificationSchema = z
  .object({
    type: z.enum(['hard_bounce', 'soft_bounce', 'spam', 'unsubscribe', 'policy_reject']),
    messageId: z.string().max(100),
    recipient: z.string().email().max(320),
    code: z.string().max(50).optional(),
    reason: z.string().max(500).optional(),
    timestamp: z.string().datetime(),
  })
  .strict();

export type MimecastBounceNotification = z.infer<typeof mimecastBounceNotificationSchema>;

export const m1MimecastAllowlistContractSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  payloadSchema: z.literal('mimecast_email_allowlist_v1'),
  supportedPayloadVersions: z.array(z.string()),
  authRequirements: mimecastAuthRequirementsSchema,
  bounceHandlingSupported: z.boolean(),
  supportedDmarcActions: z.array(z.enum(['none', 'quarantine', 'reject'])),
});

export type M1MimecastAllowlistContract = z.infer<typeof m1MimecastAllowlistContractSchema>;

export const MIMECAST_ERROR_CODES = {
  INVALID_SENDER_DOMAIN: 'MIMECAST_INVALID_SENDER_DOMAIN',
  INVALID_SENDER_IP: 'MIMECAST_INVALID_SENDER_IP',
  MISSING_REQUIRED_DOMAINS: 'MIMECAST_MISSING_REQUIRED_DOMAINS',
  TENANT_ISOLATION_VIOLATED: 'MIMECAST_TENANT_ISOLATION_VIOLATED',
  AUTH_REQUIREMENTS_NOT_MET: 'MIMECAST_AUTH_REQUIREMENTS_NOT_MET',
  UNSUPPORTED_DMARC_ACTION: 'MIMECAST_UNSUPPORTED_DMARC_ACTION',
  INVALID_CALLBACK_CONFIG: 'MIMECAST_INVALID_CALLBACK_CONFIG',
  INVALID_VERSION: 'MIMECAST_INVALID_VERSION',
} as const;

export type MimecastErrorCode = (typeof MIMECAST_ERROR_CODES)[keyof typeof MIMECAST_ERROR_CODES];

export const isValidMimecastPayload = (payload: unknown): payload is MimecastAllowlistPayload => {
  return mimecastAllowlistPayloadSchema.safeParse(payload).success;
};

export const validateMimecastAuthRequirements = (
  requirements: MimecastAuthRequirements,
  posture: {
    spfAligned: boolean;
    dkimAligned: boolean;
    dkimKeySize: number;
    dmarcAligned: boolean;
    dmarcAction: 'none' | 'quarantine' | 'reject';
    tenantId: string;
    payloadTenantId: string;
  },
): { valid: boolean; failures: string[] } => {
  const failures: string[] = [];

  if (requirements.requiresSpfAlignment && !posture.spfAligned) {
    failures.push('SPF alignment is required but not present');
  }

  if (requirements.requiresDkimAlignment && !posture.dkimAligned) {
    failures.push('DKIM alignment is required but not present');
  }

  if (posture.dkimKeySize < requirements.minDkimKeySize) {
    failures.push(
      `DKIM key size ${posture.dkimKeySize} is below minimum ${requirements.minDkimKeySize}`,
    );
  }

  if (requirements.requiresDmarcPolicy && !posture.dmarcAligned) {
    failures.push('DMARC policy is required but not present');
  }

  if (!requirements.supportedDmarcActions.includes(posture.dmarcAction)) {
    failures.push(`DMARC action ${posture.dmarcAction} is not supported`);
  }

  if (requirements.requiresTenantIsolation && posture.tenantId !== posture.payloadTenantId) {
    failures.push('Tenant isolation violation detected');
  }

  return {
    valid: failures.length === 0,
    failures,
  };
};
