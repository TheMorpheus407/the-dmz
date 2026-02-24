import { z } from 'zod';

const pwSchema = z.string().min(12).max(128);

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetRequestResponseSchema = z.object({
  success: z.boolean(),
});

export type PasswordResetRequestResponse = z.infer<typeof passwordResetRequestResponseSchema>;

export const passwordChangeRequestSchema = z.object({
  token: z.string().min(16).max(64),
  password: pwSchema,
});

export type PasswordChangeRequestInput = z.infer<typeof passwordChangeRequestSchema>;

export const passwordChangeRequestResponseSchema = z.object({
  success: z.boolean(),
  sessionsRevoked: z.number().optional(),
});

export type PasswordChangeRequestResponse = z.infer<typeof passwordChangeRequestResponseSchema>;
