import { describe, expect, it } from 'vitest';

import {
  resolveRolePreferences,
  calculatePreferenceMatchScore,
  validateRolePreference,
  createRolePreference,
} from '../role-assignment.service.js';

describe('role assignment service - resolveRolePreferences', () => {
  describe('both players have no preference', () => {
    it('assigns triage_lead to party leader', () => {
      const result = resolveRolePreferences(
        'player1',
        'no_preference',
        'player2',
        'no_preference',
        'player1',
      );

      expect(result.player1Role).toBe('triage_lead');
      expect(result.player1IsAuthority).toBe(true);
      expect(result.player2Role).toBe('verification_lead');
      expect(result.player2IsAuthority).toBe(false);
    });

    it('assigns triage_lead to player2 when player2 is leader', () => {
      const result = resolveRolePreferences(
        'player1',
        'no_preference',
        'player2',
        'no_preference',
        'player2',
      );

      expect(result.player1Role).toBe('verification_lead');
      expect(result.player1IsAuthority).toBe(false);
      expect(result.player2Role).toBe('triage_lead');
      expect(result.player2IsAuthority).toBe(true);
    });
  });

  describe('both players have same preference', () => {
    it('falls back to default when both prefer triage_lead', () => {
      const result = resolveRolePreferences(
        'player1',
        'triage_lead',
        'player2',
        'triage_lead',
        'player1',
      );

      expect(result.player1Role).toBe('triage_lead');
      expect(result.player1IsAuthority).toBe(true);
      expect(result.player2Role).toBe('verification_lead');
    });

    it('falls back to default when both prefer verification_lead', () => {
      const result = resolveRolePreferences(
        'player1',
        'verification_lead',
        'player2',
        'verification_lead',
        'player1',
      );

      expect(result.player1Role).toBe('triage_lead');
      expect(result.player1IsAuthority).toBe(true);
      expect(result.player2Role).toBe('verification_lead');
    });
  });

  describe('player1 prefers triage_lead, player2 prefers verification_lead', () => {
    it('assigns preferred roles correctly when player1 is leader', () => {
      const result = resolveRolePreferences(
        'player1',
        'triage_lead',
        'player2',
        'verification_lead',
        'player1',
      );

      expect(result.player1Role).toBe('triage_lead');
      expect(result.player1IsAuthority).toBe(true);
      expect(result.player2Role).toBe('verification_lead');
      expect(result.player2IsAuthority).toBe(false);
    });

    it('assigns preferred roles correctly when player2 is leader', () => {
      const result = resolveRolePreferences(
        'player1',
        'triage_lead',
        'player2',
        'verification_lead',
        'player2',
      );

      expect(result.player1Role).toBe('triage_lead');
      expect(result.player1IsAuthority).toBe(false);
      expect(result.player2Role).toBe('verification_lead');
      expect(result.player2IsAuthority).toBe(true);
    });
  });

  describe('player1 prefers verification_lead, player2 prefers triage_lead', () => {
    it('assigns preferred roles correctly when player1 is leader', () => {
      const result = resolveRolePreferences(
        'player1',
        'verification_lead',
        'player2',
        'triage_lead',
        'player1',
      );

      expect(result.player1Role).toBe('verification_lead');
      expect(result.player1IsAuthority).toBe(true);
      expect(result.player2Role).toBe('triage_lead');
      expect(result.player2IsAuthority).toBe(false);
    });

    it('assigns preferred roles correctly when player2 is leader', () => {
      const result = resolveRolePreferences(
        'player1',
        'verification_lead',
        'player2',
        'triage_lead',
        'player2',
      );

      expect(result.player1Role).toBe('verification_lead');
      expect(result.player1IsAuthority).toBe(false);
      expect(result.player2Role).toBe('triage_lead');
      expect(result.player2IsAuthority).toBe(true);
    });
  });

  describe('player1 has no preference, player2 has preference', () => {
    it('gives player2 their preference when player2 wants triage_lead', () => {
      const result = resolveRolePreferences(
        'player1',
        'no_preference',
        'player2',
        'triage_lead',
        'player1',
      );

      expect(result.player1Role).toBe('verification_lead');
      expect(result.player2Role).toBe('triage_lead');
    });

    it('gives player2 their preference when player2 wants verification_lead', () => {
      const result = resolveRolePreferences(
        'player1',
        'no_preference',
        'player2',
        'verification_lead',
        'player1',
      );

      expect(result.player1Role).toBe('triage_lead');
      expect(result.player2Role).toBe('verification_lead');
    });
  });

  describe('player1 has preference, player2 has no preference', () => {
    it('gives player1 their preference when player1 wants triage_lead', () => {
      const result = resolveRolePreferences(
        'player1',
        'triage_lead',
        'player2',
        'no_preference',
        'player1',
      );

      expect(result.player1Role).toBe('triage_lead');
      expect(result.player2Role).toBe('verification_lead');
    });

    it('gives player1 their preference when player1 wants verification_lead', () => {
      const result = resolveRolePreferences(
        'player1',
        'verification_lead',
        'player2',
        'no_preference',
        'player1',
      );

      expect(result.player1Role).toBe('verification_lead');
      expect(result.player2Role).toBe('triage_lead');
    });
  });
});

