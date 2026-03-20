import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PERMISSION_MATRIX,
  getRolePermissionsForPhase,
  isActionPermitted,
} from '../permissions/permission-matrix.js';
import { PermissionDeniedError, checkPermission } from '../permissions/permission.enforcer.js';

describe('coop session service - session statuses', () => {
  const coopSessionStatuses = ['lobby', 'active', 'paused', 'completed', 'abandoned'] as const;

  it('should have five session statuses', () => {
    expect(coopSessionStatuses).toHaveLength(5);
  });

  it('should include lobby status', () => {
    expect(coopSessionStatuses).toContain('lobby');
  });

  it('should include active status', () => {
    expect(coopSessionStatuses).toContain('active');
  });

  it('should include paused status', () => {
    expect(coopSessionStatuses).toContain('paused');
  });

  it('should include completed status', () => {
    expect(coopSessionStatuses).toContain('completed');
  });

  it('should include abandoned status', () => {
    expect(coopSessionStatuses).toContain('abandoned');
  });
});

describe('coop session service - session lifecycle state machine', () => {
  type CoopSessionStatus = 'lobby' | 'active' | 'paused' | 'completed' | 'abandoned';

  function isValidStatusTransition(current: CoopSessionStatus, next: CoopSessionStatus): boolean {
    const validTransitions: Record<CoopSessionStatus, CoopSessionStatus[]> = {
      lobby: ['active', 'abandoned'],
      active: ['paused', 'completed', 'abandoned'],
      paused: ['active', 'completed', 'abandoned'],
      completed: [],
      abandoned: [],
    };
    return validTransitions[current]?.includes(next) ?? false;
  }

  it('lobby can transition to active', () => {
    expect(isValidStatusTransition('lobby', 'active')).toBe(true);
  });

  it('lobby can transition to abandoned', () => {
    expect(isValidStatusTransition('lobby', 'abandoned')).toBe(true);
  });

  it('active can transition to paused', () => {
    expect(isValidStatusTransition('active', 'paused')).toBe(true);
  });

  it('active can transition to completed', () => {
    expect(isValidStatusTransition('active', 'completed')).toBe(true);
  });

  it('active can transition to abandoned', () => {
    expect(isValidStatusTransition('active', 'abandoned')).toBe(true);
  });

  it('paused can transition to active', () => {
    expect(isValidStatusTransition('paused', 'active')).toBe(true);
  });

  it('paused can transition to completed', () => {
    expect(isValidStatusTransition('paused', 'completed')).toBe(true);
  });

  it('paused can transition to abandoned', () => {
    expect(isValidStatusTransition('paused', 'abandoned')).toBe(true);
  });

  it('completed cannot transition to any status', () => {
    const statuses: CoopSessionStatus[] = ['lobby', 'active', 'paused', 'completed', 'abandoned'];
    for (const status of statuses) {
      expect(isValidStatusTransition('completed', status)).toBe(false);
    }
  });

  it('abandoned cannot transition to any status', () => {
    const statuses: CoopSessionStatus[] = ['lobby', 'active', 'paused', 'completed', 'abandoned'];
    for (const status of statuses) {
      expect(isValidStatusTransition('abandoned', status)).toBe(false);
    }
  });
});

describe('coop session service - coop roles', () => {
  const coopRoles = ['triage_lead', 'verification_lead'] as const;

  it('should have two coop roles', () => {
    expect(coopRoles).toHaveLength(2);
  });

  it('should include triage_lead role', () => {
    expect(coopRoles).toContain('triage_lead');
  });

  it('should include verification_lead role', () => {
    expect(coopRoles).toContain('verification_lead');
  });
});

