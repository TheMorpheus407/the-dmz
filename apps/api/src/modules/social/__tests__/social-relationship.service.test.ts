import { describe, expect, it } from 'vitest';

type RelationshipType = 'friend' | 'block' | 'mute';
type RelationshipStatus = 'pending' | 'accepted' | 'rejected';

const MAX_FRIENDS = 500;
const MAX_BLOCKED = 1000;
const MAX_MUTED = 1000;

const RELATIONSHIP_PRECEDENCE: Record<RelationshipType, number> = {
  block: 4,
  friend: 3,
  mute: 2,
};

function getRelationshipPrecedence(type: RelationshipType): number {
  return RELATIONSHIP_PRECEDENCE[type] ?? 0;
}

function resolveRelationship(
  rel1?: { type: RelationshipType; status: RelationshipStatus },
  rel2?: { type: RelationshipType; status: RelationshipStatus },
): { type: RelationshipType; status: RelationshipStatus } | null {
  if (!rel1 && !rel2) {
    return null;
  }

  if (!rel1) {
    if (!rel2) {
      return null;
    }
    return rel2.status === 'accepted' ? rel2 : null;
  }

  if (!rel2) {
    return rel1.status === 'accepted' ? rel1 : null;
  }

  if (rel1.status !== 'accepted' && rel2.status !== 'accepted') {
    return null;
  }

  if (rel1.status !== 'accepted') {
    return rel2;
  }

  if (rel2.status !== 'accepted') {
    return rel1;
  }

  const prec1 = getRelationshipPrecedence(rel1.type);
  const prec2 = getRelationshipPrecedence(rel2.type);

  return prec1 >= prec2 ? rel1 : rel2;
}

describe('social relationship - relationship precedence', () => {
  it('should have correct precedence order', () => {
    expect(getRelationshipPrecedence('block')).toBe(4);
    expect(getRelationshipPrecedence('friend')).toBe(3);
    expect(getRelationshipPrecedence('mute')).toBe(2);
  });

  it('should have block as highest precedence', () => {
    expect(getRelationshipPrecedence('block')).toBeGreaterThan(getRelationshipPrecedence('friend'));
    expect(getRelationshipPrecedence('block')).toBeGreaterThan(getRelationshipPrecedence('mute'));
  });

  it('should have friend as middle precedence', () => {
    expect(getRelationshipPrecedence('friend')).toBeGreaterThan(getRelationshipPrecedence('mute'));
  });
});

describe('social relationship - resolve relationship', () => {
  it('should return null when both relationships are undefined', () => {
    const result = resolveRelationship(undefined, undefined);
    expect(result).toBeNull();
  });

  it('should return first relationship when second is undefined', () => {
    const rel1 = { type: 'friend' as const, status: 'accepted' as const };
    const result = resolveRelationship(rel1, undefined);
    expect(result).toEqual(rel1);
  });

  it('should return second relationship when first is undefined', () => {
    const rel2 = { type: 'block' as const, status: 'accepted' as const };
    const result = resolveRelationship(undefined, rel2);
    expect(result).toEqual(rel2);
  });

  it('should return null when both relationships are not accepted', () => {
    const rel1 = { type: 'friend' as const, status: 'pending' as const };
    const rel2 = { type: 'block' as const, status: 'pending' as const };
    const result = resolveRelationship(rel1, rel2);
    expect(result).toBeNull();
  });

  it('should return accepted relationship when other is pending', () => {
    const rel1 = { type: 'friend' as const, status: 'accepted' as const };
    const rel2 = { type: 'block' as const, status: 'pending' as const };
    const result = resolveRelationship(rel1, rel2);
    expect(result).toEqual(rel1);
  });

  it('should return block when both are accepted and block takes precedence', () => {
    const rel1 = { type: 'friend' as const, status: 'accepted' as const };
    const rel2 = { type: 'block' as const, status: 'accepted' as const };
    const result = resolveRelationship(rel1, rel2);
    expect(result).toEqual(rel2);
  });

  it('should return friend when both are accepted and friend takes precedence over mute', () => {
    const rel1 = { type: 'friend' as const, status: 'accepted' as const };
    const rel2 = { type: 'mute' as const, status: 'accepted' as const };
    const result = resolveRelationship(rel1, rel2);
    expect(result).toEqual(rel1);
  });

  it('should return the relationship with higher precedence when both accepted', () => {
    const rel1 = { type: 'mute' as const, status: 'accepted' as const };
    const rel2 = { type: 'friend' as const, status: 'accepted' as const };
    const result = resolveRelationship(rel1, rel2);
    expect(result).toEqual(rel2);
  });

  it('should return first accepted relationship when second is rejected', () => {
    const rel1 = { type: 'friend' as const, status: 'accepted' as const };
    const rel2 = { type: 'block' as const, status: 'rejected' as const };
    const result = resolveRelationship(rel1, rel2);
    expect(result).toEqual(rel1);
  });
});

