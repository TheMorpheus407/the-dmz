import { describe, expect, it } from 'vitest';

import {
  displayNameSchema,
  registerSchema,
  playerProfileBaseSchema,
  playerProfilePrivateSchema,
  updatePlayerProfileInputSchema,
} from './index.js';

describe('displayName constraint consistency', () => {
  describe('displayNameSchema (shared schema)', () => {
    it('should be exported from common.schema', () => {
      expect(displayNameSchema).toBeDefined();
    });

    it('should have min length of 1', () => {
      expect(() => displayNameSchema.parse('')).toThrow();
      expect(() => displayNameSchema.parse('A')).not.toThrow();
    });

    it('should have max length of 50', () => {
      expect(() => displayNameSchema.parse('A'.repeat(50))).not.toThrow();
      expect(() => displayNameSchema.parse('A'.repeat(51))).toThrow();
    });
  });

  describe('registerSchema (auth.schema)', () => {
    it('should use displayName with min(1).max(50) constraints', () => {
      expect(() =>
        registerSchema.parse({
          email: 'test@example.com',
          password: 'longer-password-123',
          displayName: '',
        }),
      ).toThrow();

      expect(() =>
        registerSchema.parse({
          email: 'test@example.com',
          password: 'longer-password-123',
          displayName: 'A',
        }),
      ).not.toThrow();

      expect(() =>
        registerSchema.parse({
          email: 'test@example.com',
          password: 'longer-password-123',
          displayName: 'A'.repeat(50),
        }),
      ).not.toThrow();

      expect(() =>
        registerSchema.parse({
          email: 'test@example.com',
          password: 'longer-password-123',
          displayName: 'A'.repeat(51),
        }),
      ).toThrow();
    });
  });

  describe('playerProfileBaseSchema (social.schema)', () => {
    it('should use displayName with min(1).max(50) constraints', () => {
      const validProfile = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        tenantId: '550e8400-e29b-41d4-a716-446655440002',
        displayName: 'PlayerOne',
        avatarId: null,
        privacyMode: 'public' as const,
        bio: null,
        socialVisibility: {},
        seasonRank: null,
        skillRatingBlue: null,
        skillRatingRed: null,
        skillRatingCoop: null,
        totalSessionsPlayed: 0,
        currentStreak: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastActiveAt: null,
      };

      expect(() => playerProfileBaseSchema.parse({ ...validProfile, displayName: '' })).toThrow();
      expect(() =>
        playerProfileBaseSchema.parse({ ...validProfile, displayName: 'A' }),
      ).not.toThrow();
      expect(() =>
        playerProfileBaseSchema.parse({ ...validProfile, displayName: 'A'.repeat(50) }),
      ).not.toThrow();
      expect(() =>
        playerProfileBaseSchema.parse({ ...validProfile, displayName: 'A'.repeat(51) }),
      ).toThrow();
    });
  });

  describe('playerProfilePrivateSchema (social.schema)', () => {
    it('should use displayName with min(1).max(50) constraints', () => {
      const validProfile = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        tenantId: '550e8400-e29b-41d4-a716-446655440002',
        displayName: 'PlayerOne',
        privacyMode: 'public' as const,
        seasonRank: null,
        skillRatingBlue: null,
        skillRatingRed: null,
        skillRatingCoop: null,
        totalSessionsPlayed: 0,
        currentStreak: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastActiveAt: null,
      };

      expect(() =>
        playerProfilePrivateSchema.parse({ ...validProfile, displayName: '' }),
      ).toThrow();
      expect(() =>
        playerProfilePrivateSchema.parse({ ...validProfile, displayName: 'A' }),
      ).not.toThrow();
      expect(() =>
        playerProfilePrivateSchema.parse({ ...validProfile, displayName: 'A'.repeat(50) }),
      ).not.toThrow();
      expect(() =>
        playerProfilePrivateSchema.parse({ ...validProfile, displayName: 'A'.repeat(51) }),
      ).toThrow();
    });
  });

  describe('updatePlayerProfileInputSchema (social.schema)', () => {
    it('should use displayName with min(1).max(50) constraints when provided', () => {
      const validInput = {
        displayName: 'UpdatedName',
      };

      expect(() => updatePlayerProfileInputSchema.parse(validInput)).not.toThrow();
      expect(() => updatePlayerProfileInputSchema.parse({ displayName: '' })).toThrow();
      expect(() => updatePlayerProfileInputSchema.parse({ displayName: 'A' })).not.toThrow();
      expect(() =>
        updatePlayerProfileInputSchema.parse({ displayName: 'A'.repeat(50) }),
      ).not.toThrow();
      expect(() => updatePlayerProfileInputSchema.parse({ displayName: 'A'.repeat(51) })).toThrow();
    });
  });
});