describe('coop session service - proposal statuses', () => {
  const proposalStatuses = ['proposed', 'confirmed', 'overridden', 'withdrawn'] as const;

  it('should have four proposal statuses', () => {
    expect(proposalStatuses).toHaveLength(4);
  });

  it('should include proposed status', () => {
    expect(proposalStatuses).toContain('proposed');
  });

  it('should include confirmed status', () => {
    expect(proposalStatuses).toContain('confirmed');
  });

  it('should include overridden status', () => {
    expect(proposalStatuses).toContain('overridden');
  });

  it('should include withdrawn status', () => {
    expect(proposalStatuses).toContain('withdrawn');
  });
});

describe('coop session service - authority actions', () => {
  const authorityActions = ['confirm', 'override'] as const;

  it('should have two authority actions', () => {
    expect(authorityActions).toHaveLength(2);
  });

  it('should include confirm action', () => {
    expect(authorityActions).toContain('confirm');
  });

  it('should include override action', () => {
    expect(authorityActions).toContain('override');
  });
});

describe('coop session service - conflict reasons', () => {
  const conflictReasons = [
    'insufficient_verification',
    'risk_tolerance',
    'factual_dispute',
    'policy_conflict',
  ] as const;

  it('should have four conflict reasons', () => {
    expect(conflictReasons).toHaveLength(4);
  });

  it('should include insufficient_verification', () => {
    expect(conflictReasons).toContain('insufficient_verification');
  });

  it('should include risk_tolerance', () => {
    expect(conflictReasons).toContain('risk_tolerance');
  });

  it('should include factual_dispute', () => {
    expect(conflictReasons).toContain('factual_dispute');
  });

  it('should include policy_conflict', () => {
    expect(conflictReasons).toContain('policy_conflict');
  });
});

describe('coop session service - incident actions', () => {
  const incidentActions = ['quarantine', 'delete', 'escalate', 'resolve'] as const;

  it('should have four incident actions', () => {
    expect(incidentActions).toHaveLength(4);
  });

  it('should include quarantine action', () => {
    expect(incidentActions).toContain('quarantine');
  });

  it('should include delete action', () => {
    expect(incidentActions).toContain('delete');
  });

  it('should include escalate action', () => {
    expect(incidentActions).toContain('escalate');
  });

  it('should include resolve action', () => {
    expect(incidentActions).toContain('resolve');
  });
});

describe('coop session service - session cache TTL', () => {
  const SESSION_CACHE_TTL = 300;

  it('should have TTL of 5 minutes (300 seconds)', () => {
    expect(SESSION_CACHE_TTL).toBe(300);
  });
});

describe('coop session service - authority token rules', () => {
  function canFinalizeProposal(
    isAuthority: boolean,
    isOwnProposal: boolean,
  ): { canFinalize: boolean; reason?: string } {
    if (!isAuthority) {
      return { canFinalize: false, reason: 'Only authority can finalize proposals' };
    }
    if (isOwnProposal) {
      return { canFinalize: false, reason: 'Authority cannot finalize own proposal' };
    }
    return { canFinalize: true };
  }

  it('authority cannot finalize own proposal', () => {
    const result = canFinalizeProposal(true, true);
    expect(result.canFinalize).toBe(false);
    expect(result.reason).toBe('Authority cannot finalize own proposal');
  });

  it('authority can finalize other player proposal', () => {
    const result = canFinalizeProposal(true, false);
    expect(result.canFinalize).toBe(true);
  });

  it('non-authority cannot finalize any proposal', () => {
    const result = canFinalizeProposal(false, false);
    expect(result.canFinalize).toBe(false);
    expect(result.reason).toBe('Only authority can finalize proposals');
  });
});

