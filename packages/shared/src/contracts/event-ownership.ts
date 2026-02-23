import { z } from 'zod';

export const VERSION_POLICY_TYPES = ['additive', 'minor', 'major'] as const;
export type VersionPolicyType = (typeof VERSION_POLICY_TYPES)[number];

export const eventOwnershipSchema = z.object({
  eventType: z.string(),
  owningModule: z.string(),
  version: z.number().int().positive(),
  payloadSchema: z.string().optional(),
  requiredMetadata: z.array(z.string()),
  exemptions: z
    .array(
      z.object({
        module: z.string(),
        justification: z.string(),
        approvedBy: z.string().optional(),
      }),
    )
    .optional(),
});

export type EventOwnership = z.infer<typeof eventOwnershipSchema>;

export const eventExemptionSchema = z.object({
  eventType: z.string(),
  emittingModule: z.string(),
  justification: z.string(),
  approvedBy: z.string().optional(),
});

export type EventExemption = z.infer<typeof eventExemptionSchema>;

export const versionPolicySchema = z.object({
  allowedChanges: z.enum(VERSION_POLICY_TYPES),
  breakingVersions: z.array(z.number()).optional(),
  maxVersion: z.number().optional(),
});

export type VersionPolicy = z.infer<typeof versionPolicySchema>;

export const eventOwnershipManifestSchema = z.object({
  events: z.array(eventOwnershipSchema),
  exemptions: z.array(eventExemptionSchema).optional(),
  versionPolicy: versionPolicySchema,
  lastUpdated: z.string(),
});

export type EventOwnershipManifest = z.infer<typeof eventOwnershipManifestSchema>;

export const SENSITIVE_PAYLOAD_FIELDS = [
  'password',
  'passwordHash',
  'passwordSalt',
  'accessToken',
  'refreshToken',
  'token',
  'mfaSecret',
  'mfaCode',
  'mfaBackupCodes',
  'cookies',
  'sessionToken',
  'secret',
  'apiKey',
  'privateKey',
  'credential',
] as const;

export type SensitivePayloadField = (typeof SENSITIVE_PAYLOAD_FIELDS)[number];

export const REQUIRED_METADATA_FIELDS = [
  'eventId',
  'eventType',
  'timestamp',
  'correlationId',
  'tenantId',
  'userId',
  'source',
  'version',
] as const;

export type RequiredMetadataField = (typeof REQUIRED_METADATA_FIELDS)[number];
