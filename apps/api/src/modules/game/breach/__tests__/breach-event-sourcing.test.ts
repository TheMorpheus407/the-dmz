import { describe, it, expect, beforeEach } from 'vitest';

import {
  DAY_PHASES,
  SESSION_MACRO_STATES,
  type BreachState,
  type GameState,
  type GameActionPayload,
  GAME_EVENT_TYPES,
  EventAdapterRegistry,
  createBreachOccurredAdapter,
  createBreachRansomPaidAdapter,
  createBreachRansomRefusedAdapter,
  createBreachRecoveryStartedAdapter,
  createBreachRecoveryCompletedAdapter,
  createBreachPostEffectsStartedAdapter,
} from '@the-dmz/shared/game';

import { reduce, createInitialGameState } from '../../engine/reducer.js';

describe('Breach Event Sourcing', () => {
  const createTestState = (overrides?: Partial<GameState>): GameState => {
    const baseState = createInitialGameState(
      'test-session-id',
      'test-user-id',
      'test-tenant-id',
      12345,
    );
    return { ...baseState, ...overrides };
  };

  describe('BreachOccurredAdapter - Event to Action Mapping', () => {
    it('should map game.breach.occurred to TRIGGER_BREACH action (NOT PROCESS_THREATS)', () => {
      const registry = new EventAdapterRegistry();
      registry.register(createBreachOccurredAdapter());

      const eventData = {
        triggerType: 'accepted_phishing_email',
        severity: 3,
        isBreach: true,
        trustPenalty: -45,
      };

      const action = registry.toActionPayload(GAME_EVENT_TYPES.BREACH_OCCURRED, eventData);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('TRIGGER_BREACH');
    });

    it('should extract triggerType from breach.occurred event data', () => {
      const registry = new EventAdapterRegistry();
      registry.register(createBreachOccurredAdapter());

      const eventData = {
        triggerType: 'accepted_phishing_email',
        severity: 3,
        isBreach: true,
        trustPenalty: -45,
      };

      const action = registry.toActionPayload(GAME_EVENT_TYPES.BREACH_OCCURRED, eventData);

      expect(action).not.toBeNull();
      const typedAction = action as GameActionPayload & { triggerType?: string };
      expect(typedAction.triggerType).toBe('accepted_phishing_email');
    });
  });

  describe('Missing Breach Event Adapters', () => {
    let registry: EventAdapterRegistry;

    beforeEach(() => {
      registry = new EventAdapterRegistry();
      registry.register(createBreachOccurredAdapter());
      registry.register(createBreachRansomPaidAdapter());
      registry.register(createBreachRansomRefusedAdapter());
      registry.register(createBreachRecoveryStartedAdapter());
      registry.register(createBreachRecoveryCompletedAdapter());
      registry.register(createBreachPostEffectsStartedAdapter());
    });

    const breachEventTypes = [
      { type: GAME_EVENT_TYPES.BREACH_RANSOM_PAID, name: 'BREACH_RANSOM_PAID' },
      { type: GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED, name: 'BREACH_RANSOM_REFUSED' },
      { type: GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED, name: 'BREACH_RECOVERY_STARTED' },
      { type: GAME_EVENT_TYPES.BREACH_RECOVERY_COMPLETED, name: 'BREACH_RECOVERY_COMPLETED' },
      { type: GAME_EVENT_TYPES.BREACH_POST_EFFECTS_STARTED, name: 'BREACH_POST_EFFECTS_STARTED' },
    ] as const;

    breachEventTypes.forEach(({ type, name }) => {
      it(`should have adapter for ${name} that returns non-null action`, () => {
        const eventData = {};

        const action = registry.toActionPayload(type, eventData);

        expect(action).not.toBeNull();
        expect(action?.type).not.toBe('PROCESS_THREATS');
      });
    });

    it('should map BREACH_RANSOM_PAID to PAY_RANSOM action', () => {
      const registry = new EventAdapterRegistry();
      registry.register(createBreachRansomPaidAdapter());

      const eventData = {
        amount: 200,
        remainingFunds: 300,
      };

      const action = registry.toActionPayload(GAME_EVENT_TYPES.BREACH_RANSOM_PAID, eventData);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('PAY_RANSOM');
    });

    it('should map BREACH_RANSOM_REFUSED to REFUSE_RANSOM action', () => {
      const registry = new EventAdapterRegistry();
      registry.register(createBreachRansomRefusedAdapter());

      const eventData = {
        severity: 3,
      };

      const action = registry.toActionPayload(GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED, eventData);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('REFUSE_RANSOM');
    });

    it('should map BREACH_RECOVERY_STARTED to ADVANCE_RECOVERY action', () => {
      const registry = new EventAdapterRegistry();
      registry.register(createBreachRecoveryStartedAdapter());

      const eventData = {
        recoveryDays: 7,
      };

      const action = registry.toActionPayload(GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED, eventData);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('ADVANCE_RECOVERY');
    });
  });

  describe('Breach State Reconstruction from Events', () => {
    it('should reconstruct breach state after TRIGGER_BREACH action', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_THREAT_PROCESSING,
        currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
        trustScore: 100,
      });

      const triggerAction: GameActionPayload = {
        type: 'TRIGGER_BREACH',
        triggerType: 'accepted_phishing_email',
        severity: 3,
      };

      const result = reduce(state, triggerAction);

      expect(result.success).toBe(true);
      expect(result.newState.breachState.hasActiveBreach).toBe(true);
      expect(result.newState.breachState.currentSeverity).toBe(3);
      expect(result.newState.breachState.lastBreachDay).toBe(state.currentDay);
      expect(result.newState.breachState.postBreachEffectsActive).toBe(true);
    });

    it('should reconstruct breach state after PAY_RANSOM action', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 500,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3 as const,
          ransomAmount: 200,
          ransomDeadline: 5,
          recoveryDaysRemaining: 7,
          recoveryStartDay: 3,
          totalLifetimeEarningsAtBreach: 2000,
          lastBreachDay: 3,
          postBreachEffectsActive: true,
          revenueDepressionDaysRemaining: 30,
          increasedScrutinyDaysRemaining: 14,
          reputationImpactDaysRemaining: 30,
          toolsRequireReverification: false,
          intelligenceRevealed: [],
        },
      });

      const payAction: GameActionPayload = {
        type: 'PAY_RANSOM',
        amount: 200,
      };

      const result = reduce(state, payAction);

      expect(result.success).toBe(true);
      expect(result.newState.funds).toBe(300);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_RECOVERY);
    });

    it('should reconstruct state after REFUSE_RANSOM action (non-game-over severity)', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 100,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3 as const,
          ransomAmount: 500,
          ransomDeadline: 5,
          recoveryDaysRemaining: 7,
          recoveryStartDay: 3,
          totalLifetimeEarningsAtBreach: 5000,
          lastBreachDay: 3,
          postBreachEffectsActive: true,
          revenueDepressionDaysRemaining: 30,
          increasedScrutinyDaysRemaining: 14,
          reputationImpactDaysRemaining: 30,
          toolsRequireReverification: false,
          intelligenceRevealed: [],
        },
      });

      const refuseAction: GameActionPayload = {
        type: 'REFUSE_RANSOM',
      };

      const result = reduce(state, refuseAction);

      expect(result.success).toBe(true);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_RECOVERY);
    });

    it('should trigger game_over after REFUSE_RANSOM action (severity 4)', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 100,
        currentDay: 15,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 4 as const,
          ransomAmount: 500,
          ransomDeadline: 5,
          recoveryDaysRemaining: 7,
          recoveryStartDay: 10,
          totalLifetimeEarningsAtBreach: 5000,
          lastBreachDay: 10,
          postBreachEffectsActive: true,
          revenueDepressionDaysRemaining: 30,
          increasedScrutinyDaysRemaining: 14,
          reputationImpactDaysRemaining: 30,
          toolsRequireReverification: true,
          intelligenceRevealed: [],
        },
      });

      const refuseAction: GameActionPayload = {
        type: 'REFUSE_RANSOM',
      };

      const result = reduce(state, refuseAction);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_COMPLETED);
      expect(result.events.some((e) => e.eventType === 'game.session.game_over')).toBe(true);
    });

    it('should advance recovery and complete when recovery days reach 0', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        currentDay: 10,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3 as const,
          ransomAmount: null,
          ransomDeadline: null,
          recoveryDaysRemaining: 1,
          recoveryStartDay: 3,
          totalLifetimeEarningsAtBreach: 2000,
          lastBreachDay: 3,
          postBreachEffectsActive: true,
          revenueDepressionDaysRemaining: 30,
          increasedScrutinyDaysRemaining: 14,
          reputationImpactDaysRemaining: 30,
          toolsRequireReverification: false,
          intelligenceRevealed: [],
        },
      });

      const advanceAction: GameActionPayload = {
        type: 'ADVANCE_RECOVERY',
      };

      const result = reduce(state, advanceAction);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ACTIVE);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_RESOURCE_MANAGEMENT);
      expect(result.events.some((e) => e.eventType === 'game.breach.recovery_completed')).toBe(
        true,
      );
      expect(result.events.some((e) => e.eventType === 'game.breach.post_effects_started')).toBe(
        true,
      );
    });
  });

  describe('Full Breach Event Replay Sequence', () => {
    it('should produce deterministic breach state from event sequence', () => {
      const runReplay = (): {
        breachState: BreachState;
        funds: number;
        phase: string;
      } => {
        let state = createTestState({
          currentPhase: DAY_PHASES.PHASE_DAY_START,
          currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
          funds: 1000,
        });

        const actions: GameActionPayload[] = [
          { type: 'ACK_DAY_START' },
          { type: 'ACK_DAY_START' },
          { type: 'ACK_DAY_START' },
        ];

        for (const action of actions) {
          const result = reduce(state, action);
          if (result.success) {
            state = result.newState;
          }
        }

        state = {
          ...state,
          currentPhase: DAY_PHASES.PHASE_THREAT_PROCESSING,
        };

        const breachResult = reduce(state, {
          type: 'TRIGGER_BREACH',
          triggerType: 'accepted_phishing_email',
          severity: 3,
        });

        expect(breachResult.success).toBe(true);
        state = breachResult.newState;

        expect(state.breachState.hasActiveBreach).toBe(true);
        expect(state.breachState.currentSeverity).toBe(3);

        const ransomAmount = state.breachState.ransomAmount;
        expect(ransomAmount).not.toBeNull();

        const payResult = reduce(state, {
          type: 'PAY_RANSOM',
          amount: ransomAmount!,
        });

        expect(payResult.success).toBe(true);
        state = payResult.newState;

        return {
          breachState: state.breachState,
          funds: state.funds,
          phase: state.currentPhase,
        };
      };

      const result1 = runReplay();
      const result2 = runReplay();

      expect(result1.breachState.hasActiveBreach).toBe(result2.breachState.hasActiveBreach);
      expect(result1.breachState.currentSeverity).toBe(result2.breachState.currentSeverity);
      expect(result1.breachState.recoveryDaysRemaining).toBe(
        result2.breachState.recoveryDaysRemaining,
      );
      expect(result1.funds).toBe(result2.funds);
    });

    it('should emit breach events that can be used for replay', () => {
      let state = createTestState({
        currentPhase: DAY_PHASES.PHASE_THREAT_PROCESSING,
        currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
        funds: 1000,
        analyticsState: {
          totalEmailsProcessed: 0,
          totalDecisions: 0,
          approvals: 0,
          denials: 0,
          flags: 0,
          verificationsRequested: 0,
          incidentsTriggered: 0,
          breaches: 0,
        },
      });

      const triggerResult = reduce(state, {
        type: 'TRIGGER_BREACH',
        triggerType: 'accepted_phishing_email',
        severity: 3,
      });

      expect(triggerResult.success).toBe(true);
      state = triggerResult.newState;

      const breachOccurredEvent = triggerResult.events.find(
        (e) => e.eventType === 'game.breach.occurred',
      );
      expect(breachOccurredEvent).toBeDefined();

      const ransomAmount = state.breachState.ransomAmount;
      expect(ransomAmount).not.toBeNull();

      const payResult = reduce(state, {
        type: 'PAY_RANSOM',
        amount: ransomAmount!,
      });

      expect(payResult.success).toBe(true);
      state = payResult.newState;

      const recoveryStartEvent = payResult.events.find(
        (e) => e.eventType === 'game.breach.recovery_started',
      );
      expect(recoveryStartEvent).toBeDefined();
      expect(recoveryStartEvent?.payload).toHaveProperty('recoveryDays');
    });
  });

  describe('Post-Breach Effects During Recovery', () => {
    it('should decay recovery days during ADVANCE_RECOVERY', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        currentDay: 10,
        breachState: {
          hasActiveBreach: false,
          currentSeverity: 3 as const,
          ransomAmount: null,
          ransomDeadline: null,
          recoveryDaysRemaining: 5,
          recoveryStartDay: 3,
          totalLifetimeEarningsAtBreach: 2000,
          lastBreachDay: 3,
          postBreachEffectsActive: true,
          revenueDepressionDaysRemaining: 30,
          increasedScrutinyDaysRemaining: 14,
          reputationImpactDaysRemaining: 30,
          toolsRequireReverification: false,
          intelligenceRevealed: [],
        },
      });

      const advanceAction: GameActionPayload = {
        type: 'ADVANCE_RECOVERY',
      };

      const result = reduce(state, advanceAction);

      expect(result.success).toBe(true);
      expect(result.newState.breachState.recoveryDaysRemaining).toBe(4);
    });

    it('should activate post-breach effects when recovery completes', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        currentDay: 10,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3 as const,
          ransomAmount: null,
          ransomDeadline: null,
          recoveryDaysRemaining: 1,
          recoveryStartDay: 3,
          totalLifetimeEarningsAtBreach: 2000,
          lastBreachDay: 3,
          postBreachEffectsActive: false,
          revenueDepressionDaysRemaining: null,
          increasedScrutinyDaysRemaining: null,
          reputationImpactDaysRemaining: null,
          toolsRequireReverification: false,
          intelligenceRevealed: [],
        },
      });

      const advanceAction: GameActionPayload = {
        type: 'ADVANCE_RECOVERY',
      };

      const result = reduce(state, advanceAction);

      expect(result.success).toBe(true);
      expect(result.newState.breachState.postBreachEffectsActive).toBe(true);
      expect(result.newState.breachState.revenueDepressionDaysRemaining).toBe(30);
      expect(result.newState.breachState.increasedScrutinyDaysRemaining).toBe(14);
      expect(result.newState.breachState.reputationImpactDaysRemaining).toBe(30);
    });
  });

  describe('Event Replay with Breach Events', () => {
    it('should replay BREACH_OCCURRED event and reconstruct breach state', () => {
      const registry = new EventAdapterRegistry();
      registry.register(createBreachOccurredAdapter());

      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_THREAT_PROCESSING,
        currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
      });

      const eventData = {
        triggerType: 'accepted_phishing_email',
        severity: 3,
        isBreach: true,
        trustPenalty: -45,
      };

      const action = registry.toActionPayload(GAME_EVENT_TYPES.BREACH_OCCURRED, eventData);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('TRIGGER_BREACH');

      const result = reduce(state, action!);
      expect(result.success).toBe(true);
      expect(result.newState.breachState.hasActiveBreach).toBe(true);
    });

    it('should replay BREACH_RANSOM_PAID event and update funds', () => {
      const registry = new EventAdapterRegistry();
      registry.register(createBreachRansomPaidAdapter());

      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 500,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3 as const,
          ransomAmount: 200,
          ransomDeadline: 5,
          recoveryDaysRemaining: 7,
          recoveryStartDay: 3,
          totalLifetimeEarningsAtBreach: 2000,
          lastBreachDay: 3,
          postBreachEffectsActive: true,
          revenueDepressionDaysRemaining: 30,
          increasedScrutinyDaysRemaining: 14,
          reputationImpactDaysRemaining: 30,
          toolsRequireReverification: false,
          intelligenceRevealed: [],
        },
      });

      const eventData = {
        amount: 200,
        remainingFunds: 300,
      };

      const action = registry.toActionPayload(GAME_EVENT_TYPES.BREACH_RANSOM_PAID, eventData);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('PAY_RANSOM');

      const result = reduce(state, action!);
      expect(result.success).toBe(true);
      expect(result.newState.funds).toBe(300);
    });
  });
});
