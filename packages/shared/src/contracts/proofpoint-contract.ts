import { z } from 'zod';

export const PROOFPOINT_INTEGRATION_VERSION = '1.0.0';
export const PROOFPOINT_COMPATIBILITY_NOTES =
  'Proofpoint Email Protection gateway allowlisting for phishing simulation delivery. Supports IP allowlisting, SPF/DKIM/DMARC authentication, and bounce handling.';

export const proofpointAllowlistPayloadSchema = z
  .object({
    version: z.string(),
    payloadType: z.literal('email_allowlist'),
    tenantId: z.string().uuid(),
    configurationId: z.string().uuid(),
    emailIntegrationId: z.string().uuid(),
    ips: z.array(z.string().ip({ version: 'v4' })),
    domains: z.array(z.string().min(1).max(253)),
    fromAddresses: z.array(z.string().email().max(320)),
    spfEnabled: z.boolean().default(true),
    dkimEnabled: z.boolean().default(true),
    dmarcEnabled: z.boolean().default(true),
    bounceHandling: z
      .object({
        enabled: z.boolean(),
        returnPath: z.string().email().max(320).optional(),
        notifyEndpoint: z.string().url().optional(),
      })
      .default({ enabled: false }),
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

export type ProofpointAllowlistPayload = z.infer<typeof proofpointAllowlistPayloadSchema>;

export const proofpointAuthRequirementsSchema = z.object({
  requiredIpRange: z.array(z.string()).min(1),
  requiresSpfAlignment: z.boolean().default(true),
  requiresDkimAlignment: z.boolean().default(true),
  requiresDmarcPolicy: z.boolean().default(true),
  minDkimKeySize: z.number().int().min(1024).max(4096).default(2048),
  requiresTenantIsolation: z.boolean().default(true),
});

export type ProofpointAuthRequirements = z.infer<typeof proofpointAuthRequirementsSchema>;

export const proofpointBounceNotificationSchema = z
  .object({
    notificationType: z.enum(['bounce', 'complaint', 'delay']),
    originalMessageId: z.string().max(100),
    bounceCode: z.string().max(50).optional(),
    bounceReason: z.string().max(500).optional(),
    recipient: z.string().email().max(320),
    timestamp: z.string().datetime(),
  })
  .strict();

export type ProofpointBounceNotification = z.infer<typeof proofpointBounceNotificationSchema>;

export const m1ProofpointAllowlistContractSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  payloadSchema: z.literal('proofpoint_email_allowlist_v1'),
  supportedPayloadVersions: z.array(z.string()),
  authRequirements: proofpointAuthRequirementsSchema,
  bounceHandlingSupported: z.boolean(),
});

export type M1ProofpointAllowlistContract = z.infer<typeof m1ProofpointAllowlistContractSchema>;

export const PROOFPOINT_ERROR_CODES = {
  INVALID_IP_FORMAT: 'PROOFPOINT_INVALID_IP_FORMAT',
  INVALID_DOMAIN_FORMAT: 'PROOFPOINT_INVALID_DOMAIN_FORMAT',
  TENANT_ISOLATION_VIOLATED: 'PROOFPOINT_TENANT_ISOLATION_VIOLATED',
  AUTH_REQUIREMENTS_NOT_MET: 'PROOFPOINT_AUTH_REQUIREMENTS_NOT_MET',
  PAYLOAD_TOO_LARGE: 'PROOFPOINT_PAYLOAD_TOO_LARGE',
  INVALID_VERSION: 'PROOFPOINT_INVALID_VERSION',
} as const;

export type ProofpointErrorCode =
  (typeof PROOFPOINT_ERROR_CODES)[keyof typeof PROOFPOINT_ERROR_CODES];

export const isValidProofpointPayload = (
  payload: unknown,
): payload is ProofpointAllowlistPayload => {
  return proofpointAllowlistPayloadSchema.safeParse(payload).success;
};

export const validateProofpointAuthRequirements = (
  requirements: ProofpointAuthRequirements,
  posture: {
    spfAligned: boolean;
    dkimAligned: boolean;
    dkimKeySize: number;
    dmarcAligned: boolean;
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
