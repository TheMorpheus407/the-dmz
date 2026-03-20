import type { CoopRole } from '@the-dmz/shared/game';

export type RolePreference = 'triage_lead' | 'verification_lead' | 'no_preference';

export interface PlayerRolePreference {
  playerId: string;
  preference: RolePreference;
  submittedAt: Date;
}

export interface RoleAssignmentResult {
  player1Id: string;
  player1Role: CoopRole;
  player1IsAuthority: boolean;
  player2Id: string;
  player2Role: CoopRole;
  player2IsAuthority: boolean;
}

export interface RolePreferenceMatchResult {
  success: boolean;
  assignments: RoleAssignmentResult;
  preferenceMatched: boolean;
  error?: string;
}

export function resolveRolePreferences(
  player1Id: string,
  player1Preference: RolePreference,
  player2Id: string,
  player2Preference: RolePreference,
  partyLeaderId: string,
): RoleAssignmentResult {
  const bothNoPreference =
    player1Preference === 'no_preference' && player2Preference === 'no_preference';
  const samePreference =
    player1Preference === player2Preference && player1Preference !== 'no_preference';

  if (bothNoPreference || samePreference) {
    return assignDefaultRoles(player1Id, player2Id, partyLeaderId);
  }

  if (player1Preference === 'triage_lead' && player2Preference === 'verification_lead') {
    return {
      player1Id,
      player1Role: 'triage_lead',
      player1IsAuthority: partyLeaderId === player1Id,
      player2Id,
      player2Role: 'verification_lead',
      player2IsAuthority: partyLeaderId === player2Id,
    };
  }

  if (player1Preference === 'verification_lead' && player2Preference === 'triage_lead') {
    return {
      player1Id,
      player1Role: 'verification_lead',
      player1IsAuthority: partyLeaderId === player1Id,
      player2Id,
      player2Role: 'triage_lead',
      player2IsAuthority: partyLeaderId === player2Id,
    };
  }

  if (player1Preference === 'no_preference') {
    return assignWithPlayer1Fallback(player1Id, player2Id, player2Preference, partyLeaderId);
  }

  if (player2Preference === 'no_preference') {
    return assignWithPlayer2Fallback(player1Id, player1Preference, player2Id, partyLeaderId);
  }

  return assignDefaultRoles(player1Id, player2Id, partyLeaderId);
}

function assignDefaultRoles(
  player1Id: string,
  player2Id: string,
  partyLeaderId: string,
): RoleAssignmentResult {
  const isPlayer1Leader = partyLeaderId === player1Id;

  return {
    player1Id,
    player1Role: isPlayer1Leader ? 'triage_lead' : 'verification_lead',
    player1IsAuthority: isPlayer1Leader,
    player2Id,
    player2Role: isPlayer1Leader ? 'verification_lead' : 'triage_lead',
    player2IsAuthority: !isPlayer1Leader,
  };
}

function assignWithPlayer1Fallback(
  player1Id: string,
  player2Id: string,
  player2Preference: RolePreference,
  partyLeaderId: string,
): RoleAssignmentResult {
  const isPlayer1Leader = partyLeaderId === player1Id;

  if (player2Preference === 'triage_lead') {
    return {
      player1Id,
      player1Role: 'verification_lead',
      player1IsAuthority: isPlayer1Leader && partyLeaderId === player1Id,
      player2Id,
      player2Role: 'triage_lead',
      player2IsAuthority: partyLeaderId === player2Id || !isPlayer1Leader,
    };
  }

  return {
    player1Id,
    player1Role: 'triage_lead',
    player1IsAuthority: partyLeaderId === player1Id,
    player2Id,
    player2Role: 'verification_lead',
    player2IsAuthority: partyLeaderId === player2Id,
  };
}

function assignWithPlayer2Fallback(
  player1Id: string,
  player1Preference: RolePreference,
  player2Id: string,
  partyLeaderId: string,
): RoleAssignmentResult {
  const isPlayer1Leader = partyLeaderId === player1Id;

  if (player1Preference === 'verification_lead') {
    return {
      player1Id,
      player1Role: 'verification_lead',
      player1IsAuthority: partyLeaderId === player1Id,
      player2Id,
      player2Role: 'triage_lead',
      player2IsAuthority: partyLeaderId === player2Id || !isPlayer1Leader,
    };
  }

  return {
    player1Id,
    player1Role: 'triage_lead',
    player1IsAuthority: partyLeaderId === player1Id,
    player2Id,
    player2Role: 'verification_lead',
    player2IsAuthority: partyLeaderId === player2Id,
  };
}

export function calculatePreferenceMatchScore(
  assignments: RoleAssignmentResult,
  player1Preference: RolePreference,
  player2Preference: RolePreference,
): number {
  let score = 0;

  if (player1Preference === 'no_preference' && player2Preference === 'no_preference') {
    return 2;
  }

  if (player1Preference === assignments.player1Role) {
    score += 1;
  }
  if (player2Preference === assignments.player2Role) {
    score += 1;
  }

  return score;
}

export function validateRolePreference(preference: unknown): preference is RolePreference {
  if (typeof preference !== 'string') {
    return false;
  }
  return (
    preference === 'triage_lead' ||
    preference === 'verification_lead' ||
    preference === 'no_preference'
  );
}

export function createRolePreference(
  playerId: string,
  preference: RolePreference,
): PlayerRolePreference {
  return {
    playerId,
    preference,
    submittedAt: new Date(),
  };
}