describe('role assignment service - calculatePreferenceMatchScore', () => {
  it('returns 2 when both have no preference', () => {
    const assignments = {
      player1Id: 'p1',
      player1Role: 'triage_lead' as const,
      player1IsAuthority: true,
      player2Id: 'p2',
      player2Role: 'verification_lead' as const,
      player2IsAuthority: false,
    };

    const score = calculatePreferenceMatchScore(assignments, 'no_preference', 'no_preference');
    expect(score).toBe(2);
  });

  it('returns 2 when both get their preference', () => {
    const assignments = {
      player1Id: 'p1',
      player1Role: 'triage_lead' as const,
      player1IsAuthority: true,
      player2Id: 'p2',
      player2Role: 'verification_lead' as const,
      player2IsAuthority: false,
    };

    const score = calculatePreferenceMatchScore(assignments, 'triage_lead', 'verification_lead');
    expect(score).toBe(2);
  });

  it('returns 1 when only player1 gets their preference', () => {
    const assignments = {
      player1Id: 'p1',
      player1Role: 'triage_lead' as const,
      player1IsAuthority: true,
      player2Id: 'p2',
      player2Role: 'triage_lead' as const,
      player2IsAuthority: false,
    };

    const score = calculatePreferenceMatchScore(assignments, 'triage_lead', 'verification_lead');
    expect(score).toBe(1);
  });

  it('returns 0 when neither gets their preference', () => {
    const assignments = {
      player1Id: 'p1',
      player1Role: 'verification_lead' as const,
      player1IsAuthority: true,
      player2Id: 'p2',
      player2Role: 'triage_lead' as const,
      player2IsAuthority: false,
    };

    const score = calculatePreferenceMatchScore(assignments, 'triage_lead', 'verification_lead');
    expect(score).toBe(0);
  });
});

describe('role assignment service - validateRolePreference', () => {
  it('returns true for triage_lead', () => {
    expect(validateRolePreference('triage_lead')).toBe(true);
  });

  it('returns true for verification_lead', () => {
    expect(validateRolePreference('verification_lead')).toBe(true);
  });

  it('returns true for no_preference', () => {
    expect(validateRolePreference('no_preference')).toBe(true);
  });

  it('returns false for invalid strings', () => {
    expect(validateRolePreference('invalid')).toBe(false);
    expect(validateRolePreference('TRIAGE_LEAD')).toBe(false);
    expect(validateRolePreference('')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(validateRolePreference(123)).toBe(false);
    expect(validateRolePreference(null)).toBe(false);
    expect(validateRolePreference(undefined)).toBe(false);
    expect(validateRolePreference({})).toBe(false);
  });
});

describe('role assignment service - createRolePreference', () => {
  it('creates preference with correct playerId', () => {
    const pref = createRolePreference('player123', 'triage_lead');
    expect(pref.playerId).toBe('player123');
  });

  it('creates preference with correct preference value', () => {
    const pref = createRolePreference('player123', 'verification_lead');
    expect(pref.preference).toBe('verification_lead');
  });

  it('sets submittedAt to current date', () => {
    const before = new Date();
    const pref = createRolePreference('player123', 'no_preference');
    const after = new Date();

    expect(pref.submittedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(pref.submittedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
