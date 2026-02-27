import { z } from 'zod';

export const SessionStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const sessionStatusSchema = z.enum([
  SessionStatus.ACTIVE,
  SessionStatus.EXPIRED,
  SessionStatus.REVOKED,
]);

export const sessionRegistryQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  status: sessionStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SessionRegistryQuery = z.infer<typeof sessionRegistryQuerySchema>;

export const sessionSummarySchema = z.object({
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
  status: sessionStatusSchema,
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const sessionListResponseSchema = z.object({
  sessions: z.array(sessionSummarySchema),
  nextCursor: z.string().optional(),
  total: z.number().int().min(0),
});

export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;

export const SessionRevocationResult = {
  REVOKED: 'revoked',
  ALREADY_REVOKED: 'already_revoked',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  FAILED: 'failed',
} as const;

export type SessionRevocationResult =
  (typeof SessionRevocationResult)[keyof typeof SessionRevocationResult];

export const sessionRevocationResultSchema = z.enum([
  SessionRevocationResult.REVOKED,
  SessionRevocationResult.ALREADY_REVOKED,
  SessionRevocationResult.NOT_FOUND,
  SessionRevocationResult.FORBIDDEN,
  SessionRevocationResult.FAILED,
]);

export const singleSessionRevocationResponseSchema = z.object({
  result: sessionRevocationResultSchema,
  sessionId: z.string().uuid(),
  reason: z.string(),
});

export type SingleSessionRevocationResponse = z.infer<typeof singleSessionRevocationResponseSchema>;

export const bulkSessionRevocationResponseSchema = z.object({
  result: sessionRevocationResultSchema,
  sessionsRevoked: z.number().int().min(0),
  reason: z.string(),
});

export type BulkSessionRevocationResponse = z.infer<typeof bulkSessionRevocationResponseSchema>;

export const tenantWideRevocationResponseSchema = z.object({
  result: sessionRevocationResultSchema,
  sessionsRevoked: z.number().int().min(0),
  reason: z.string(),
});

export type TenantWideRevocationResponse = z.infer<typeof tenantWideRevocationResponseSchema>;

export const adminSessionPermissions = {
  SESSIONS_READ: 'admin:sessions:read',
  SESSIONS_REVOKE: 'admin:sessions:revoke',
  SESSIONS_REVOKE_TENANT: 'admin:sessions:revoke:tenant',
} as const;

export type AdminSessionPermission =
  (typeof adminSessionPermissions)[keyof typeof adminSessionPermissions];
