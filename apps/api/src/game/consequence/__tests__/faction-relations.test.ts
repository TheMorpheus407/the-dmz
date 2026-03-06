import { describe, it, expect } from 'vitest';

import {
  getFactionTier,
  calculateFactionChange,
  calculateBreachFactionImpact,
  clampFactionRelation,
  initializeFactionRelations,
  getDefaultHomeFaction,
  isFactionRelationAtWarning,
} from '../faction-relations.js';

describe('Faction Relations Module', () => {
  describe('getFactionTier', () => {
    it('should return HOSTILE for -100 to -50', () => {
      expect(getFactionTier(-100)).toBe('HOSTILE');
      expect(getFactionTier(-75)).toBe('HOSTILE');
      expect(getFactionTier(-50)).toBe('HOSTILE');
    });

    it('should return UNFRIENDLY for -49 to -10', () => {
      expect(getFactionTier(-49)).toBe('UNFRIENDLY');
      expect(getFactionTier(-25)).toBe('UNFRIENDLY');
      expect(getFactionTier(-10)).toBe('UNFRIENDLY');
    });

    it('should return NEUTRAL for -9 to 9', () => {
      expect(getFactionTier(-9)).toBe('NEUTRAL');
      expect(getFactionTier(0)).toBe('NEUTRAL');
      expect(getFactionTier(9)).toBe('NEUTRAL');
    });

    it('should return FRIENDLY for 10 to 49', () => {
      expect(getFactionTier(10)).toBe('FRIENDLY');
      expect(getFactionTier(25)).toBe('FRIENDLY');
      expect(getFactionTier(49)).toBe('FRIENDLY');
    });

    it('should return ALLIED for 50 to 100', () => {
      expect(getFactionTier(50)).toBe('ALLIED');
      expect(getFactionTier(75)).toBe('ALLIED');
      expect(getFactionTier(100)).toBe('ALLIED');
    });
  });

  describe('clampFactionRelation', () => {
    it('should clamp values below -100', () => {
      expect(clampFactionRelation(-150)).toBe(-100);
      expect(clampFactionRelation(-200)).toBe(-100);
    });

    it('should clamp values above 100', () => {
      expect(clampFactionRelation(150)).toBe(100);
      expect(clampFactionRelation(200)).toBe(100);
    });

    it('should return values within range unchanged', () => {
      expect(clampFactionRelation(0)).toBe(0);
      expect(clampFactionRelation(-50)).toBe(-50);
      expect(clampFactionRelation(50)).toBe(50);
    });
  });

  describe('initializeFactionRelations', () => {
    it('should initialize all canonical factions to 0', () => {
      const relations = initializeFactionRelations('circuit_syndicate');
      expect(relations['sovereign_compact']).toBe(0);
      expect(relations['librarian_network']).toBe(0);
      expect(relations['red_hand']).toBe(0);
      expect(relations['circuit_syndicate']).toBe(10);
      expect(relations['unaffiliated']).toBe(0);
    });
  });

  describe('getDefaultHomeFaction', () => {
    it('should return unaffiliated', () => {
      expect(getDefaultHomeFaction()).toBe('unaffiliated');
    });
  });

  describe('isFactionRelationAtWarning', () => {
    it('should return true for relations below -25', () => {
      expect(isFactionRelationAtWarning(-26)).toBe(true);
      expect(isFactionRelationAtWarning(-50)).toBe(true);
      expect(isFactionRelationAtWarning(-100)).toBe(true);
    });

    it('should return false for relations at or above -25', () => {
      expect(isFactionRelationAtWarning(-25)).toBe(false);
      expect(isFactionRelationAtWarning(0)).toBe(false);
      expect(isFactionRelationAtWarning(100)).toBe(false);
    });
  });

  describe('calculateBreachFactionImpact', () => {
    it('should return negative impacts for involved factions', () => {
      const impacts = calculateBreachFactionImpact(['sovereign_compact', 'red_hand']);
      expect(impacts['sovereign_compact']).toBeLessThan(0);
      expect(impacts['red_hand']).toBeLessThan(0);
    });

    it('should return empty object for empty faction list', () => {
      const impacts = calculateBreachFactionImpact([]);
      expect(Object.keys(impacts)).toHaveLength(0);
    });
  });

  describe('calculateFactionChange', () => {
    it('should return 0 for non-aligned factions', () => {
      const change = calculateFactionChange(true, 'approve', 'sovereign_compact', false);
      expect(change).toBe(0);
    });

    it('should return positive change for correct approval of aligned faction', () => {
      const change = calculateFactionChange(true, 'approve', 'sovereign_compact', true);
      expect(change).toBeGreaterThan(0);
    });

    it('should return negative change for correct denial of aligned faction', () => {
      const change = calculateFactionChange(true, 'deny', 'sovereign_compact', true);
      expect(change).toBeLessThan(0);
    });
  });
});
