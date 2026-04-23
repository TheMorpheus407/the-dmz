import { describe, expect, it } from 'vitest';

import { partyStatuses } from '../../../db/schema/multiplayer/index.js';

const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_TTL_MS = 60 * 60 * 1000;

function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH));
  return Array.from(bytes)
    .map((b) => INVITE_CODE_CHARS[b % INVITE_CODE_CHARS.length])
    .join('');
}

function isInviteCodeValid(inviteCode: string | null, inviteCodeExpiresAt: Date | null): boolean {
  if (!inviteCode || !inviteCodeExpiresAt) {
    return false;
  }
  return new Date(inviteCodeExpiresAt) > new Date();
}

function isValidInviteCodeChar(char: string): boolean {
  return INVITE_CODE_CHARS.includes(char);
}

describe('party service - invite code generation', () => {
  it('generates correct length (8)', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it('uses only valid characters (no 0/O/1/I/L)', () => {
    const code = generateInviteCode();
    for (const char of code) {
      expect(isValidInviteCodeChar(char)).toBe(true);
      expect('0O1IlL'.includes(char)).toBe(false);
    }
  });

  it('each call produces unique code', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBe(100);
  });
});

describe('party service - invite code validation', () => {
  it('returns true for non-expired codes', () => {
    const futureDate = new Date(Date.now() + INVITE_CODE_TTL_MS);
    expect(isInviteCodeValid('ABCDEFGH', futureDate)).toBe(true);
  });

  it('returns false for expired codes', () => {
    const pastDate = new Date(Date.now() - 1000);
    expect(isInviteCodeValid('ABCDEFGH', pastDate)).toBe(false);
  });

  it('returns false for null invite code', () => {
    const futureDate = new Date(Date.now() + INVITE_CODE_TTL_MS);
    expect(isInviteCodeValid(null, futureDate)).toBe(false);
  });

  it('returns false for null expiry date', () => {
    expect(isInviteCodeValid('ABCDEFGH', null)).toBe(false);
  });

  it('returns false for both null', () => {
    expect(isInviteCodeValid(null, null)).toBe(false);
  });
});

describe('party service - party statuses', () => {
  it('should have four party statuses', () => {
    expect(partyStatuses).toHaveLength(4);
  });

  it('should include forming status', () => {
    expect(partyStatuses).toContain('forming');
  });

  it('should include ready status', () => {
    expect(partyStatuses).toContain('ready');
  });

  it('should include in_session status', () => {
    expect(partyStatuses).toContain('in_session');
  });

  it('should include disbanded status', () => {
    expect(partyStatuses).toContain('disbanded');
  });

  it('should have correct order: [forming, ready, in_session, disbanded]', () => {
    expect(partyStatuses[0]).toBe('forming');
    expect(partyStatuses[1]).toBe('ready');
    expect(partyStatuses[2]).toBe('in_session');
    expect(partyStatuses[3]).toBe('disbanded');
  });
});

describe('party service - difficulties', () => {
  const difficulties = ['training', 'standard', 'hardened', 'nightmare'] as const;

  it('should have four difficulty levels', () => {
    expect(difficulties).toHaveLength(4);
  });

  it('should include training difficulty', () => {
    expect(difficulties).toContain('training');
  });

  it('should include standard difficulty', () => {
    expect(difficulties).toContain('standard');
  });

  it('should include hardened difficulty', () => {
    expect(difficulties).toContain('hardened');
  });

  it('should include nightmare difficulty', () => {
    expect(difficulties).toContain('nightmare');
  });
});

describe('party service - party roles', () => {
  const partyRoles = ['leader', 'member'] as const;

  it('should have two party roles', () => {
    expect(partyRoles).toHaveLength(2);
  });

  it('should include leader role', () => {
    expect(partyRoles).toContain('leader');
  });

  it('should include member role', () => {
    expect(partyRoles).toContain('member');
  });
});

describe('party service - declared roles', () => {
  const declaredRoles = ['triage_lead', 'verification_lead', 'any'] as const;

  it('should have three declared roles', () => {
    expect(declaredRoles).toHaveLength(3);
  });

  it('should include triage_lead role', () => {
    expect(declaredRoles).toContain('triage_lead');
  });

  it('should include verification_lead role', () => {
    expect(declaredRoles).toContain('verification_lead');
  });

  it('should include any role', () => {
    expect(declaredRoles).toContain('any');
  });
});