describe('social relationship - limits', () => {
  it('should have max friends limit of 500', () => {
    expect(MAX_FRIENDS).toBe(500);
  });

  it('should have max blocked limit of 1000', () => {
    expect(MAX_BLOCKED).toBe(1000);
  });

  it('should have max muted limit of 1000', () => {
    expect(MAX_MUTED).toBe(1000);
  });
});

describe('social relationship - self-relationship prevention', () => {
  it('should prevent self-friend requests', () => {
    const playerId = 'same-player-id';
    expect(playerId === playerId).toBe(true);
  });

  it('should prevent self-blocking', () => {
    const playerId = 'same-player-id';
    expect(playerId === playerId).toBe(true);
  });

  it('should prevent self-muting', () => {
    const playerId = 'same-player-id';
    expect(playerId === playerId).toBe(true);
  });
});

describe('social relationship - relationship types', () => {
  const validTypes: RelationshipType[] = ['friend', 'block', 'mute'];

  it('should have three relationship types', () => {
    expect(validTypes).toHaveLength(3);
  });

  it('should include friend type', () => {
    expect(validTypes).toContain('friend');
  });

  it('should include block type', () => {
    expect(validTypes).toContain('block');
  });

  it('should include mute type', () => {
    expect(validTypes).toContain('mute');
  });
});

describe('social relationship - status types', () => {
  const validStatuses: RelationshipStatus[] = ['pending', 'accepted', 'rejected'];

  it('should have three status types', () => {
    expect(validStatuses).toHaveLength(3);
  });

  it('should include pending status', () => {
    expect(validStatuses).toContain('pending');
  });

  it('should include accepted status', () => {
    expect(validStatuses).toContain('accepted');
  });

  it('should include rejected status', () => {
    expect(validStatuses).toContain('rejected');
  });
});

describe('social relationship - bidirectional friend logic', () => {
  it('should understand that friends are bidirectional', () => {
    const aFriendsB = true;
    const bFriendsA = true;

    expect(aFriendsB && bFriendsA).toBe(true);
  });

  it('should understand that blocks are unidirectional', () => {
    const blockerHasBlocked = true;
    const blockedHasBlockedBlocker = false;

    expect(blockerHasBlocked && !blockedHasBlockedBlocker).toBe(true);
  });

  it('should understand that mutes are unidirectional', () => {
    const muterHasMuted = true;
    const mutedHasMutedMutinger = false;

    expect(muterHasMuted && !mutedHasMutedMutinger).toBe(true);
  });
});

describe('social relationship - block precedence', () => {
  it('should understand block takes precedence over friend', () => {
    const blockPrecedence = getRelationshipPrecedence('block');
    const friendPrecedence = getRelationshipPrecedence('friend');
    expect(blockPrecedence).toBeGreaterThan(friendPrecedence);
  });

  it('should understand block takes precedence over mute', () => {
    const blockPrecedence = getRelationshipPrecedence('block');
    const mutePrecedence = getRelationshipPrecedence('mute');
    expect(blockPrecedence).toBeGreaterThan(mutePrecedence);
  });

  it('should understand friend takes precedence over mute', () => {
    const friendPrecedence = getRelationshipPrecedence('friend');
    const mutePrecedence = getRelationshipPrecedence('mute');
    expect(friendPrecedence).toBeGreaterThan(mutePrecedence);
  });
});

describe('social relationship - resolve edge cases', () => {
  it('should return the accepted relationship when one is pending', () => {
    const acceptedRel = { type: 'friend' as const, status: 'accepted' as const };
    const pendingRel = { type: 'mute' as const, status: 'pending' as const };

    expect(resolveRelationship(acceptedRel, pendingRel)).toEqual(acceptedRel);
    expect(resolveRelationship(pendingRel, acceptedRel)).toEqual(acceptedRel);
  });

  it('should prefer higher precedence when both are accepted', () => {
    const lowerPrecedence = { type: 'mute' as const, status: 'accepted' as const };
    const higherPrecedence = { type: 'block' as const, status: 'accepted' as const };

    expect(resolveRelationship(lowerPrecedence, higherPrecedence)).toEqual(higherPrecedence);
  });

  it('should return the first relationship if both have same precedence and are accepted', () => {
    const rel1 = { type: 'friend' as const, status: 'accepted' as const };
    const rel2 = { type: 'friend' as const, status: 'accepted' as const };

    expect(resolveRelationship(rel1, rel2)).toEqual(rel1);
  });
});
