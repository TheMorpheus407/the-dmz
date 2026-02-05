import { z } from "zod";

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
