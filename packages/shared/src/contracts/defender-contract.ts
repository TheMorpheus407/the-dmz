import { z } from 'zod';

export const DEFENDER_INTEGRATION_VERSION = '1.0.0';
export const DEFENDER_COMPATIBILITY_NOTES =
  'Microsoft Defender for Email (Exchange Online Protection) gateway allowlisting. Supports connector configuration, SPF/DKIM/DMARC, and tenant isolation.';

export const defenderAllowlistPayloadSchema = z
  .object({
    version: z.string(),
    payloadType: z.literal('email_allowlist'),
    tenantId: z.string().uuid(),
    configurationId: z.string().uuid(),
    emailIntegrationId: z.string().uuid(),
    connectorConfiguration: z
      .object({
        connectorName: z.string().min(1).max(100),
        connectorType: z.enum(['inbound', 'outbound']),
        sourceServer: z.string().ip({ version: 'v4' }).optional(),
        sourceServerRanges: z.array(z.string()).default([]),
        smartHost: z
          .object({
            address: z.string().max(255),
            port: z.number().int().min(1).max(65535),
          })
          .optional(),
        tlsSettings: z
          .object({
            requireTls: z.boolean().default(true),
            minTlsVersion: z.enum(['1.0', '1.1', '1.2', '1.3']).default('1.2'),
            certificateValidation: z.enum(['enabled', 'skip']).default('enabled'),
          })
          .default({}),
      })
      .strict(),
    senderDomains: z.array(z.string().min(1).max(253)).min(1),
    authentication: z
      .object({
        spfAlignmentRequired: z.boolean().default(true),
        dkimAlignmentRequired: z.boolean().default(true),
        dmarcPolicyRequired: z.boolean().default(true),
        dmarcAction: z.enum(['noaction', 'quarantine', 'reject']).default('noaction'),
      })
      .default({}),
    bypassRules: z
      .object({
        spamFilter: z.boolean().default(false),
        malwareFilter: z.boolean().default(false),
        connectionFilter: z.boolean().default(false),
        outboundPolicy: z.boolean().default(false),
      })
      .default({}),
    reporting: z
      .object({
        enableMessageTrace: z.boolean().default(true),
        webhookUrl: z.string().url().optional(),
        webhookAuth: z
          .object({
            type: z.enum(['aad_managed', 'oauth']),
            appId: z.string().max(100).optional(),
          })
          .optional(),
      })
      .default({}),
    metadata: z
      .object({
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        requestedBy: z.string().max(255),
        validUntil: z.string().datetime().optional(),
      })
      .strict(),
  })
  .strict();

export type DefenderAllowlistPayload = z.infer<typeof defenderAllowlistPayloadSchema>;

export const defenderAuthRequirementsSchema = z.object({
  requiredSenderDomains: z.array(z.string()).min(1),
  requiresSpfAlignment: z.boolean().default(true),
  requiresDkimAlignment: z.boolean().default(true),
  requiresDmarcPolicy: z.boolean().default(true),
  minDkimKeySize: z.number().int().min(1024).max(4096).default(2048),
  requiresTenantIsolation: z.boolean().default(true),
  requiresTls: z.boolean().default(true),
  minTlsVersion: z.enum(['1.0', '1.1', '1.2', '1.3']).default('1.2'),
});

export type DefenderAuthRequirements = z.infer<typeof defenderAuthRequirementsSchema>;

export const defenderNotificationSchema = z
  .object({
    type: z.enum(['mailitem', 'recipientinfo', 'tlsinfo', 'policyinfo']),
    messageId: z.string().max(100).optional(),
    recipient: z.string().email().max(320).optional(),
    action: z.string().max(100).optional(),
    timestamp: z.string().datetime(),
    details: z.record(z.unknown()).optional(),
  })
  .strict();

export type DefenderNotification = z.infer<typeof defenderNotificationSchema>;

export const m1DefenderAllowlistContractSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  payloadSchema: z.literal('defender_email_allowlist_v1'),
  supportedPayloadVersions: z.array(z.string()),
  authRequirements: defenderAuthRequirementsSchema,
  supportedConnectorTypes: z.array(z.enum(['inbound', 'outbound'])),
  supportedTlsVersions: z.array(z.enum(['1.0', '1.1', '1.2', '1.3'])),
  supportedDmarcActions: z.array(z.enum(['noaction', 'quarantine', 'reject'])),
});

export type M1DefenderAllowlistContract = z.infer<typeof m1DefenderAllowlistContractSchema>;

export const DEFENDER_ERROR_CODES = {
  INVALID_CONNECTOR_CONFIG: 'DEFENDER_INVALID_CONNECTOR_CONFIG',
  INVALID_TLS_SETTINGS: 'DEFENDER_INVALID_TLS_SETTINGS',
  TENANT_ISOLATION_VIOLATED: 'DEFENDER_TENANT_ISOLATION_VIOLATED',
  AUTH_REQUIREMENTS_NOT_MET: 'DEFENDER_AUTH_REQUIREMENTS_NOT_MET',
  MISSING_REQUIRED_DOMAINS: 'DEFENDER_MISSING_REQUIRED_DOMAINS',
  UNSUPPORTED_TLS_VERSION: 'DEFENDER_UNSUPPORTED_TLS_VERSION',
  UNSUPPORTED_DMARC_ACTION: 'DEFENDER_UNSUPPORTED_DMARC_ACTION',
  INVALID_WEBHOOK_CONFIG: 'DEFENDER_INVALID_WEBHOOK_CONFIG',
  INVALID_VERSION: 'DEFENDER_INVALID_VERSION',
} as const;

export type DefenderErrorCode = (typeof DEFENDER_ERROR_CODES)[keyof typeof DEFENDER_ERROR_CODES];

export const isValidDefenderPayload = (payload: unknown): payload is DefenderAllowlistPayload => {
  return defenderAllowlistPayloadSchema.safeParse(payload).success;
};

export const validateDefenderAuthRequirements = (
  requirements: DefenderAuthRequirements,
  posture: {
    spfAligned: boolean;
    dkimAligned: boolean;
    dkimKeySize: number;
    dmarcAligned: boolean;
    dmarcAction: 'noaction' | 'quarantine' | 'reject';
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

  if (requirements.requiresTenantIsolation && posture.tenantId !== posture.payloadTenantId) {
    failures.push('Tenant isolation violation detected');
  }

  return {
    valid: failures.length === 0,
    failures,
  };
};
