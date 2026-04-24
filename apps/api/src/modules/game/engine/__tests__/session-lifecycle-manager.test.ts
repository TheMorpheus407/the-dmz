import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { GameState } from '@the-dmz/shared';

import { SessionLifecycleManager } from '../session-lifecycle-manager.js';
import { GameEventMapper } from '../game-event-mapper.js';
import { GAME_ENGINE_EVENTS } from '../engine.events.js';
import { GameStateMachineError } from '../state-machine.js';

import type { EventBus } from '../../../../shared/events/event-types.js';

const mockedTransitionMacroState = vi.fn();
const mockedTransitionPhase = vi.fn();

vi.mock('./reducer.js', async () => {
  const actual = await vi.importActual('./reducer.js');
  return {
    ...actual,
    transitionMacroState: mockedTransitionMacroState,
    transitionPhase: mockedTransitionPhase,
  };
});

describe('SessionLifecycleManager', () => {
  let mockEventBus: EventBus;
  let eventMapper: GameEventMapper;
  let sessionManager: SessionLifecycleManager;

  const createTestState = (overrides: Partial<GameState> = {}): GameState => {
    const base: GameState = {
      sessionId: 'test-session-123',
      userId: 'test-user-456',
      tenantId: 'test-tenant-789',
      seed: 12345,
      currentDay: 1,
      currentMacroState: 'SESSION_ACTIVE',
      currentPhase: 'PHASE_DAY_START',
      funds: 1000,
      trustScore: 50,
      intelFragments: 0,
      playerLevel: 1,
      playerXP: 0,
      threatTier: 'low',
      facilityTier: 'outpost',
      facility: {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 10,
          coolingCapacityTons: 5,
          bandwidthCapacityMbps: 100,
        },
        usage: {
          rackUsedU: 0,
          powerUsedKw: 0,
          coolingUsedTons: 0,
          bandwidthUsedMbps: 0,
        },
        clients: [],
        upgrades: [],
        maintenanceDebt: 0,
        facilityHealth: 100,
        operatingCostPerDay: 50,
        securityToolOpExPerDay: 0,
        attackSurfaceScore: 10,
        lastTickDay: 1,
      },
      inbox: [],
      emailInstances: {},
      verificationPackets: {},
      incidents: [],
      threats: [],
      breachState: {
        hasActiveBreach: false,
        currentSeverity: null,
        ransomAmount: null,
        ransomDeadline: null,
        recoveryDaysRemaining: null,
        recoveryStartDay: null,
        totalLifetimeEarningsAtBreach: null,
        lastBreachDay: null,
        postBreachEffectsActive: false,
        revenueDepressionDaysRemaining: null,
        increasedScrutinyDaysRemaining: null,
        reputationImpactDaysRemaining: null,
        toolsRequireReverification: false,
        intelligenceRevealed: [],
      },
      narrativeState: {
        currentChapter: 1,
        activeTriggers: [],
        completedEvents: [],
      },
      factionRelations: {
        sovereign_compact: 50,
        nexion_industries: 50,
        librarians: 50,
        hacktivists: 50,
        criminals: 50,
      },
      blacklist: [],
      whitelist: [],
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
      sequenceNumber: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...base, ...overrides };
  };

  beforeEach(() => {
    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    eventMapper = new GameEventMapper();
    sessionManager = new SessionLifecycleManager(eventMapper, mockEventBus);
    vi.clearAllMocks();
  });

  describe('pauseSession', () => {
    it('pauses an active session successfully', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_PAUSED' },
        events: [],
      });

      const result = sessionManager.pauseSession(state);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe('SESSION_PAUSED');
      expect(result.events).toHaveLength(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('fails when session is not active', () => {
      const state = createTestState({ currentMacroState: 'SESSION_PAUSED' });

      const result = sessionManager.pauseSession(state);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot pause session in current state');
      expect(result.events).toHaveLength(0);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('returns correct events when eventBus is undefined', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_PAUSED' },
        events: [],
      });

      const managerWithoutBus = new SessionLifecycleManager(eventMapper, undefined);
      const result = managerWithoutBus.pauseSession(state);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as { eventType: string; payload: { sessionId: string } };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_PAUSED);
      expect(event.payload.sessionId).toBe('test-session-123');
    });
  });

  describe('resumeSession', () => {
    it('resumes a paused session successfully', () => {
      const state = createTestState({ currentMacroState: 'SESSION_PAUSED' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_ACTIVE' },
        events: [],
      });

      const result = sessionManager.resumeSession(state);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe('SESSION_ACTIVE');
      expect(result.events).toHaveLength(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('fails when session is not paused', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });

      const result = sessionManager.resumeSession(state);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot resume session in current state');
      expect(result.events).toHaveLength(0);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('returns correct events when eventBus is undefined', () => {
      const state = createTestState({ currentMacroState: 'SESSION_PAUSED' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_ACTIVE' },
        events: [],
      });

      const managerWithoutBus = new SessionLifecycleManager(eventMapper, undefined);
      const result = managerWithoutBus.resumeSession(state);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as { eventType: string; payload: { sessionId: string } };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_RESUMED);
      expect(event.payload.sessionId).toBe('test-session-123');
    });
  });

  describe('completeSession', () => {
    it('completes an active session successfully', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_COMPLETED' },
        events: [],
      });

      const result = sessionManager.completeSession(state, 'Player finished');

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe('SESSION_COMPLETED');
      expect(result.events).toHaveLength(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('fails when session is not active', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ABANDONED' });

      const result = sessionManager.completeSession(state, 'Player finished');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot complete session in current state');
      expect(result.events).toHaveLength(0);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('returns correct events when eventBus is undefined', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_COMPLETED' },
        events: [],
      });

      const managerWithoutBus = new SessionLifecycleManager(eventMapper, undefined);
      const result = managerWithoutBus.completeSession(state, 'Player finished');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as {
        eventType: string;
        payload: { sessionId: string; reason: string };
      };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_COMPLETED);
      expect(event.payload.sessionId).toBe('test-session-123');
      expect(event.payload.reason).toBe('Player finished');
    });
  });

  describe('abandonSession', () => {
    it('abandons an active session successfully', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_ABANDONED' },
        events: [],
      });

      const result = sessionManager.abandonSession(state, 'Player quit');

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe('SESSION_ABANDONED');
      expect(result.events).toHaveLength(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('fails when session is not active', () => {
      const state = createTestState({ currentMacroState: 'SESSION_COMPLETED' });

      const result = sessionManager.abandonSession(state, 'Player quit');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot abandon session in current state');
      expect(result.events).toHaveLength(0);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('returns correct events when eventBus is undefined', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_ABANDONED' },
        events: [],
      });

      const managerWithoutBus = new SessionLifecycleManager(eventMapper, undefined);
      const result = managerWithoutBus.abandonSession(state, 'Player quit');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as {
        eventType: string;
        payload: { sessionId: string; reason: string };
      };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_ABANDONED);
      expect(event.payload.sessionId).toBe('test-session-123');
      expect(event.payload.reason).toBe('Player quit');
    });
  });

  describe('transitionToPhase', () => {
    it('transitions phase successfully', () => {
      const state = createTestState({ currentPhase: 'PHASE_DAY_START' });
      mockedTransitionPhase.mockReturnValue({
        success: true,
        newState: { ...state, currentPhase: 'PHASE_EMAIL_INTAKE' },
        events: [],
      });

      const result = sessionManager.transitionToPhase(state, 'PHASE_EMAIL_INTAKE');

      expect(result.success).toBe(true);
      expect(result.newState.currentPhase).toBe('PHASE_EMAIL_INTAKE');
      expect(result.events).toHaveLength(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('returns correct events when eventBus is undefined', () => {
      const state = createTestState({ currentPhase: 'PHASE_DAY_START' });
      mockedTransitionPhase.mockReturnValue({
        success: true,
        newState: { ...state, currentPhase: 'PHASE_EMAIL_INTAKE' },
        events: [],
      });

      const managerWithoutBus = new SessionLifecycleManager(eventMapper, undefined);
      const result = managerWithoutBus.transitionToPhase(state, 'PHASE_EMAIL_INTAKE');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as {
        eventType: string;
        payload: { sessionId: string; oldPhase: string; newPhase: string };
      };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED);
      expect(event.payload.sessionId).toBe('test-session-123');
      expect(event.payload.oldPhase).toBe('PHASE_DAY_START');
      expect(event.payload.newPhase).toBe('PHASE_EMAIL_INTAKE');
    });

    it('returns failure when reducer returns success false', () => {
      const state = createTestState({ currentPhase: 'PHASE_DAY_START' });
      mockedTransitionPhase.mockReturnValue({
        success: false,
        newState: state,
        events: [],
        error: new GameStateMachineError('Invalid phase transition', 'INVALID_PHASE_TRANSITION'),
      });

      const result = sessionManager.transitionToPhase(state, 'PHASE_INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phase transition');
      expect(result.events).toHaveLength(0);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle methods with malformed reducer events', () => {
    it('pauseSession returns explicit event even when reducer returns malformed events', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_PAUSED' },
        events: [{ eventId: 'bad-event', eventType: '', timestamp: '', payload: {} }],
      });

      const result = sessionManager.pauseSession(state);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as { eventType: string };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_PAUSED);
    });

    it('resumeSession returns explicit event even when reducer returns malformed events', () => {
      const state = createTestState({ currentMacroState: 'SESSION_PAUSED' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_ACTIVE' },
        events: [{ eventId: 'bad-event', eventType: 'unknown.event', timestamp: '', payload: {} }],
      });

      const result = sessionManager.resumeSession(state);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as { eventType: string };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_RESUMED);
    });

    it('completeSession returns explicit event even when reducer returns empty events', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_COMPLETED' },
        events: [],
      });

      const result = sessionManager.completeSession(state, 'finished');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as { eventType: string; payload: { reason: string } };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_COMPLETED);
      expect(event.payload.reason).toBe('finished');
    });

    it('abandonSession returns explicit event even when reducer returns malformed events', () => {
      const state = createTestState({ currentMacroState: 'SESSION_ACTIVE' });
      mockedTransitionMacroState.mockReturnValue({
        success: true,
        newState: { ...state, currentMacroState: 'SESSION_ABANDONED' },
        events: [{ eventId: 'malformed', eventType: 'malformed.type', timestamp: '', payload: {} }],
      });

      const result = sessionManager.abandonSession(state, 'player quit');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const event = result.events[0] as { eventType: string; payload: { reason: string } };
      expect(event.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_ABANDONED);
      expect(event.payload.reason).toBe('player quit');
    });
  });

  describe('validation methods', () => {
    it('validates macro state transitions correctly', () => {
      const state = createTestState({ currentMacroState: 'SESSION_INIT' });
      const manager = new SessionLifecycleManager(eventMapper, undefined);

      const result = manager.pauseSession(state);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot pause session in current state');
    });

    it('validates phase transitions correctly', () => {
      const state = createTestState({ currentPhase: 'PHASE_DAY_START' });
      const manager = new SessionLifecycleManager(eventMapper, undefined);

      const result = manager.transitionToPhase(state, 'PHASE_UPGRADE');

      expect(result.success).toBe(false);
    });
  });
});