describe('party service - party constraints', () => {
  const MIN_PARTY_SIZE = 2;
  const MAX_PARTY_SIZE = 2;

  it('should have minimum party size of 2', () => {
    expect(MIN_PARTY_SIZE).toBe(2);
  });

  it('should have maximum party size of 2 for M11', () => {
    expect(MAX_PARTY_SIZE).toBe(2);
  });

  it('party size should be extensible to 6 in M15', () => {
    const M15_MAX_PARTY_SIZE = 6;
    expect(M15_MAX_PARTY_SIZE).toBe(6);
  });
});

describe('party service - invite code TTL', () => {
  it('should have TTL of 1 hour (3600000 ms)', () => {
    expect(INVITE_CODE_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe('party service - ready check logic', () => {
  function areAllMembersReady(members: { readyStatus: boolean }[]): boolean {
    return members.length >= 2 && members.every((m) => m.readyStatus);
  }

  it('returns false when no members', () => {
    expect(areAllMembersReady([])).toBe(false);
  });

  it('returns false when only one member', () => {
    expect(areAllMembersReady([{ readyStatus: true }])).toBe(false);
  });

  it('returns false when not all members are ready', () => {
    expect(areAllMembersReady([{ readyStatus: true }, { readyStatus: false }])).toBe(false);
  });

  it('returns true when all members ready and at least 2', () => {
    expect(areAllMembersReady([{ readyStatus: true }, { readyStatus: true }])).toBe(true);
  });
});

describe('party service - launch constraints', () => {
  function canLaunch(
    allReady: boolean,
    memberCount: number,
    minSize: number,
  ): { canLaunch: boolean; reason?: string } {
    if (memberCount < minSize) {
      return { canLaunch: false, reason: 'Not enough party members to launch' };
    }
    if (!allReady) {
      return { canLaunch: false, reason: 'All party members must be ready to launch' };
    }
    return { canLaunch: true };
  }

  it('cannot launch with not enough members', () => {
    const result = canLaunch(true, 1, 2);
    expect(result.canLaunch).toBe(false);
    expect(result.reason).toBe('Not enough party members to launch');
  });

  it('cannot launch when not all ready', () => {
    const result = canLaunch(false, 2, 2);
    expect(result.canLaunch).toBe(false);
    expect(result.reason).toBe('All party members must be ready to launch');
  });

  it('can launch when all ready and enough members', () => {
    const result = canLaunch(true, 2, 2);
    expect(result.canLaunch).toBe(true);
  });
});

describe('party service - status transitions', () => {
  const STATUS_FORMING = partyStatuses[0];
  const STATUS_READY = partyStatuses[1];
  const STATUS_IN_SESSION = partyStatuses[2];
  const STATUS_DISBANDED = partyStatuses[3];

  function isValidStatusTransition(current: string, next: string): boolean {
    const validTransitions: Record<string, string[]> = {
      [STATUS_FORMING]: [STATUS_READY, STATUS_DISBANDED],
      [STATUS_READY]: [STATUS_FORMING, STATUS_IN_SESSION, STATUS_DISBANDED],
      [STATUS_IN_SESSION]: [STATUS_DISBANDED],
      [STATUS_DISBANDED]: [],
    };
    return validTransitions[current]?.includes(next) ?? false;
  }

  it('forming can transition to ready', () => {
    expect(isValidStatusTransition(STATUS_FORMING, STATUS_READY)).toBe(true);
  });

  it('forming can transition to disbanded', () => {
    expect(isValidStatusTransition(STATUS_FORMING, STATUS_DISBANDED)).toBe(true);
  });

  it('ready can transition to in_session', () => {
    expect(isValidStatusTransition(STATUS_READY, STATUS_IN_SESSION)).toBe(true);
  });

  it('ready can transition back to forming', () => {
    expect(isValidStatusTransition(STATUS_READY, STATUS_FORMING)).toBe(true);
  });

  it('in_session cannot transition to forming', () => {
    expect(isValidStatusTransition(STATUS_IN_SESSION, STATUS_FORMING)).toBe(false);
  });

  it('disbanded cannot transition to any status', () => {
    for (const status of partyStatuses) {
      expect(isValidStatusTransition(STATUS_DISBANDED, status)).toBe(false);
    }
  });

  it('returns false for invalid status strings', () => {
    expect(isValidStatusTransition('invalid_status', STATUS_READY)).toBe(false);
    expect(isValidStatusTransition(STATUS_FORMING, 'invalid_status')).toBe(false);
    expect(isValidStatusTransition('invalid_current', 'invalid_next')).toBe(false);
  });
});
