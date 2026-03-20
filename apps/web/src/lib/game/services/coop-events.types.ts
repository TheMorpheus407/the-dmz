export const CoopSessionEvents = {
  SESSION_CREATED: 'coop.session.created',
  ROLE_ASSIGNED: 'coop.session.role_assigned',
  AUTHORITY_TRANSFERRED: 'coop.session.authority_transferred',
  PROPOSAL_SUBMITTED: 'coop.session.proposal_submitted',
  PROPOSAL_CONFIRMED: 'coop.session.proposal_confirmed',
  PROPOSAL_OVERRIDDEN: 'coop.session.proposal_overridden',
  DAY_ADVANCED: 'coop.session.day_advanced',
  SESSION_ENDED: 'coop.session.ended',
} as const;

export type CoopSessionEventType = (typeof CoopSessionEvents)[keyof typeof CoopSessionEvents];

export interface CoopSessionCreatedPayload {
  sessionId: string;
  partyId: string;
  authorityPlayerId: string;
  seed: string;
  dayNumber: number;
}

export interface CoopRoleAssignedPayload {
  sessionId: string;
  roles: Array<{
    playerId: string;
    role: string;
    isAuthority: boolean;
  }>;
}

export interface CoopAuthorityTransferredPayload {
  sessionId: string;
  previousAuthorityPlayerId: string;
  newAuthorityPlayerId: string;
  transferredBy: string;
}

export interface CoopProposalSubmittedPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  role: string;
  emailId: string;
  action: string;
}

export interface CoopProposalConfirmedPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  authorityPlayerId: string;
  action: string;
}

export interface CoopProposalOverriddenPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  authorityPlayerId: string;
  conflictReason?: string;
}

export interface CoopDayAdvancedPayload {
  sessionId: string;
  dayNumber: number;
  previousAuthorityPlayerId: string;
  newAuthorityPlayerId: string;
  advancedBy: string;
}

export interface CoopSessionEndedPayload {
  sessionId: string;
  partyId: string;
  endedBy: string;
  status: 'completed' | 'abandoned';
}

export type CoopSessionEventPayloads = {
  [CoopSessionEvents.SESSION_CREATED]: CoopSessionCreatedPayload;
  [CoopSessionEvents.ROLE_ASSIGNED]: CoopRoleAssignedPayload;
  [CoopSessionEvents.AUTHORITY_TRANSFERRED]: CoopAuthorityTransferredPayload;
  [CoopSessionEvents.PROPOSAL_SUBMITTED]: CoopProposalSubmittedPayload;
  [CoopSessionEvents.PROPOSAL_CONFIRMED]: CoopProposalConfirmedPayload;
  [CoopSessionEvents.PROPOSAL_OVERRIDDEN]: CoopProposalOverriddenPayload;
  [CoopSessionEvents.DAY_ADVANCED]: CoopDayAdvancedPayload;
  [CoopSessionEvents.SESSION_ENDED]: CoopSessionEndedPayload;
};
