import { z } from 'zod';

const serviceCheckSchema = z
  .object({
    ok: z.boolean(),
    message: z.string(),
  })
  .strict();

export const healthQuerySchema = z
  .object({
    probe: z.enum(['liveness', 'readiness']).optional(),
  })
  .strict();

export type HealthQuery = z.infer<typeof healthQuerySchema>;

export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readinessResponseSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    checks: z
      .object({
        database: serviceCheckSchema,
        redis: serviceCheckSchema,
      })
      .strict(),
  })
  .strict();

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
