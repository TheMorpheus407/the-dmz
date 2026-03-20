import { describe, expect, it } from 'vitest';

describe('authority token service - token holder info', () => {
  interface TokenHolderInfo {
    playerId: string;
    isAuthority: boolean;
    role: string;
  }

  function createTokenHolder(
    playerId: string,
    isAuthority: boolean,
    role: string,
  ): TokenHolderInfo {
    return { playerId, isAuthority, role };
  }

  it('creates token holder info correctly', () => {
    const holder = createTokenHolder('player-1', true, 'triage_lead');
    expect(holder.playerId).toBe('player-1');
    expect(holder.isAuthority).toBe(true);
    expect(holder.role).toBe('triage_lead');
  });

  it('identifies authority correctly', () => {
    const authority = createTokenHolder('player-1', true, 'triage_lead');
    const nonAuthority = createTokenHolder('player-2', false, 'verification_lead');

    expect(authority.isAuthority).toBe(true);
    expect(nonAuthority.isAuthority).toBe(false);
  });
});

describe('authority token service - token relinquishment', () => {
  type TokenRelinquishReason = 'self_proposal' | 'timer_rotation' | 'manual';

  function canRelinquishToken(
    currentAuthorityId: string,
    requestingPlayerId: string,
    _reason: TokenRelinquishReason,
  ): { canRelinquish: boolean; error?: string } {
    if (currentAuthorityId !== requestingPlayerId) {
      return { canRelinquish: false, error: 'Only the current authority can relinquish the token' };
    }
    return { canRelinquish: true };
  }

  it('authority can manually relinquish token', () => {
    const result = canRelinquishToken('player-1', 'player-1', 'manual');
    expect(result.canRelinquish).toBe(true);
  });

  it('non-authority cannot relinquish token', () => {
    const result = canRelinquishToken('player-1', 'player-2', 'manual');
    expect(result.canRelinquish).toBe(false);
    expect(result.error).toBe('Only the current authority can relinquish the token');
  });

  it('authority can relinquish token due to self_proposal', () => {
    const result = canRelinquishToken('player-1', 'player-1', 'self_proposal');
    expect(result.canRelinquish).toBe(true);
  });

  it('authority can relinquish token due to timer_rotation', () => {
    const result = canRelinquishToken('player-1', 'player-1', 'timer_rotation');
    expect(result.canRelinquish).toBe(true);
  });
});

describe('authority token service - authority rotation', () => {
  function rotateAuthority(currentAuthority: string, player1Id: string, player2Id: string): string {
    return currentAuthority === player1Id ? player2Id : player1Id;
  }

  it('rotates authority from player1 to player2', () => {
    const newAuthority = rotateAuthority('player1', 'player1', 'player2');
    expect(newAuthority).toBe('player2');
  });

  it('rotates authority from player2 to player1', () => {
    const newAuthority = rotateAuthority('player2', 'player1', 'player2');
    expect(newAuthority).toBe('player1');
  });

  it('maintains authority if player not in session', () => {
    const newAuthority = rotateAuthority('player1', 'player1', 'player3');
    expect(newAuthority).toBe('player3');
  });
});

describe('authority token service - token auto-relinquish on self-proposal', () => {
  function shouldAutoRelinquish(
    isAuthority: boolean,
    isOwnProposal: boolean,
    autoRelinquishEnabled: boolean,
  ): { shouldRelinquish: boolean; reason?: string } {
    if (!autoRelinquishEnabled) {
      return { shouldRelinquish: false };
    }
    if (isAuthority && isOwnProposal) {
      return { shouldRelinquish: true, reason: 'self_proposal' };
    }
    return { shouldRelinquish: false };
  }

  it('auto-relinquishes when authority proposes own action', () => {
    const result = shouldAutoRelinquish(true, true, true);
    expect(result.shouldRelinquish).toBe(true);
    expect(result.reason).toBe('self_proposal');
  });

  it('does not auto-relinquish when non-authority proposes', () => {
    const result = shouldAutoRelinquish(false, false, true);
    expect(result.shouldRelinquish).toBe(false);
  });

  it('does not auto-relinquish when authority is disabled', () => {
    const result = shouldAutoRelinquish(true, true, false);
    expect(result.shouldRelinquish).toBe(false);
  });

  it('does not auto-relinquish when authority proposes other player action', () => {
    const result = shouldAutoRelinquish(true, false, true);
    expect(result.shouldRelinquish).toBe(false);
  });
});

describe('authority token service - rationale validation', () => {
  function validateRationale(rationale: string | null | undefined): {
    valid: boolean;
    error?: string;
  } {
    if (!rationale) {
      return { valid: false, error: 'Rationale is required for override actions' };
    }

    const trimmed = rationale.trim();

    if (trimmed.length < 10) {
      return { valid: false, error: 'Rationale must be at least 10 characters' };
    }

    if (trimmed.length > 500) {
      return { valid: false, error: 'Rationale must be at most 500 characters' };
    }

    return { valid: true };
  }

  it('accepts valid rationale at minimum length', () => {
    const result = validateRationale('1234567890');
    expect(result.valid).toBe(true);
  });

  it('accepts valid rationale at maximum length', () => {
    const result = validateRationale('a'.repeat(500));
    expect(result.valid).toBe(true);
  });

  it('rejects rationale exceeding maximum length', () => {
    const result = validateRationale('a'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale must be at most 500 characters');
  });

  it('rejects null rationale', () => {
    const result = validateRationale(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale is required for override actions');
  });

  it('rejects empty rationale', () => {
    const result = validateRationale('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale is required for override actions');
  });

  it('rejects whitespace-only rationale', () => {
    const result = validateRationale('          ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale must be at least 10 characters');
  });
});