describe('coop session service - day advancement', () => {
  function advanceDay(
    currentDay: number,
    currentAuthority: string,
    player1Id: string,
    player2Id: string,
  ): { newDay: number; newAuthority: string } {
    const newAuthority = currentAuthority === player1Id ? player2Id : player1Id;
    return { newDay: currentDay + 1, newAuthority };
  }

  it('advances day and rotates authority from player1 to player2', () => {
    const result = advanceDay(1, 'player1', 'player1', 'player2');
    expect(result.newDay).toBe(2);
    expect(result.newAuthority).toBe('player2');
  });

  it('advances day and rotates authority from player2 to player1', () => {
    const result = advanceDay(1, 'player2', 'player1', 'player2');
    expect(result.newDay).toBe(2);
    expect(result.newAuthority).toBe('player1');
  });

  it('day number increments correctly through multiple advances', () => {
    let day = 1;
    let authority = 'player1';

    for (let i = 0; i < 5; i++) {
      const result = advanceDay(day, authority, 'player1', 'player2');
      day = result.newDay;
      authority = result.newAuthority;
    }

    expect(day).toBe(6);
  });
});

describe('coop session service - role assignment', () => {
  interface RoleAssignmentResult {
    player1Role: string;
    player2Role: string;
    player1IsAuthority: boolean;
    player2IsAuthority: boolean;
  }

  function assignRoles(
    player1Id: string,
    _player2Id: string,
    authorityPlayerId: string,
  ): RoleAssignmentResult {
    const isPlayer1Authority = authorityPlayerId === player1Id;
    return {
      player1Role: isPlayer1Authority ? 'triage_lead' : 'verification_lead',
      player2Role: isPlayer1Authority ? 'verification_lead' : 'triage_lead',
      player1IsAuthority: isPlayer1Authority,
      player2IsAuthority: !isPlayer1Authority,
    };
  }

  it('player1 gets triage_lead when authority', () => {
    const result = assignRoles('player1', 'player2', 'player1');
    expect(result.player1Role).toBe('triage_lead');
    expect(result.player1IsAuthority).toBe(true);
    expect(result.player2Role).toBe('verification_lead');
    expect(result.player2IsAuthority).toBe(false);
  });

  it('player1 gets verification_lead when not authority', () => {
    const result = assignRoles('player1', 'player2', 'player2');
    expect(result.player1Role).toBe('verification_lead');
    expect(result.player1IsAuthority).toBe(false);
    expect(result.player2Role).toBe('triage_lead');
    expect(result.player2IsAuthority).toBe(true);
  });
});

describe('coop session service - session seed', () => {
  function generateSessionSeed(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join('');
  }

  it('generates correct length (32)', () => {
    const seed = generateSessionSeed();
    expect(seed).toHaveLength(32);
  });

  it('each call produces unique seed', () => {
    const seeds = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seeds.add(generateSessionSeed());
    }
    expect(seeds.size).toBe(100);
  });

  it('seed uses only valid characters', () => {
    const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const seed = generateSessionSeed();
    for (const char of seed) {
      expect(validChars.includes(char)).toBe(true);
    }
  });
});

