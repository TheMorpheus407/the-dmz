import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(12).max(128),
    displayName: z.string().min(2).max(64),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const logoutResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .strict();

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

export const meResponseSchema = z
  .object({
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      displayName: z.string(),
      tenantId: z.string().uuid(),
      role: z.string(),
      isActive: z.boolean(),
    }),
  })
  .strict();

export type MeResponse = z.infer<typeof meResponseSchema>;

export const authenticatedHealthResponseSchema = z
  .object({
    status: z.string(),
    user: z.object({
      id: z.string(),
      tenantId: z.string(),
      role: z.string(),
    }),
  })
  .strict();

export type AuthenticatedHealthResponse = z.infer<typeof authenticatedHealthResponseSchema>;
