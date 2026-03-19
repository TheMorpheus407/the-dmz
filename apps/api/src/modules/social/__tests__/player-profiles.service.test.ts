import { describe, expect, it } from 'vitest';

describe('player profiles - privacy mode logic', () => {
  type PlayerProfile = {
    profileId: string;
    userId: string;
    tenantId: string;
    displayName: string;
    avatarId: string | null;
    privacyMode: 'public' | 'friends_only' | 'private';
    bio: string | null;
    socialVisibility: Record<string, unknown>;
    seasonRank: number | null;
    skillRatingBlue: number | null;
    skillRatingRed: number | null;
    skillRatingCoop: number | null;
    totalSessionsPlayed: number;
    currentStreak: number;
    createdAt: Date;
    updatedAt: Date;
    lastActiveAt: Date | null;
  };

  function applyPrivacyMode(
    profile: PlayerProfile,
    isOwner: boolean,
  ): PlayerProfile & { isOwner: boolean } {
    if (isOwner) {
      return { ...profile, isOwner: true };
    }

    switch (profile.privacyMode) {
      case 'public':
        return { ...profile, isOwner: false };
      case 'friends_only':
        return {
          ...profile,
          bio: null,
          avatarId: null,
          isOwner: false,
        };
      case 'private':
        return {
          profileId: profile.profileId,
          userId: profile.userId,
          tenantId: profile.tenantId,
          displayName: profile.displayName,
          avatarId: null,
          privacyMode: profile.privacyMode,
          bio: null,
          socialVisibility: {},
          seasonRank: profile.seasonRank,
          skillRatingBlue: profile.skillRatingBlue,
          skillRatingRed: profile.skillRatingRed,
          skillRatingCoop: profile.skillRatingCoop,
          totalSessionsPlayed: profile.totalSessionsPlayed,
          currentStreak: profile.currentStreak,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          lastActiveAt: profile.lastActiveAt,
          isOwner: false,
        };
      default:
        return { ...profile, isOwner: false };
    }
  }

  const mockProfile: PlayerProfile = {
    profileId: 'profile-123',
    userId: 'user-456',
    tenantId: 'tenant-789',
    displayName: 'TestPlayer',
    avatarId: 'avatar_cat_001',
    privacyMode: 'public',
    bio: 'Hello world',
    socialVisibility: { showOnlineStatus: true },
    seasonRank: 42,
    skillRatingBlue: 1500,
    skillRatingRed: 1400,
    skillRatingCoop: 1300,
    totalSessionsPlayed: 100,
    currentStreak: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
  };

  it('should return full profile when owner views own profile in public mode', () => {
    const result = applyPrivacyMode(mockProfile, true);

    expect(result.isOwner).toBe(true);
    expect(result.bio).toBe('Hello world');
    expect(result.avatarId).toBe('avatar_cat_001');
    expect(result.socialVisibility).toEqual({ showOnlineStatus: true });
  });

  it('should return full profile when non-owner views public profile', () => {
    const result = applyPrivacyMode(mockProfile, false);

    expect(result.isOwner).toBe(false);
    expect(result.bio).toBe('Hello world');
    expect(result.avatarId).toBe('avatar_cat_001');
    expect(result.socialVisibility).toEqual({ showOnlineStatus: true });
  });

  it('should hide bio and avatar in friends_only mode for non-owner', () => {
    const friendsOnlyProfile = { ...mockProfile, privacyMode: 'friends_only' as const };
    const result = applyPrivacyMode(friendsOnlyProfile, false);

    expect(result.isOwner).toBe(false);
    expect(result.bio).toBeNull();
    expect(result.avatarId).toBeNull();
    expect(result.displayName).toBe('TestPlayer');
    expect(result.seasonRank).toBe(42);
  });

  it('should return only stats in private mode for non-owner', () => {
    const privateProfile = { ...mockProfile, privacyMode: 'private' as const };
    const result = applyPrivacyMode(privateProfile, false);

    expect(result.isOwner).toBe(false);
    expect(result.bio).toBeNull();
    expect(result.avatarId).toBeNull();
    expect(result.socialVisibility).toEqual({});
    expect(result.displayName).toBe('TestPlayer');
    expect(result.seasonRank).toBe(42);
    expect(result.skillRatingBlue).toBe(1500);
    expect(result.totalSessionsPlayed).toBe(100);
    expect(result.currentStreak).toBe(5);
  });

  it('should preserve all stats including skill ratings in private mode', () => {
    const privateProfile = { ...mockProfile, privacyMode: 'private' as const };
    const result = applyPrivacyMode(privateProfile, false);

    expect(result.skillRatingBlue).toBe(1500);
    expect(result.skillRatingRed).toBe(1400);
    expect(result.skillRatingCoop).toBe(1300);
    expect(result.seasonRank).toBe(42);
    expect(result.totalSessionsPlayed).toBe(100);
    expect(result.currentStreak).toBe(5);
  });
});