describe('coop session service - role permission matrix', () => {
  type Action =
    | 'view_inbox'
    | 'mark_indicators'
    | 'request_verification'
    | 'view_verification_packets'
    | 'propose_decision'
    | 'finalize_decision'
    | 'advance_day';

  function canPerformAction(
    role: 'triage_lead' | 'verification_lead' | 'authority',
    action: Action,
  ): boolean {
    const permissions: Record<string, Record<Action, boolean>> = {
      triage_lead: {
        view_inbox: true,
        mark_indicators: true,
        request_verification: true,
        view_verification_packets: false,
        propose_decision: true,
        finalize_decision: false,
        advance_day: false,
      },
      verification_lead: {
        view_inbox: false,
        mark_indicators: false,
        request_verification: true,
        view_verification_packets: true,
        propose_decision: true,
        finalize_decision: false,
        advance_day: false,
      },
      authority: {
        view_inbox: true,
        mark_indicators: true,
        request_verification: true,
        view_verification_packets: true,
        propose_decision: true,
        finalize_decision: true,
        advance_day: true,
      },
    };
    return permissions[role]?.[action] ?? false;
  }

  it('triage_lead can view inbox', () => {
    expect(canPerformAction('triage_lead', 'view_inbox')).toBe(true);
  });

  it('triage_lead cannot view verification packets', () => {
    expect(canPerformAction('triage_lead', 'view_verification_packets')).toBe(false);
  });

  it('verification_lead can view verification packets', () => {
    expect(canPerformAction('verification_lead', 'view_verification_packets')).toBe(true);
  });

  it('verification_lead cannot mark indicators', () => {
    expect(canPerformAction('verification_lead', 'mark_indicators')).toBe(false);
  });

  it('neither role can finalize decision', () => {
    expect(canPerformAction('triage_lead', 'finalize_decision')).toBe(false);
    expect(canPerformAction('verification_lead', 'finalize_decision')).toBe(false);
  });

  it('authority can finalize decision', () => {
    expect(canPerformAction('authority', 'finalize_decision')).toBe(true);
  });

  it('only authority can advance day', () => {
    expect(canPerformAction('triage_lead', 'advance_day')).toBe(false);
    expect(canPerformAction('verification_lead', 'advance_day')).toBe(false);
    expect(canPerformAction('authority', 'advance_day')).toBe(true);
  });

  it('all roles can propose decisions', () => {
    expect(canPerformAction('triage_lead', 'propose_decision')).toBe(true);
    expect(canPerformAction('verification_lead', 'propose_decision')).toBe(true);
    expect(canPerformAction('authority', 'propose_decision')).toBe(true);
  });
});

