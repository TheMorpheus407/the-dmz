import { z } from 'zod';

export const SessionStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SESSION_STATUS_SCHEMA = z.enum([
  SessionStatus.ACTIVE,
  SessionStatus.EXPIRED,
  SessionStatus.REVOKED,
]);

export const SESSION_REGISTRY_QUERY_SCHEMA = z.object({
  userId: z.string().uuid().optional(),
  status: SESSION_STATUS_SCHEMA.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SessionRegistryQuery = z.infer<typeof SESSION_REGISTRY_QUERY_SCHEMA>;

export const SESSION_SUMMARY_SCHEMA = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional()
    .nullable(),
  status: SESSION_STATUS_SCHEMA,
});

export type SessionSummary = z.infer<typeof SESSION_SUMMARY_SCHEMA>;

export const SESSION_LIST_RESPONSE_SCHEMA = z.object({
  sessions: z.array(SESSION_SUMMARY_SCHEMA),
  nextCursor: z.string().optional(),
  total: z.number().int().min(0),
});

export type SessionListResponse = z.infer<typeof SESSION_LIST_RESPONSE_SCHEMA>;

export const SessionRevocationResult = {
  REVOKED: 'revoked',
  ALREADY_REVOKED: 'already_revoked',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  FAILED: 'failed',
} as const;

export type SessionRevocationResult =
  (typeof SessionRevocationResult)[keyof typeof SessionRevocationResult];

export const SESSION_REVOCATION_RESULT_SCHEMA = z.enum([
  SessionRevocationResult.REVOKED,
  SessionRevocationResult.ALREADY_REVOKED,
  SessionRevocationResult.NOT_FOUND,
  SessionRevocationResult.FORBIDDEN,
  SessionRevocationResult.FAILED,
]);

export const SINGLE_SESSION_REVOCATION_RESPONSE_SCHEMA = z.object({
  result: SESSION_REVOCATION_RESULT_SCHEMA,
  sessionId: z.string().uuid(),
  reason: z.string(),
});

export type SingleSessionRevocationResponse = z.infer<
  typeof SINGLE_SESSION_REVOCATION_RESPONSE_SCHEMA
>;

export const BULK_SESSION_REVOCATION_RESPONSE_SCHEMA = z.object({
  result: SESSION_REVOCATION_RESULT_SCHEMA,
  sessionsRevoked: z.number().int().min(0),
  reason: z.string(),
});

export type BulkSessionRevocationResponse = z.infer<typeof BULK_SESSION_REVOCATION_RESPONSE_SCHEMA>;

export const TENANT_WIDE_REVOCATION_RESPONSE_SCHEMA = z.object({
  result: SESSION_REVOCATION_RESULT_SCHEMA,
  sessionsRevoked: z.number().int().min(0),
  reason: z.string(),
});

export type TenantWideRevocationResponse = z.infer<typeof TENANT_WIDE_REVOCATION_RESPONSE_SCHEMA>;

export const adminSessionPermissions = {
  SESSIONS_READ: 'admin:sessions:read',
  SESSIONS_REVOKE: 'admin:sessions:revoke',
  SESSIONS_REVOKE_TENANT: 'admin:sessions:revoke:tenant',
} as const;

export type AdminSessionPermission =
  (typeof adminSessionPermissions)[keyof typeof adminSessionPermissions];