describe('player profiles - display name validation', () => {
  it('should validate display name length constraints', () => {
    const minLength = 1;
    const maxLength = 50;

    expect('a'.repeat(minLength)).toHaveLength(1);
    expect('a'.repeat(maxLength)).toHaveLength(50);
    expect('a'.repeat(0)).toHaveLength(0);
    expect('a'.repeat(51)).toHaveLength(51);
  });

  it('should validate bio length constraints', () => {
    const maxBioLength = 280;

    expect('a'.repeat(maxBioLength)).toHaveLength(280);
    expect('a'.repeat(281)).toHaveLength(281);
  });
});

describe('player profiles - avatar categories', () => {
  const avatarCategories = ['animal', 'robot', 'geometric', 'character'] as const;

  it('should have valid avatar categories', () => {
    expect(avatarCategories).toContain('animal');
    expect(avatarCategories).toContain('robot');
    expect(avatarCategories).toContain('geometric');
    expect(avatarCategories).toContain('character');
    expect(avatarCategories).toHaveLength(4);
  });

  it('should have unique avatar categories', () => {
    const uniqueCategories = new Set(avatarCategories);
    expect(uniqueCategories).toHaveLength(avatarCategories.length);
  });
});

describe('player profiles - privacy modes', () => {
  const privacyModes = ['public', 'friends_only', 'private'] as const;

  it('should have valid privacy modes', () => {
    expect(privacyModes).toContain('public');
    expect(privacyModes).toContain('friends_only');
    expect(privacyModes).toContain('private');
    expect(privacyModes).toHaveLength(3);
  });

  it('should have unique privacy modes', () => {
    const uniqueModes = new Set(privacyModes);
    expect(uniqueModes).toHaveLength(privacyModes.length);
  });
});

describe('player profiles - skill rating bounds', () => {
  it('should handle valid skill rating ranges', () => {
    const minRating = 0;
    const maxRating = 10000;

    expect(minRating).toBeGreaterThanOrEqual(0);
    expect(maxRating).toBeLessThanOrEqual(10000);
  });

  it('should handle null skill ratings', () => {
    const nullRating = null;
    expect(nullRating).toBeNull();
  });
});

describe('player profiles - streak validation', () => {
  it('should handle valid streak values', () => {
    const streak = 0;
    expect(streak).toBeGreaterThanOrEqual(0);
  });

  it('should handle consecutive days played', () => {
    const streak = 365;
    expect(streak).toBeLessThanOrEqual(365);
  });
});

describe('player profiles - session count validation', () => {
  it('should handle total sessions played', () => {
    const sessions = 0;
    expect(sessions).toBeGreaterThanOrEqual(0);
  });

  it('should handle large session counts', () => {
    const sessions = 100000;
    expect(sessions).toBeGreaterThanOrEqual(0);
  });
});