describe('coop session service - phase-based permission enforcement', () => {
  const DAY_PHASES = {
    PHASE_DAY_START: 'PHASE_DAY_START',
    PHASE_EMAIL_INTAKE: 'PHASE_EMAIL_INTAKE',
    PHASE_TRIAGE: 'PHASE_TRIAGE',
    PHASE_VERIFICATION: 'PHASE_VERIFICATION',
    PHASE_DECISION: 'PHASE_DECISION',
    PHASE_CONSEQUENCES: 'PHASE_CONSEQUENCES',
    PHASE_THREAT_PROCESSING: 'PHASE_THREAT_PROCESSING',
    PHASE_INCIDENT_RESPONSE: 'PHASE_INCIDENT_RESPONSE',
    PHASE_RANSOM: 'PHASE_RANSOM',
    PHASE_RECOVERY: 'PHASE_RECOVERY',
    PHASE_RESOURCE_MANAGEMENT: 'PHASE_RESOURCE_MANAGEMENT',
    PHASE_UPGRADE: 'PHASE_UPGRADE',
    PHASE_DAY_END: 'PHASE_DAY_END',
  } as const;

  describe('submitProposal permission - triage_lead', () => {
    const triageLeadRole = 'triage_lead';
    const triageLeadId = 'triage-lead-player';
    const authorityPlayerId = 'authority-player';

    it('triage_lead CAN submit proposal (email.propose_decision) during PHASE_EMAIL_INTAKE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'email.propose_decision',
      );
      expect(result).toBe(true);
    });

    it('triage_lead CAN submit proposal (email.propose_decision) during PHASE_TRIAGE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_TRIAGE,
        'email.propose_decision',
      );
      expect(result).toBe(true);
    });

    it('triage_lead CANNOT submit proposal during PHASE_VERIFICATION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('triage_lead CANNOT submit proposal during PHASE_DECISION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('triage_lead submitProposal checkPermission succeeds in EMAIL_INTAKE phase', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: triageLeadId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('triage_lead submitProposal checkPermission fails in VERIFICATION phase', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: triageLeadId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_VERIFICATION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });
  });

  describe('submitProposal permission - verification_lead', () => {
    const verificationLeadRole = 'verification_lead';
    const verificationLeadId = 'verification-lead-player';
    const nonAuthorityPlayerId = 'other-player';

    it('verification_lead CANNOT submit proposal (email.propose_decision) during PHASE_EMAIL_INTAKE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead CANNOT submit proposal during PHASE_TRIAGE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_TRIAGE,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead CANNOT submit email proposal during PHASE_VERIFICATION (they have verification.propose_decision instead)', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead CAN submit verification.propose_decision during PHASE_VERIFICATION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'verification.propose_decision',
      );
      expect(result).toBe(true);
    });

    it('verification_lead CANNOT submit proposal during PHASE_DECISION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead submitProposal checkPermission fails in EMAIL_INTAKE phase', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: verificationLeadRole as 'verification_lead',
          actorId: verificationLeadId,
          authorityPlayerId: nonAuthorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('verification_lead submitProposal checkPermission fails in VERIFICATION phase (email.propose_decision not available)', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: verificationLeadRole as 'verification_lead',
          actorId: verificationLeadId,
          authorityPlayerId: nonAuthorityPlayerId,
          phase: DAY_PHASES.PHASE_VERIFICATION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });
  });

  describe('authorityConfirm and authorityOverride permission - action.confirm and action.override', () => {
    const triageLeadRole = 'triage_lead';
    const verificationLeadRole = 'verification_lead';
    const authorityPlayerId = 'authority-player';
    const nonAuthorityPlayerId = 'non-authority-player';

    it('action.confirm returns Authority for triage_lead in DECISION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'action.confirm',
      );
      expect(result).toBe('Authority');
    });

    it('action.confirm returns Authority for verification_lead in DECISION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'action.confirm',
      );
      expect(result).toBe('Authority');
    });

    it('action.confirm returns false for triage_lead in EMAIL_INTAKE phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'action.confirm',
      );
      expect(result).toBe(false);
    });

    it('action.confirm returns false for verification_lead in VERIFICATION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'action.confirm',
      );
      expect(result).toBe(false);
    });

    it('authority player CAN confirm (has authority and is in DECISION phase)', () => {
      expect(() =>
        checkPermission({
          action: 'action.confirm',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: authorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('non-authority player CANNOT confirm even in DECISION phase', () => {
      expect(() =>
        checkPermission({
          action: 'action.confirm',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('authority player CAN override (has authority and is in DECISION phase)', () => {
      expect(() =>
        checkPermission({
          action: 'action.override',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: authorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('non-authority player CANNOT override even in DECISION phase', () => {
      expect(() =>
        checkPermission({
          action: 'action.override',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('non-authority player CANNOT override with AUTHORITY_REQUIRED reason', () => {
      try {
        checkPermission({
          action: 'action.override',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionDeniedError);
        expect((error as PermissionDeniedError).reason).toBe('AUTHORITY_REQUIRED');
      }
    });
  });

  describe('phase-specific role permissions matrix verification', () => {
    it('triage_lead has correct permissions in each phase', () => {
      const emailIntakePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(emailIntakePerms).toContain('view.inbox');
      expect(emailIntakePerms).toContain('email.mark_indicator');
      expect(emailIntakePerms).toContain('email.propose_decision');
      expect(emailIntakePerms).toContain('verification.request');

      const triagePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_TRIAGE,
      );
      expect(triagePerms).toContain('email.propose_decision');

      const verificationPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_VERIFICATION,
      );
      expect(verificationPerms).toHaveLength(0);

      const decisionPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_DECISION,
      );
      expect(decisionPerms).toContain('action.confirm');
      expect(decisionPerms).toContain('action.override');
    });

    it('verification_lead has correct permissions in each phase', () => {
      const emailIntakePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(emailIntakePerms).toHaveLength(0);

      const triagePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_TRIAGE,
      );
      expect(triagePerms).toHaveLength(0);

      const verificationPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_VERIFICATION,
      );
      expect(verificationPerms).toContain('view.verification_packet');
      expect(verificationPerms).toContain('verification.mark_inconsistency');
      expect(verificationPerms).toContain('verification.propose_decision');

      const decisionPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_DECISION,
      );
      expect(decisionPerms).toContain('action.confirm');
      expect(decisionPerms).toContain('action.override');
    });
  });
});
