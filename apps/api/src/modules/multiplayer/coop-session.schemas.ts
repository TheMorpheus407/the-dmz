import { z } from 'zod';

export const coopSessionStatusSchema = z.enum([
  'lobby',
  'active',
  'paused',
  'completed',
  'abandoned',
]);
export const coopRoleSchema = z.enum(['triage_lead', 'verification_lead']);
export const authorityActionSchema = z.enum(['confirm', 'override']);
export const conflictReasonSchema = z.enum([
  'insufficient_verification',
  'risk_tolerance',
  'factual_dispute',
  'policy_conflict',
]);

export const createCoopSessionSchema = z.object({
  partyId: z.string().uuid(),
  seed: z.string().length(32),
});

export const assignRolesSchema = z.object({
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
});

export const startCoopSessionSchema = z.object({
  scenarioId: z.string(),
  difficultyTier: z.enum(['training', 'standard', 'hardened', 'nightmare']),
});

export const rolePreferenceSchema = z.enum(['triage_lead', 'verification_lead', 'no_preference']);

export const submitRolePreferenceSchema = z.object({
  playerId: z.string().uuid(),
  preference: rolePreferenceSchema,
});

export const submitProposalSchema = z.object({
  playerId: z.string().uuid(),
  role: coopRoleSchema,
  emailId: z.string().uuid(),
  action: z.string(),
});

export const authorityActionInputSchema = z.object({
  proposalId: z.string().uuid(),
  action: authorityActionSchema,
  conflictReason: conflictReasonSchema.optional(),
});

export const coopRoleAssignmentResponseSchema = z.object({
  assignmentId: z.string().uuid(),
  playerId: z.string().uuid(),
  role: coopRoleSchema,
  isAuthority: z.boolean(),
  assignedAt: z.string().datetime(),
});

export const coopSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  partyId: z.string().uuid(),
  seed: z.string(),
  status: coopSessionStatusSchema,
  authorityPlayerId: z.string().uuid().nullable(),
  dayNumber: z.number(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  roles: z.array(coopRoleAssignmentResponseSchema),
});

export const coopSessionResultSchema = z.object({
  success: z.boolean(),
  session: coopSessionResponseSchema,
  error: z.string().optional(),
});

export const coopSessionWithScenarioSchema = coopSessionResponseSchema.extend({
  scenarioId: z.string().optional(),
  difficultyTier: z.string().optional(),
});
