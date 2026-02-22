import { z } from 'zod';

const PASSWORD_KEY = 'password' as const;

export const userSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    tenantId: z.string().uuid(),
    role: z.string(),
    isActive: z.boolean(),
  })
  .strict();

export type UserData = z.infer<typeof userSchema>;

export const loginResponseSchema = z
  .object({
    user: userSchema,
    accessToken: z.string(),
  })
  .strict();

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const registerResponseSchema = loginResponseSchema;

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const refreshResponseSchema = z
  .object({
    accessToken: z.string(),
  })
  .strict();

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const loginSchema = z
  .object({
    email: z.string().email(),
    [PASSWORD_KEY]: z.string().min(8).max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email(),
    [PASSWORD_KEY]: z.string().min(12).max(128),
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

export const profileSchema = z
  .object({
    profileId: z.string().uuid(),
    tenantId: z.string().uuid(),
    userId: z.string().uuid(),
    locale: z.string().max(10),
    timezone: z.string().max(64),
    accessibilitySettings: z.record(z.unknown()),
    notificationSettings: z.record(z.unknown()),
  })
  .strict();

export type ProfileData = z.infer<typeof profileSchema>;

export const updateProfileSchema = z
  .object({
    locale: z.string().max(10).optional(),
    timezone: z.string().max(64).optional(),
    accessibilitySettings: z.record(z.unknown()).optional(),
    notificationSettings: z.record(z.unknown()).optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

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
    profile: profileSchema.optional(),
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
