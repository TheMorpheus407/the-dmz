import { z } from 'zod';

export const createScormPackageSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.enum(['1.2', '2004_3rd', '2004_4th']),
  masteringScore: z.number().min(0).max(100).optional(),
  contentId: z.string().min(1),
});

export type CreateScormPackageInput = z.infer<typeof createScormPackageSchema>;

export const scormPackageResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  version: z.string(),
  objectKey: z.string(),
  checksumSha256: z.string().nullable(),
  masteringScore: z.number().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ScormPackageResponse = z.infer<typeof scormPackageResponseSchema>;

export const createRegistrationSchema = z.object({
  packageId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const updateRegistrationSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'failed']).optional(),
  score: z.number().min(0).max(100).optional(),
  suspendData: z.string().optional(),
  completionStatus: z.enum(['completed', 'incomplete', 'not attempted', 'unknown']).optional(),
  successStatus: z.enum(['passed', 'failed', 'unknown']).optional(),
  totalTime: z.number().int().min(0).optional(),
});

export const scormRegistrationResponseSchema = z.object({
  id: z.string().uuid(),
  packageId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  regId: z.string(),
  status: z.string(),
  score: z.number().nullable(),
  suspendData: z.string().nullable(),
  completionStatus: z.string().nullable(),
  successStatus: z.string().nullable(),
  totalTime: z.number(),
  lastLaunchedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ScormRegistrationResponse = z.infer<typeof scormRegistrationResponseSchema>;
