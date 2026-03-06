import { describe, it, expect } from 'vitest';

import {
  calculateBacklogPressure,
  calculateBacklogTrustPenalty,
  shouldTriggerBacklogIncident,
  resolveBacklogPenalty,
  calculateBacklogTrustImpact,
  getBacklogSeverity,
} from '../backlog.js';

describe('Backlog Module', () => {
  describe('calculateBacklogPressure', () => {
    it('should return zero penalty for backlog at or below threshold', () => {
      const result = calculateBacklogPressure(0);
      expect(result.accumulatedPenalty).toBe(0);
      expect(result.shouldCreateIncident).toBe(false);

      const result2 = calculateBacklogPressure(3);
      expect(result2.accumulatedPenalty).toBe(0);
      expect(result2.shouldCreateIncident).toBe(false);
    });

    it('should return negative penalty for backlog above threshold', () => {
      const result = calculateBacklogPressure(5);
      expect(result.accumulatedPenalty).toBe(-2);
      expect(result.shouldCreateIncident).toBe(false);
    });

    it('should trigger incident at threshold 10', () => {
      const result = calculateBacklogPressure(10);
      expect(result.shouldCreateIncident).toBe(true);
    });

    it('should accumulate penalties', () => {
      const result = calculateBacklogPressure(5, -3);
      expect(result.accumulatedPenalty).toBe(-5);
    });
  });

  describe('calculateBacklogTrustPenalty', () => {
    it('should return 0 for backlog at or below 3', () => {
      expect(calculateBacklogTrustPenalty(0)).toBe(0);
      expect(calculateBacklogTrustPenalty(3)).toBe(0);
    });

    it('should return negative penalty above threshold', () => {
      expect(calculateBacklogTrustPenalty(4)).toBe(-1);
      expect(calculateBacklogTrustPenalty(8)).toBe(-5);
    });
  });

  describe('shouldTriggerBacklogIncident', () => {
    it('should return false for backlog below 10', () => {
      expect(shouldTriggerBacklogIncident(0)).toBe(false);
      expect(shouldTriggerBacklogIncident(5)).toBe(false);
      expect(shouldTriggerBacklogIncident(9)).toBe(false);
    });

    it('should return true for backlog at or above 10', () => {
      expect(shouldTriggerBacklogIncident(10)).toBe(true);
      expect(shouldTriggerBacklogIncident(15)).toBe(true);
    });
  });

  describe('resolveBacklogPenalty', () => {
    it('should reduce accumulated penalty when resolving', () => {
      const result = resolveBacklogPenalty(3, -5);
      expect(result).toBe(-2);
    });

    it('should not go above 0', () => {
      const result = resolveBacklogPenalty(10, -3);
      expect(result).toBe(0);
    });

    it('should return unchanged for positive penalty', () => {
      const result = resolveBacklogPenalty(5, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateBacklogTrustImpact', () => {
    it('should return accumulated penalty', () => {
      const state = {
        totalUnresolved: 5,
        accumulatedPenalty: -2,
        shouldCreateIncident: false,
      };
      expect(calculateBacklogTrustImpact(state)).toBe(-2);
    });
  });

  describe('getBacklogSeverity', () => {
    it('should return normal for backlog below 5', () => {
      expect(getBacklogSeverity(0)).toBe('normal');
      expect(getBacklogSeverity(4)).toBe('normal');
    });

    it('should return elevated for backlog 5-9', () => {
      expect(getBacklogSeverity(5)).toBe('elevated');
      expect(getBacklogSeverity(9)).toBe('elevated');
    });

    it('should return critical for backlog 10+', () => {
      expect(getBacklogSeverity(10)).toBe('critical');
      expect(getBacklogSeverity(20)).toBe('critical');
    });
  });
});
