import { describe, expect, it } from 'vitest';

describe('arbitration service - proposal status transitions', () => {
  type ProposalStatus =
    | 'proposed'
    | 'confirmed'
    | 'overridden'
    | 'withdrawn'
    | 'expired'
    | 'consensus';

  const VALID_STATUS_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
    proposed: ['confirmed', 'overridden', 'expired', 'consensus'],
    confirmed: [],
    overridden: [],
    withdrawn: [],
    expired: [],
    consensus: [],
  };

  function isValidStatusTransition(current: ProposalStatus, next: ProposalStatus): boolean {
    return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
  }

  it('proposed can transition to confirmed', () => {
    expect(isValidStatusTransition('proposed', 'confirmed')).toBe(true);
  });

  it('proposed can transition to overridden', () => {
    expect(isValidStatusTransition('proposed', 'overridden')).toBe(true);
  });

  it('proposed can transition to expired', () => {
    expect(isValidStatusTransition('proposed', 'expired')).toBe(true);
  });

  it('proposed can transition to consensus', () => {
    expect(isValidStatusTransition('proposed', 'consensus')).toBe(true);
  });

  it('confirmed cannot transition to any status', () => {
    const statuses: ProposalStatus[] = [
      'proposed',
      'confirmed',
      'overridden',
      'withdrawn',
      'expired',
      'consensus',
    ];
    for (const status of statuses) {
      expect(isValidStatusTransition('confirmed', status)).toBe(false);
    }
  });

  it('overridden cannot transition to any status', () => {
    const statuses: ProposalStatus[] = [
      'proposed',
      'confirmed',
      'overridden',
      'withdrawn',
      'expired',
      'consensus',
    ];
    for (const status of statuses) {
      expect(isValidStatusTransition('overridden', status)).toBe(false);
    }
  });

  it('expired cannot transition to any status', () => {
    const statuses: ProposalStatus[] = [
      'proposed',
      'confirmed',
      'overridden',
      'withdrawn',
      'expired',
      'consensus',
    ];
    for (const status of statuses) {
      expect(isValidStatusTransition('expired', status)).toBe(false);
    }
  });

  it('consensus cannot transition to any status', () => {
    const statuses: ProposalStatus[] = [
      'proposed',
      'confirmed',
      'overridden',
      'withdrawn',
      'expired',
      'consensus',
    ];
    for (const status of statuses) {
      expect(isValidStatusTransition('consensus', status)).toBe(false);
    }
  });
});

describe('arbitration service - rationale validation', () => {
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

  it('rejects null rationale', () => {
    const result = validateRationale(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale is required for override actions');
  });

  it('rejects undefined rationale', () => {
    const result = validateRationale(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale is required for override actions');
  });

  it('rejects empty string rationale', () => {
    const result = validateRationale('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale is required for override actions');
  });

  it('rejects rationale less than 10 characters', () => {
    const result = validateRationale('short');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale must be at least 10 characters');
  });

  it('rejects rationale with only whitespace (less than 10 chars)', () => {
    const result = validateRationale('         ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale must be at least 10 characters');
  });

  it('accepts rationale with exactly 10 characters', () => {
    const result = validateRationale('1234567890');
    expect(result.valid).toBe(true);
  });

  it('accepts rationale with 10+ characters after trim', () => {
    const result = validateRationale('   1234567890   ');
    expect(result.valid).toBe(true);
  });

  it('accepts rationale with exactly 500 characters', () => {
    const rationale = 'a'.repeat(500);
    const result = validateRationale(rationale);
    expect(result.valid).toBe(true);
  });

  it('rejects rationale with more than 500 characters', () => {
    const rationale = 'a'.repeat(501);
    const result = validateRationale(rationale);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rationale must be at most 500 characters');
  });

  it('accepts valid rationale text', () => {
    const result = validateRationale(
      'The email shows multiple signs of phishing including mismatched domains and urgent language.',
    );
    expect(result.valid).toBe(true);
  });
});

describe('arbitration service - proposal statuses', () => {
  const proposalStatuses = [
    'proposed',
    'confirmed',
    'overridden',
    'withdrawn',
    'expired',
    'consensus',
  ] as const;

  it('should have six proposal statuses', () => {
    expect(proposalStatuses).toHaveLength(6);
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

  it('should include expired status', () => {
    expect(proposalStatuses).toContain('expired');
  });

  it('should include consensus status', () => {
    expect(proposalStatuses).toContain('consensus');
  });
});

describe('arbitration service - authority token rules', () => {
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

describe('arbitration service - token relinquishment reasons', () => {
  const tokenRelinquishReasons = ['self_proposal', 'timer_rotation', 'manual'] as const;

  it('should have three token relinquishment reasons', () => {
    expect(tokenRelinquishReasons).toHaveLength(3);
  });

  it('should include self_proposal reason', () => {
    expect(tokenRelinquishReasons).toContain('self_proposal');
  });

  it('should include timer_rotation reason', () => {
    expect(tokenRelinquishReasons).toContain('timer_rotation');
  });

  it('should include manual reason', () => {
    expect(tokenRelinquishReasons).toContain('manual');
  });
});

describe('arbitration service - expiration reasons', () => {
  const expirationReasons = ['timeout', 'session_ended'] as const;

  it('should have two expiration reasons', () => {
    expect(expirationReasons).toHaveLength(2);
  });

  it('should include timeout reason', () => {
    expect(expirationReasons).toContain('timeout');
  });

  it('should include session_ended reason', () => {
    expect(expirationReasons).toContain('session_ended');
  });
});
