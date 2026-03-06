import { describe, expect, it } from 'vitest';

import {
  shouldCreateSnapshot,
  SNAPSHOT_INTERVAL,
  DAY_PHASES,
  SESSION_MACRO_STATES,
} from '@the-dmz/shared';
import type { GameState, GameActionPayload } from '@the-dmz/shared';

import { reduce, createInitialGameState } from '../../engine/reducer.js';

describe('Event Replay Logic', () => {
  const createTestState = (overrides?: Partial<GameState>): GameState => {
    const baseState = createInitialGameState(
      'test-session-id',
      'test-user-id',
      'test-tenant-id',
      12345,
    );
    return { ...baseState, ...overrides };
  };

  describe('replayToState - Full Event Replay', () => {
    it('should replay events to derive final state - pause/resume', () => {
      let state = createTestState({
        currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
        currentPhase: DAY_PHASES.PHASE_DAY_START,
      });

      const action1: GameActionPayload = { type: 'ACK_DAY_START' };
      let result = reduce(state, action1);
      expect(result.success).toBe(true);
      state = result.newState;
      expect(state.currentPhase).toBe(DAY_PHASES.PHASE_EMAIL_INTAKE);

      const action2: GameActionPayload = { type: 'PAUSE_SESSION' };
      result = reduce(state, action2);
      expect(result.success).toBe(true);
      state = result.newState;
      expect(state.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_PAUSED);

      const action3: GameActionPayload = { type: 'RESUME_SESSION' };
      result = reduce(state, action3);
      expect(result.success).toBe(true);
      state = result.newState;
      expect(state.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ACTIVE);
    });

    it('should produce deterministic state from same event sequence', () => {
      const replay = (): GameState => {
        let s = createTestState({
          currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
          currentPhase: DAY_PHASES.PHASE_DAY_START,
        });

        const actions: GameActionPayload[] = [
          { type: 'ACK_DAY_START' },
          { type: 'PAUSE_SESSION' },
          { type: 'RESUME_SESSION' },
          { type: 'PAUSE_SESSION' },
          { type: 'RESUME_SESSION' },
        ];

        for (const action of actions) {
          const result = reduce(s, action);
          if (result.success) {
            s = result.newState;
          }
        }
        return s;
      };

      const state1 = replay();
      const state2 = replay();

      expect(state1.currentMacroState).toBe(state2.currentMacroState);
      expect(state1.sequenceNumber).toBe(state2.sequenceNumber);
    });
  });

  describe('Snapshot Strategy', () => {
    describe('shouldCreateSnapshot', () => {
      it('should return true when no previous snapshot and sequence >= 50', () => {
        expect(shouldCreateSnapshot(50, null)).toBe(true);
        expect(shouldCreateSnapshot(51, null)).toBe(true);
        expect(shouldCreateSnapshot(100, null)).toBe(true);
      });

      it('should return false when no previous snapshot and sequence < 50', () => {
        expect(shouldCreateSnapshot(0, null)).toBe(false);
        expect(shouldCreateSnapshot(10, null)).toBe(false);
        expect(shouldCreateSnapshot(49, null)).toBe(false);
      });

      it('should return true when 50+ events since last snapshot', () => {
        expect(shouldCreateSnapshot(60, 10)).toBe(true);
        expect(shouldCreateSnapshot(100, 49)).toBe(true);
        expect(shouldCreateSnapshot(51, 0)).toBe(true);
      });

      it('should return false when < 50 events since last snapshot', () => {
        expect(shouldCreateSnapshot(55, 10)).toBe(false);
        expect(shouldCreateSnapshot(60, 15)).toBe(false);
        expect(shouldCreateSnapshot(59, 10)).toBe(false);
      });
    });

    describe('SNAPSHOT_INTERVAL', () => {
      it('should be 50', () => {
        expect(SNAPSHOT_INTERVAL).toBe(50);
      });
    });

    describe('loadStateFromSnapshot - Snapshot Recovery', () => {
      it('should recover state from snapshot plus delta events', () => {
        let state = createTestState({
          currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
          currentPhase: DAY_PHASES.PHASE_DAY_START,
        });

        const action1: GameActionPayload = { type: 'ACK_DAY_START' };
        let result = reduce(state, action1);
        state = result.newState;

        const action2: GameActionPayload = { type: 'PAUSE_SESSION' };
        result = reduce(state, action2);
        state = result.newState;

        const snapshotSequence = state.sequenceNumber;

        const deltaActions: GameActionPayload[] = [
          { type: 'RESUME_SESSION' },
          { type: 'PAUSE_SESSION' },
        ];

        for (const action of deltaActions) {
          const res = reduce(state, action);
          if (res.success) {
            state = res.newState;
          }
        }

        expect(state.sequenceNumber).toBe(snapshotSequence + 2);
        expect(state.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_PAUSED);
      });

      it('should produce same final state from snapshot+delta as full replay', () => {
        const fullReplay = (): GameState => {
          let s = createTestState({
            currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
            currentPhase: DAY_PHASES.PHASE_DAY_START,
          });

          const actions: GameActionPayload[] = [
            { type: 'ACK_DAY_START' },
            { type: 'PAUSE_SESSION' },
            { type: 'RESUME_SESSION' },
            { type: 'PAUSE_SESSION' },
            { type: 'RESUME_SESSION' },
          ];

          for (const action of actions) {
            const result = reduce(s, action);
            if (result.success) {
              s = result.newState;
            }
          }
          return s;
        };

        const snapshotPlusDelta = (): GameState => {
          let s = createTestState({
            currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
            currentPhase: DAY_PHASES.PHASE_DAY_START,
          });

          const actions: GameActionPayload[] = [
            { type: 'ACK_DAY_START' },
            { type: 'PAUSE_SESSION' },
          ];

          for (const action of actions) {
            const result = reduce(s, action);
            if (result.success) {
              s = result.newState;
            }
          }

          const deltaActions: GameActionPayload[] = [
            { type: 'RESUME_SESSION' },
            { type: 'PAUSE_SESSION' },
            { type: 'RESUME_SESSION' },
          ];

          for (const action of deltaActions) {
            const result = reduce(s, action);
            if (result.success) {
              s = result.newState;
            }
          }
          return s;
        };

        const fullState = fullReplay();
        const snapshotState = snapshotPlusDelta();

        expect(fullState.sequenceNumber).toBe(snapshotState.sequenceNumber);
        expect(fullState.currentMacroState).toBe(snapshotState.currentMacroState);
      });
    });
  });
});
