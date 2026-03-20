import { z } from 'zod';

export const coopRoles = ['triage_lead', 'verification_lead'] as const;
export type CoopRole = (typeof coopRoles)[number];

export const coopSessionStatuses = ['lobby', 'active', 'paused', 'completed', 'abandoned'] as const;
export type CoopSessionStatus = (typeof coopSessionStatuses)[number];

export const proposalStatuses = [
  'proposed',
  'confirmed',
  'overridden',
  'withdrawn',
  'expired',
  'consensus',
] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];

export const authorityActions = ['confirm', 'override'] as const;
export type AuthorityAction = (typeof authorityActions)[number];

export const conflictReasons = [
  'insufficient_verification',
  'risk_tolerance',
  'factual_dispute',
  'policy_conflict',
] as const;
export type ConflictReason = (typeof conflictReasons)[number];

export const coopSessionBootstrapSchema = z
  .object({
    schemaVersion: z.literal(1),
    sessionId: z.string().uuid(),
    partyId: z.string().uuid(),
    tenantId: z.string().uuid(),
    authorityPlayerId: z.string().uuid().nullable(),
    status: z.enum(coopSessionStatuses),
    dayNumber: z.number().int().min(1).default(1),
    seed: z.string().length(32),
    createdAt: z.string().datetime(),
    roles: z
      .array(
        z.object({
          playerId: z.string().uuid(),
          role: z.enum(coopRoles),
          isAuthority: z.boolean(),
        }),
      )
      .default([]),
  })
  .strict();

export type CoopSessionBootstrap = z.infer<typeof coopSessionBootstrapSchema>;

export const coopProposalActionSchema = z.enum(['approve', 'deny', 'flag', 'request_verification']);
export type CoopProposalAction = z.infer<typeof coopProposalActionSchema>;

export const coopDecisionProposalSchema = z
  .object({
    proposalId: z.string().uuid(),
    sessionId: z.string().uuid(),
    playerId: z.string().uuid(),
    role: z.enum(coopRoles),
    emailId: z.string().uuid(),
    action: coopProposalActionSchema,
    status: z.enum(proposalStatuses).default('proposed'),
    authorityAction: z.enum(authorityActions).nullable(),
    conflictFlag: z.boolean().default(false),
    conflictReason: z.enum(conflictReasons).nullable(),
    rationale: z.string().min(10).max(500).nullable(),
    proposedAt: z.string().datetime(),
    resolvedAt: z.string().datetime().nullable(),
  })
  .strict();

export type CoopDecisionProposal = z.infer<typeof coopDecisionProposalSchema>;

export const coopSessionBootstrapResponseSchema = z
  .object({
    data: coopSessionBootstrapSchema,
  })
  .strict();

export type CoopSessionBootstrapResponse = z.infer<typeof coopSessionBootstrapResponseSchema>;

export const coopDecisionProposalResponseSchema = z
  .object({
    data: coopDecisionProposalSchema,
  })
  .strict();

export type CoopDecisionProposalResponse = z.infer<typeof coopDecisionProposalResponseSchema>;
