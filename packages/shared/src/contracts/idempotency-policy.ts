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
  requiredForMethods: z.array(z.enum(['POST', 'PUT', 'PATCH'])).default(['POST']),
  ttlSeconds: z.number().int().positive().default(86400),
});

export type IdempotencyKeyConstraints = z.infer<typeof idempotencyKeyConstraintsSchema>;

export const idempotencyRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  route: z.string(),
  method: z.string(),
  keyHash: z.string(),
  keyValue: z.string(),
  fingerprint: z.string(),
  status: idempotencyOutcomeSchema,
  responseStatus: z.number().int(),
  responseBody: z.unknown().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type IdempotencyRecord = z.infer<typeof idempotencyRecordSchema>;

export const idempotencyReplayResponseSchema = z.object({
  replay: z.boolean(),
  outcome: idempotencyOutcomeSchema,
  originalTimestamp: z.string().datetime(),
  originalStatus: z.number().int(),
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

export const idempotencyPolicyManifestSchema = z.object({
  version: z.string(),
  keyConstraints: idempotencyKeyConstraintsSchema,
  headerContract: z.object({
    idempotencyKeyHeader: z.string().default('Idempotency-Key'),
    replayHeader: z.string().default('X-Idempotency-Replay'),
    outcomeHeader: z.string().default('X-Idempotency-Outcome'),
  }),
  outcomes: z.object({
    miss: z.object({
      description: z.string(),
      responseStatus: z.number().int(),
    }),
    replay: z.object({
      description: z.string(),
      responseStatus: z.number().int(),
    }),
    conflict: z.object({
      description: z.string(),
      responseStatus: z.number().int(),
    }),
    inProgress: z.object({
      description: z.string(),
      responseStatus: z.number().int(),
    }),
  }),
  errorCodes: z.record(
    z.string(),
    z.object({
      category: z.string(),
      retryable: z.boolean(),
      messageKey: z.string(),
      httpStatus: z.number().int(),
    }),
  ),
});

export type IdempotencyPolicyManifest = z.infer<typeof idempotencyPolicyManifestSchema>;

export type M1IdempotencyPolicyManifest = IdempotencyPolicyManifest;

export const m1IdempotencyPolicyManifest: M1IdempotencyPolicyManifest = {
  version: '1.0.0',
  keyConstraints: {
    minLength: 16,
    maxLength: 64,
    requiredForMethods: ['POST', 'PUT', 'PATCH'],
    ttlSeconds: 86400,
  },
  headerContract: {
    idempotencyKeyHeader: 'Idempotency-Key',
    replayHeader: 'X-Idempotency-Replay',
    outcomeHeader: 'X-Idempotency-Outcome',
  },
  outcomes: {
    miss: {
      description: 'First request with this idempotency key - execute normally',
      responseStatus: 200,
    },
    replay: {
      description: 'Retry with same key and equivalent payload - return cached response',
      responseStatus: 200,
    },
    conflict: {
      description: 'Same key but different payload - reject with conflict',
      responseStatus: 409,
    },
    inProgress: {
      description: 'Concurrent request with same key - return in-progress status',
      responseStatus: 409,
    },
  },
  errorCodes: {
    [IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED]: {
      category: 'validation',
      retryable: false,
      messageKey: 'errors.idempotency.keyRequired',
      httpStatus: 400,
    },
    [IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT]: {
      category: 'validation',
      retryable: false,
      messageKey: 'errors.idempotency.keyInvalidFormat',
      httpStatus: 400,
    },
    [IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_CONFLICT]: {
      category: 'server',
      retryable: false,
      messageKey: 'errors.idempotency.keyConflict',
      httpStatus: 409,
    },
    [IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_EXPIRED]: {
      category: 'validation',
      retryable: false,
      messageKey: 'errors.idempotency.keyExpired',
      httpStatus: 400,
    },
    [IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS]: {
      category: 'server',
      retryable: true,
      messageKey: 'errors.idempotency.inProgress',
      httpStatus: 409,
    },
  },
};

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

export const generateFingerprint = (method: string, route: string, body: unknown): string => {
  const normalizedBody =
    body && typeof body === 'object' && body !== null
      ? JSON.stringify(body, Object.keys(body).sort())
      : '';

  const fingerprintInput = `${method.toUpperCase()}:${route}:${normalizedBody}`;

  let hash = 0;
  for (let i = 0; i < fingerprintInput.length; i++) {
    const char = fingerprintInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
};

export const isIdempotencyRequiredForMethod = (method: string): boolean => {
  return m1IdempotencyPolicyManifest.keyConstraints.requiredForMethods
    .map((m) => m.toUpperCase())
    .includes(method.toUpperCase());
};
