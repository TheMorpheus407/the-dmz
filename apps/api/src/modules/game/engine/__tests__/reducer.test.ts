import { describe, it, expect } from 'vitest';

import { SESSION_MACRO_STATES, DAY_PHASES, type GameState } from '@the-dmz/shared';

import {
  createInitialGameState,
  reduce,
  transitionPhase,
  transitionMacroState,
} from '../reducer.js';

const createTestState = (overrides?: Partial<GameState>): GameState => {
  const baseState: GameState = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    seed: 12345,
    currentDay: 1,
    currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
    currentPhase: DAY_PHASES.PHASE_DAY_START,
    funds: 1000,
    trustScore: 100,
    intelFragments: 0,
    playerLevel: 1,
    playerXP: 0,
    threatTier: 'low',
    facilityTier: 'outpost',
    inbox: [],
    incidents: [],
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

  return { ...baseState, ...overrides };
};

describe('createInitialGameState', () => {
  it('should create initial state with default values', () => {
    const state = createInitialGameState('session-1', 'user-1', 'tenant-1');

    expect(state.sessionId).toBe('session-1');
    expect(state.userId).toBe('user-1');
    expect(state.tenantId).toBe('tenant-1');
    expect(state.currentDay).toBe(1);
    expect(state.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_INIT);
    expect(state.currentPhase).toBe(DAY_PHASES.PHASE_DAY_START);
    expect(state.funds).toBe(1000);
    expect(state.trustScore).toBe(100);
    expect(state.threatTier).toBe('low');
    expect(state.facilityTier).toBe('outpost');
  });

  it('should use provided seed', () => {
    const state = createInitialGameState('session-1', 'user-1', 'tenant-1', 99999);
    expect(state.seed).toBe(99999);
  });
});

describe('reduce - ACK_DAY_START', () => {
  it('should transition from PHASE_DAY_START to PHASE_EMAIL_INTAKE', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });
    const action = { type: 'ACK_DAY_START' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_EMAIL_INTAKE);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.day.started');
  });

  it('should fail if ACK_DAY_START not in correct phase', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
    const action = { type: 'ACK_DAY_START' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('reduce - SUBMIT_DECISION', () => {
  it('should update email status when decision is submitted', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      inbox: [
        {
          emailId: 'email-1',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
    });

    const action = {
      type: 'SUBMIT_DECISION' as const,
      emailId: 'email-1',
      decision: 'approve' as const,
      timeSpentMs: 5000,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.inbox[0]?.status).toBe('approved');
    expect(result.newState.analyticsState.totalDecisions).toBe(1);
    expect(result.newState.analyticsState.approvals).toBe(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.email.decision_submitted');
  });

  it('should increment denials counter', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      inbox: [
        {
          emailId: 'email-1',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
    });

    const action = {
      type: 'SUBMIT_DECISION' as const,
      emailId: 'email-1',
      decision: 'deny' as const,
      timeSpentMs: 3000,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.analyticsState.denials).toBe(1);
  });

  it('should fail if action not allowed in phase', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });
    const action = {
      type: 'SUBMIT_DECISION' as const,
      emailId: 'email-1',
      decision: 'approve' as const,
      timeSpentMs: 5000,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
  });
});

describe('reduce - MARK_INDICATOR', () => {
  it('should add indicator to email', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      inbox: [
        {
          emailId: 'email-1',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
    });

    const action = {
      type: 'MARK_INDICATOR' as const,
      emailId: 'email-1',
      indicatorType: 'suspicious_link',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.inbox[0]?.indicators).toContain('suspicious_link');
  });
});

describe('reduce - REQUEST_VERIFICATION', () => {
  it('should mark email as verification requested', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      inbox: [
        {
          emailId: 'email-1',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
    });

    const action = {
      type: 'REQUEST_VERIFICATION' as const,
      emailId: 'email-1',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.inbox[0]?.verificationRequested).toBe(true);
    expect(result.newState.inbox[0]?.status).toBe('request_verification');
    expect(result.newState.analyticsState.verificationsRequested).toBe(1);
  });
});

