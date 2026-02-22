import { z } from 'zod';

import { ErrorCodeCategory, ErrorCodes, type ErrorCode } from '../constants/error-codes.js';

export { ErrorCodeCategory, ErrorCodes, type ErrorCode };

export const apiErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().optional(),
  })
  .strict();

export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiErrorEnvelopeSchema = z
  .object({
    success: z.literal(false),
    error: apiErrorSchema,
  })
  .strict();

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;

export const apiSuccessEnvelopeBaseSchema = z.object({
  success: z.literal(true),
});

export type ApiSuccessEnvelopeBase = z.infer<typeof apiSuccessEnvelopeBaseSchema>;

export const apiEnvelopeSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: z.unknown() }),
  apiErrorEnvelopeSchema,
]);

export type ApiEnvelope = z.infer<typeof apiEnvelopeSchema>;

export const apiErrorCategoryMap: Record<string, ErrorCodeCategory> = {
  AUTH_INVALID_CREDENTIALS: 'authentication',
  AUTH_TOKEN_EXPIRED: 'authentication',
  AUTH_TOKEN_INVALID: 'authentication',
  AUTH_MFA_REQUIRED: 'authentication',
  AUTH_ACCOUNT_LOCKED: 'authentication',
  AUTH_FORBIDDEN: 'authorization',
  AUTH_UNAUTHORIZED: 'authentication',
  AUTH_INSUFFICIENT_PERMS: 'authorization',
  AUTH_ACCOUNT_SUSPENDED: 'authorization',
  AUTH_CSRF_INVALID: 'authentication',
  AUTH_SESSION_EXPIRED: 'authentication',
  VALIDATION_FAILED: 'validation',
  VALIDATION_INVALID_FORMAT: 'validation',
  INVALID_INPUT: 'validation',
  RATE_LIMIT_EXCEEDED: 'rate_limiting',
  GAME_NOT_FOUND: 'server',
  GAME_STATE_INVALID: 'server',
  TENANT_NOT_FOUND: 'server',
  TENANT_SUSPENDED: 'authorization',
  TENANT_INACTIVE: 'authorization',
  TENANT_CONTEXT_MISSING: 'server',
  TENANT_CONTEXT_INVALID: 'server',
  SYSTEM_INTERNAL_ERROR: 'server',
  SYSTEM_SERVICE_UNAVAILABLE: 'server',
  INTERNAL_ERROR: 'server',
  SERVICE_UNAVAILABLE: 'server',
  AI_GENERATION_FAILED: 'server',
  NOT_FOUND: 'server',
  CONFLICT: 'server',
};

export const retryableErrorCodes: readonly string[] = [
  'RATE_LIMIT_EXCEEDED',
  'SERVICE_UNAVAILABLE',
  'AI_GENERATION_FAILED',
];
