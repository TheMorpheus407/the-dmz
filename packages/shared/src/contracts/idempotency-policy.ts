import { z } from 'zod';

export const IdempotencyOutcome = {
  MISS: 'miss',
  REPLAY: 'replay',
  CONFLICT: 'conflict',
  IN_PROGRESS: 'in_progress',
} as const;

export type IdempotencyOutcome = (typeof IdempotencyOutcome)[keyof typeof IdempotencyOutcome];

export const idempotencyOutcomeSchema = z.enum([
  IdempotencyOutcome.MISS,
  IdempotencyOutcome.REPLAY,
  IdempotencyOutcome.CONFLICT,
  IdempotencyOutcome.IN_PROGRESS,
]);

export const IDEMPOTENCY_KEY_FORMAT = {
  minLength: 16,
  maxLength: 64,
  charsetPattern: /^[a-zA-Z0-9_-]+$/,
} as const;

export const idempotencyKeyFormatSchema = z.object({
  minLength: z.number().int().positive(),
  maxLength: z.number().int().positive(),
  charsetPattern: z.string(),
});

export const idempotencyKeyConstraintsSchema = z.object({
  minLength: z.number().int().min(IDEMPOTENCY_KEY_FORMAT.minLength).max(128),
  maxLength: z.number().int().min(IDEMPOTENCY_KEY_FORMAT.minLength).max(128),
  ttlSeconds: z.number().int().positive().default(86400),
});

export type IdempotencyKeyConstraints = z.infer<typeof idempotencyKeyConstraintsSchema>;

export const idempotencyRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  route: z.string(),
  operation: z.string(),
  keyHash: z.string(),
  keyValue: z.string(),
  fingerprint: z.string(),
  status: idempotencyOutcomeSchema,
  responseBody: z.unknown().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type IdempotencyRecord = z.infer<typeof idempotencyRecordSchema>;

export const idempotencyReplayResponseSchema = z.object({
  replay: z.boolean(),
  outcome: idempotencyOutcomeSchema,
  originalTimestamp: z.string().datetime(),
});

export type IdempotencyReplayResponse = z.infer<typeof idempotencyReplayResponseSchema>;

export const idempotencyErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.object({
    outcome: idempotencyOutcomeSchema,
    conflictingFingerprint: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }),
});

export type IdempotencyErrorResponse = z.infer<typeof idempotencyErrorResponseSchema>;

export const IDEMPOTENCY_ERROR_CODES = {
  IDEMPOTENCY_KEY_REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
  IDEMPOTENCY_KEY_INVALID_FORMAT: 'IDEMPOTENCY_KEY_INVALID_FORMAT',
  IDEMPOTENCY_KEY_CONFLICT: 'IDEMPOTENCY_KEY_CONFLICT',
  IDEMPOTENCY_KEY_EXPIRED: 'IDEMPOTENCY_KEY_EXPIRED',
  IDEMPOTENCY_IN_PROGRESS: 'IDEMPOTENCY_IN_PROGRESS',
} as const;

export type IdempotencyErrorCode =
  (typeof IDEMPOTENCY_ERROR_CODES)[keyof typeof IDEMPOTENCY_ERROR_CODES];

export const validateIdempotencyKey = (
  key: string,
): { valid: boolean; error?: IdempotencyErrorCode } => {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED };
  }

  if (
    key.length < IDEMPOTENCY_KEY_FORMAT.minLength ||
    key.length > IDEMPOTENCY_KEY_FORMAT.maxLength
  ) {
    return { valid: false, error: IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT };
  }

  if (!IDEMPOTENCY_KEY_FORMAT.charsetPattern.test(key)) {
    return { valid: false, error: IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT };
  }

  return { valid: true };
};

export const generateFingerprint = (operation: string, route: string, body: unknown): string => {
  const normalizedBody =
    body && typeof body === 'object' && body !== null
      ? JSON.stringify(body, Object.keys(body).sort())
      : '';

  const fingerprintInput = `${operation.toUpperCase()}:${route}:${normalizedBody}`;

  let hash = 0;
  for (let i = 0; i < fingerprintInput.length; i++) {
    const char = fingerprintInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
};
