import { sql } from 'drizzle-orm';
import { boolean, index, pgSchema, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { playerProfiles } from '../social/player-profiles.js';

const multiplayerSchema = pgSchema('multiplayer');

const coopSession = multiplayerSchema.table('coop_session', {
  sessionId: uuid('session_id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
});

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

export const coopDecisionProposal = multiplayerSchema.table(
  'coop_decision_proposal',
  {
    proposalId: uuid('proposal_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => coopSession.sessionId, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'restrict' }),
    role: varchar('role', { length: 20 }).notNull(),
    emailId: uuid('email_id').notNull(),
    action: varchar('action', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('proposed'),
    authorityAction: varchar('authority_action', { length: 20 }),
    conflictFlag: boolean('conflict_flag').notNull().default(false),
    conflictReason: varchar('conflict_reason', { length: 40 }),
    rationale: text('rationale'),
    expiredAt: timestamp('expired_at', { withTimezone: true, mode: 'date' }),
    proposedAt: timestamp('proposed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    sessionIdx: index('coop_decision_proposal_session_idx').on(table.sessionId),
    playerIdx: index('coop_decision_proposal_player_idx').on(table.playerId),
    sessionEmailIdx: index('coop_decision_proposal_session_email_idx').on(
      table.sessionId,
      table.emailId,
    ),
  }),
);

export type CoopDecisionProposal = typeof coopDecisionProposal.$inferSelect;
export type NewCoopDecisionProposal = typeof coopDecisionProposal.$inferInsert;
