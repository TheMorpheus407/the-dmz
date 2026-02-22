import { z } from 'zod';

import { ErrorCodes } from '../constants/error-codes.js';

export const gameSessionBootstrapSchema = z
  .object({
    schemaVersion: z.literal(1),
    tenantId: z.string().uuid(),
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    day: z.number().int().min(1).default(1),
    funds: z.number().int().min(0).default(1000),
    clientCount: z.number().int().min(0).default(5),
    threatLevel: z.enum(['low', 'medium', 'high']).default('low'),
    facilityLoadout: z
      .object({
        defenseLevel: z.number().int().min(1).max(10).default(1),
        serverLevel: z.number().int().min(1).max(10).default(1),
        networkLevel: z.number().int().min(1).max(10).default(1),
      })
      .default({ defenseLevel: 1, serverLevel: 1, networkLevel: 1 }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type GameSessionBootstrap = z.infer<typeof gameSessionBootstrapSchema>;

export const gameSessionErrorSchema = z
  .object({
    code: z.enum([
      ErrorCodes.GAME_NOT_FOUND,
      ErrorCodes.GAME_STATE_INVALID,
      ErrorCodes.AUTH_UNAUTHORIZED,
      ErrorCodes.TENANT_CONTEXT_MISSING,
    ]),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  })
  .strict();

export type GameSessionError = z.infer<typeof gameSessionErrorSchema>;

export const gameSessionBootstrapResponseSchema = z
  .object({
    data: gameSessionBootstrapSchema,
  })
  .strict();

export type GameSessionBootstrapResponse = z.infer<typeof gameSessionBootstrapResponseSchema>;