describe('reduce - ADVANCE_DAY', () => {
  it('should increment day and reset to PHASE_DAY_START', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_END,
      currentDay: 5,
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentDay).toBe(6);
    expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_DAY_START);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.eventType).toBe('game.day.ended');
    expect(result.events[1]?.eventType).toBe('game.day.started');
  });

  it('should clear inbox when advancing day', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_END,
      inbox: [
        {
          emailId: 'email-1',
          status: 'approved',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 1000,
        },
      ],
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.inbox).toHaveLength(0);
  });
});

describe('reduce - PAUSE_SESSION', () => {
  it('should transition to SESSION_PAUSED', () => {
    const state = createTestState({
      currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
    });

    const action = { type: 'PAUSE_SESSION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_PAUSED);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.session.paused');
  });

  it('should fail if cannot pause from current state', () => {
    const state = createTestState({
      currentMacroState: SESSION_MACRO_STATES.SESSION_COMPLETED,
    });

    const action = { type: 'PAUSE_SESSION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
  });
});

describe('reduce - RESUME_SESSION', () => {
  it('should transition from SESSION_PAUSED to SESSION_ACTIVE', () => {
    const state = createTestState({
      currentMacroState: SESSION_MACRO_STATES.SESSION_PAUSED,
    });

    const action = { type: 'RESUME_SESSION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ACTIVE);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.session.resumed');
  });
});

describe('reduce - ABANDON_SESSION', () => {
  it('should transition to SESSION_ABANDONED', () => {
    const state = createTestState({
      currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
    });

    const action = { type: 'ABANDON_SESSION' as const, reason: 'User quit' };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ABANDONED);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.session.abandoned');
  });
});

describe('reduce - PROCESS_THREATS', () => {
  it('should generate threats event', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_THREAT_PROCESSING,
      currentDay: 3,
    });

    const action = {
      type: 'PROCESS_THREATS' as const,
      dayNumber: 3,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.threats.generated');
  });
});

describe('reduce - RESOLVE_INCIDENT', () => {
  it('should resolve incident', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_INCIDENT_RESPONSE,
      incidents: [
        {
          incidentId: 'incident-1',
          status: 'active',
          severity: 5,
          type: 'phishing',
          createdDay: 1,
          responseActions: [],
        },
      ],
    });

    const action = {
      type: 'RESOLVE_INCIDENT' as const,
      incidentId: 'incident-1',
      responseActions: ['containment', 'eradication'],
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.incidents[0]?.status).toBe('resolved');
    expect(result.newState.incidents[0]?.resolvedDay).toBe(1);
    expect(result.newState.incidents[0]?.responseActions).toContain('containment');
  });
});

describe('reduce - PURCHASE_UPGRADE', () => {
  it('should create upgrade purchased event', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_UPGRADE,
    });

    const action = {
      type: 'PURCHASE_UPGRADE' as const,
      upgradeId: 'firewall-v2',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.upgrade.purchased');
  });
});

describe('reduce - ADJUST_RESOURCE', () => {
  it('should create resource adjusted event', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
    });

    const action = {
      type: 'ADJUST_RESOURCE' as const,
      resourceId: 'bandwidth',
      delta: -10,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('game.resource.adjusted');
  });
});

describe('transitionPhase', () => {
  it('should transition to new phase', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });

    const result = transitionPhase(state, DAY_PHASES.PHASE_EMAIL_INTAKE);

    expect(result.success).toBe(true);
    expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_EMAIL_INTAKE);
  });

  it('should fail on invalid transition', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });

    const result = transitionPhase(state, DAY_PHASES.PHASE_TRIAGE);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('transitionMacroState', () => {
  it('should transition to new macro state', () => {
    const state = createTestState({ currentMacroState: SESSION_MACRO_STATES.SESSION_INIT });

    const result = transitionMacroState(state, SESSION_MACRO_STATES.SESSION_ACTIVE);

    expect(result.success).toBe(true);
    expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ACTIVE);
  });

  it('should fail on invalid transition', () => {
    const state = createTestState({ currentMacroState: SESSION_MACRO_STATES.SESSION_COMPLETED });

    const result = transitionMacroState(state, SESSION_MACRO_STATES.SESSION_ACTIVE);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('sequence number', () => {
  it('should increment sequence number on each action', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START, sequenceNumber: 0 });

    const action = { type: 'ACK_DAY_START' as const };
    const result = reduce(state, action);

    expect(result.newState.sequenceNumber).toBe(1);
  });
});
