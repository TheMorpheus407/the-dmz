import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { sessionStore, currentPhase, currentDay } from './session-store';

describe('sessionStore', () => {
  beforeEach(() => {
    sessionStore.reset();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = get(sessionStore);
      expect(state.id).toBeNull();
      expect(state.day).toBe(0);
      expect(state.phase).toBe('DAY_START');
      expect(state.startedAt).toBeNull();
    });

    it('currentPhase derived returns phase', () => {
      expect(get(currentPhase)).toBe('DAY_START');
    });

    it('currentDay derived returns day', () => {
      expect(get(currentDay)).toBe(0);
    });
  });

  describe('setSession', () => {
    it('sets session id, day, and startedAt', () => {
      sessionStore.setSession('session-123', 5, '2026-01-01T00:00:00.000Z');

      const state = get(sessionStore);
      expect(state.id).toBe('session-123');
      expect(state.day).toBe(5);
      expect(state.startedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('does not overwrite other fields', () => {
      sessionStore.setPhase('EMAIL_TRIAGE');
      sessionStore.setSession('session-123', 5, '2026-01-01T00:00:00.000Z');

      const state = get(sessionStore);
      expect(state.phase).toBe('EMAIL_TRIAGE');
    });
  });

  describe('setPhase', () => {
    it('updates phase', () => {
      sessionStore.setPhase('EMAIL_TRIAGE');

      const state = get(sessionStore);
      expect(state.phase).toBe('EMAIL_TRIAGE');
      expect(get(currentPhase)).toBe('EMAIL_TRIAGE');
    });

    it('handles all game phases', () => {
      const phases = [
        'DAY_START',
        'INBOX_INTAKE',
        'EMAIL_TRIAGE',
        'VERIFICATION_REVIEW',
        'DECISION_RESOLUTION',
        'CONSEQUENCE_APPLICATION',
        'THREAT_PROCESSING',
        'INCIDENT_RESPONSE',
        'RESOURCE_MANAGEMENT',
        'UPGRADE_PHASE',
        'DAY_END',
      ] as const;

      phases.forEach((phase) => {
        sessionStore.setPhase(phase);
        expect(get(currentPhase)).toBe(phase);
      });
    });
  });

  describe('advanceDay', () => {
    it('increments day and resets phase to DAY_START', () => {
      sessionStore.setSession('session-123', 5, '2026-01-01T00:00:00.000Z');
      sessionStore.setPhase('UPGRADE_PHASE');

      sessionStore.advanceDay();

      const state = get(sessionStore);
      expect(state.day).toBe(6);
      expect(state.phase).toBe('DAY_START');
    });

    it('updates currentDay derived store', () => {
      sessionStore.setSession('session-123', 5, '2026-01-01T00:00:00.000Z');

      sessionStore.advanceDay();

      expect(get(currentDay)).toBe(6);
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      sessionStore.setSession('session-123', 10, '2026-01-01T00:00:00.000Z');
      sessionStore.setPhase('UPGRADE_PHASE');

      sessionStore.reset();

      const state = get(sessionStore);
      expect(state.id).toBeNull();
      expect(state.day).toBe(0);
      expect(state.phase).toBe('DAY_START');
      expect(state.startedAt).toBeNull();
    });
  });

  describe('get', () => {
    it('returns current state', () => {
      sessionStore.setSession('session-123', 7, '2026-01-01T00:00:00.000Z');

      const result = sessionStore.get();
      expect(result.id).toBe('session-123');
      expect(result.day).toBe(7);
    });
  });
});
