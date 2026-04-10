import { describe, it, expect } from 'vitest';

import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  createInitialBreachState,
} from '@the-dmz/shared';

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
    breachState: createInitialBreachState(),
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
    expect(state.trustScore).toBe(50);
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

  it('should apply trust and funds consequences when email instance exists', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      trustScore: 50,
      funds: 1000,
      inbox: [
        {
          emailId: 'email-1',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
      emailInstances: {
        'email-1': {
          emailId: 'email-1',
          sessionId: 'test',
          dayNumber: 1,
          difficulty: 3,
          intent: 'malicious',
          technique: 'phishing',
          threatTier: 'low',
          faction: 'criminals',
          sender: {
            displayName: 'Test',
            emailAddress: 'test@test.com',
            domain: 'test.com',
            jobRole: 'Test',
            organization: 'Test',
            relationshipHistory: 5,
          },
          headers: {
            messageId: 'test',
            returnPath: 'test',
            received: [],
            spfResult: 'pass',
            dkimResult: 'pass',
            dmarcResult: 'pass',
            originalDate: new Date().toISOString(),
            subject: 'Test',
          },
          body: { preview: 'test', fullBody: 'test', embeddedLinks: [] },
          attachments: [],
          accessRequest: {
            applicantName: 'Test',
            applicantRole: 'Test',
            organization: 'Test',
            requestedAssets: [],
            requestedServices: [],
            justification: 'test',
            urgency: 'medium',
            value: 100,
          },
          indicators: [],
          groundTruth: {
            isMalicious: true,
            correctDecision: 'deny',
            riskScore: 80,
            explanation: 'test',
            consequences: {
              approved: {
                trustImpact: -20,
                fundsImpact: -500,
                factionImpact: -5,
                threatImpact: 10,
              },
              denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
              flagged: { trustImpact: 2, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
              deferred: { trustImpact: -3, fundsImpact: -50, factionImpact: 0, threatImpact: 2 },
            },
          },
          createdAt: new Date().toISOString(),
        },
      },
    });

    const action = {
      type: 'SUBMIT_DECISION' as const,
      emailId: 'email-1',
      decision: 'approve' as const,
      timeSpentMs: 30000,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.trustScore).toBeLessThan(50);
    expect(result.newState.funds).toBeLessThan(1000);
    const decisionEvent = result.events.find(
      (e) => e.eventType === 'game.email.decision_evaluated',
    );
    expect(decisionEvent).toBeDefined();
    expect(decisionEvent?.payload).toHaveProperty('isCorrect', false);
  });

  it('should increment trust for correct decision', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      trustScore: 50,
      funds: 1000,
      inbox: [
        {
          emailId: 'email-1',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
      emailInstances: {
        'email-1': {
          emailId: 'email-1',
          sessionId: 'test',
          dayNumber: 1,
          difficulty: 3,
          intent: 'malicious',
          technique: 'phishing',
          threatTier: 'low',
          faction: 'criminals',
          sender: {
            displayName: 'Test',
            emailAddress: 'test@test.com',
            domain: 'test.com',
            jobRole: 'Test',
            organization: 'Test',
            relationshipHistory: 5,
          },
          headers: {
            messageId: 'test',
            returnPath: 'test',
            received: [],
            spfResult: 'pass',
            dkimResult: 'pass',
            dmarcResult: 'pass',
            originalDate: new Date().toISOString(),
            subject: 'Test',
          },
          body: { preview: 'test', fullBody: 'test', embeddedLinks: [] },
          attachments: [],
          accessRequest: {
            applicantName: 'Test',
            applicantRole: 'Test',
            organization: 'Test',
            requestedAssets: [],
            requestedServices: [],
            justification: 'test',
            urgency: 'medium',
            value: 100,
          },
          indicators: [],
          groundTruth: {
            isMalicious: true,
            correctDecision: 'deny',
            riskScore: 80,
            explanation: 'test',
            consequences: {
              approved: {
                trustImpact: -20,
                fundsImpact: -500,
                factionImpact: -5,
                threatImpact: 10,
              },
              denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
              flagged: { trustImpact: 2, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
              deferred: { trustImpact: -3, fundsImpact: -50, factionImpact: 0, threatImpact: 2 },
            },
          },
          createdAt: new Date().toISOString(),
        },
      },
    });

    const action = {
      type: 'SUBMIT_DECISION' as const,
      emailId: 'email-1',
      decision: 'deny' as const,
      timeSpentMs: 30000,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.trustScore).toBeGreaterThan(50);
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

  it('should clear processed emails when advancing day', () => {
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

  it('should carry deferred emails to next day', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_END,
      inbox: [
        {
          emailId: 'email-1',
          status: 'deferred',
          indicators: ['suspicious_link'],
          verificationRequested: false,
          timeSpentMs: 5000,
        },
      ],
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.inbox).toHaveLength(1);
    expect(result.newState.inbox[0]?.emailId).toBe('email-1');
    expect(result.newState.inbox[0]?.status).toBe('pending');
    expect(result.newState.inbox[0]?.timeSpentMs).toBe(0);
  });

  it('should only keep deferred emails, remove processed ones', () => {
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
        {
          emailId: 'email-2',
          status: 'denied',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 2000,
        },
        {
          emailId: 'email-3',
          status: 'deferred',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 3000,
        },
      ],
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.inbox).toHaveLength(1);
    expect(result.newState.inbox[0]?.emailId).toBe('email-3');
  });

  it('should emit events with deferred email count', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_END,
      inbox: [
        {
          emailId: 'email-1',
          status: 'deferred',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 1000,
        },
      ],
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.payload).toEqual({
      day: 1,
      emailsProcessed: 0,
      emailsDeferred: 1,
    });
    expect(result.events[1]?.payload).toEqual({
      day: 2,
      deferredEmailsCarried: 1,
    });
  });

  it('should decay post-breach effects when postBreachEffectsActive is true', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_END,
      currentDay: 5,
      breachState: {
        hasActiveBreach: false,
        currentSeverity: 3,
        ransomAmount: null,
        ransomDeadline: null,
        recoveryDaysRemaining: null,
        recoveryStartDay: null,
        totalLifetimeEarningsAtBreach: null,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 5,
        increasedScrutinyDaysRemaining: 3,
        reputationImpactDaysRemaining: 10,
        toolsRequireReverification: false,
        intelligenceRevealed: [],
      },
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentDay).toBe(6);
    expect(result.newState.breachState.revenueDepressionDaysRemaining).toBe(4);
    expect(result.newState.breachState.increasedScrutinyDaysRemaining).toBe(2);
    expect(result.newState.breachState.reputationImpactDaysRemaining).toBe(9);
  });

  it('should set postBreachEffectsActive to false when all effect days reach zero', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_END,
      currentDay: 5,
      breachState: {
        hasActiveBreach: false,
        currentSeverity: 3,
        ransomAmount: null,
        ransomDeadline: null,
        recoveryDaysRemaining: null,
        recoveryStartDay: null,
        totalLifetimeEarningsAtBreach: null,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 1,
        increasedScrutinyDaysRemaining: 1,
        reputationImpactDaysRemaining: 1,
        toolsRequireReverification: false,
        intelligenceRevealed: [],
      },
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.breachState.revenueDepressionDaysRemaining).toBe(0);
    expect(result.newState.breachState.increasedScrutinyDaysRemaining).toBe(0);
    expect(result.newState.breachState.reputationImpactDaysRemaining).toBe(0);
    expect(result.newState.breachState.postBreachEffectsActive).toBe(false);
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

describe('reduce - ONBOARD_CLIENT', () => {
  it('should onboard a new client and update facility usage', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
    });
    const action = {
      type: 'ONBOARD_CLIENT' as const,
      clientId: 'client-1',
      clientName: 'Acme Corp',
      organization: 'Acme',
      rackUnitsU: 10,
      powerKw: 2,
      coolingTons: 1,
      bandwidthMbps: 50,
      dailyRate: 100,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facility.usage.rackUsedU).toBe(10);
    expect(result.newState.facility.usage.powerUsedKw).toBe(2);
    expect(result.newState.facility.usage.coolingUsedTons).toBe(1);
    expect(result.newState.facility.usage.bandwidthUsedMbps).toBe(50);
    expect(result.newState.facility.clients).toHaveLength(1);
    expect(result.newState.facility.clients[0]?.clientName).toBe('Acme Corp');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('facility.client.onboarded');
  });

  it('should fail if not in RESOURCE_MANAGEMENT phase', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });
    const action = {
      type: 'ONBOARD_CLIENT' as const,
      clientId: 'client-1',
      clientName: 'Acme Corp',
      organization: 'Acme',
      rackUnitsU: 10,
      powerKw: 2,
      coolingTons: 1,
      bandwidthMbps: 50,
      dailyRate: 100,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should fail if adding client exceeds 100% rack capacity', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      facility: {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 10,
          coolingCapacityTons: 5,
          bandwidthCapacityMbps: 100,
        },
        usage: {
          rackUsedU: 40,
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
    });
    const action = {
      type: 'ONBOARD_CLIENT' as const,
      clientId: 'client-1',
      clientName: 'Acme Corp',
      organization: 'Acme',
      rackUnitsU: 10,
      powerKw: 0,
      coolingTons: 0,
      bandwidthMbps: 0,
      dailyRate: 100,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Capacity exceeded');
    expect(result.error?.message).toContain('rack');
  });

  it('should fail if adding client exceeds 100% power capacity', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
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
          powerUsedKw: 9,
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
    });
    const action = {
      type: 'ONBOARD_CLIENT' as const,
      clientId: 'client-1',
      clientName: 'Acme Corp',
      organization: 'Acme',
      rackUnitsU: 0,
      powerKw: 5,
      coolingTons: 0,
      bandwidthMbps: 0,
      dailyRate: 100,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Capacity exceeded');
    expect(result.error?.message).toContain('power');
  });
});

describe('reduce - EVICT_CLIENT', () => {
  it('should evict a client and free resources', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      facility: {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 10,
          coolingCapacityTons: 5,
          bandwidthCapacityMbps: 100,
        },
        usage: {
          rackUsedU: 10,
          powerUsedKw: 2,
          coolingUsedTons: 1,
          bandwidthUsedMbps: 50,
        },
        clients: [
          {
            clientId: 'client-1',
            clientName: 'Acme Corp',
            organization: 'Acme',
            rackUnitsU: 10,
            powerKw: 2,
            coolingTons: 1,
            bandwidthMbps: 50,
            dailyRate: 100,
            leaseStartDay: 1,
            leaseEndDay: null,
            isActive: true,
            burstProfile: 'steady',
          },
        ],
        upgrades: [],
        maintenanceDebt: 0,
        facilityHealth: 100,
        operatingCostPerDay: 50,
        securityToolOpExPerDay: 0,
        attackSurfaceScore: 10,
        lastTickDay: 1,
      },
    });
    const action = {
      type: 'EVICT_CLIENT' as const,
      clientId: 'client-1',
      reason: 'Payment overdue',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facility.usage.rackUsedU).toBe(0);
    expect(result.newState.facility.usage.powerUsedKw).toBe(0);
    expect(result.newState.facility.clients).toHaveLength(0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe('facility.client.evicted');
  });

  it('should fail if client not found', () => {
    const state = createTestState({ currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT });
    const action = {
      type: 'EVICT_CLIENT' as const,
      clientId: 'nonexistent',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should not let attackSurfaceScore go below 0', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      facility: {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 10,
          coolingCapacityTons: 5,
          bandwidthCapacityMbps: 100,
        },
        usage: {
          rackUsedU: 10,
          powerUsedKw: 2,
          coolingUsedTons: 1,
          bandwidthUsedMbps: 50,
        },
        clients: [
          {
            clientId: 'client-1',
            clientName: 'Acme Corp',
            organization: 'Acme',
            rackUnitsU: 10,
            powerKw: 2,
            coolingTons: 1,
            bandwidthMbps: 50,
            dailyRate: 100,
            leaseStartDay: 1,
            leaseEndDay: null,
            isActive: true,
            burstProfile: 'steady',
          },
        ],
        upgrades: [],
        maintenanceDebt: 0,
        facilityHealth: 100,
        operatingCostPerDay: 50,
        securityToolOpExPerDay: 0,
        attackSurfaceScore: 1,
        lastTickDay: 1,
      },
    });
    const action = {
      type: 'EVICT_CLIENT' as const,
      clientId: 'client-1',
      reason: 'Payment overdue',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facility.attackSurfaceScore).toBe(0);
  });
});

describe('reduce - PROCESS_FACILITY_TICK', () => {
  it('should process tick and generate revenue from clients', () => {
    const state = createTestState({
      currentDay: 2,
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      facility: {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 10,
          coolingCapacityTons: 5,
          bandwidthCapacityMbps: 100,
        },
        usage: {
          rackUsedU: 10,
          powerUsedKw: 2,
          coolingUsedTons: 1,
          bandwidthUsedMbps: 50,
        },
        clients: [
          {
            clientId: 'client-1',
            clientName: 'Acme Corp',
            organization: 'Acme',
            rackUnitsU: 10,
            powerKw: 2,
            coolingTons: 1,
            bandwidthMbps: 50,
            dailyRate: 100,
            leaseStartDay: 1,
            leaseEndDay: null,
            isActive: true,
            burstProfile: 'steady',
          },
        ],
        upgrades: [],
        maintenanceDebt: 0,
        facilityHealth: 100,
        operatingCostPerDay: 50,
        securityToolOpExPerDay: 0,
        attackSurfaceScore: 10,
        lastTickDay: 1,
      },
    });
    const action = {
      type: 'PROCESS_FACILITY_TICK' as const,
      dayNumber: 2,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.funds).toBe(1029);
    expect(result.newState.facility.lastTickDay).toBe(2);
    expect(result.events).toHaveLength(3);
    expect(result.events[2]?.eventType).toBe('facility.tick.processed');
  });

  it('should accumulate maintenance debt when utilization is critical', () => {
    const state = createTestState({
      currentDay: 2,
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      facility: {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 10,
          coolingCapacityTons: 5,
          bandwidthCapacityMbps: 100,
        },
        usage: {
          rackUsedU: 40,
          powerUsedKw: 9,
          coolingUsedTons: 4,
          bandwidthUsedMbps: 90,
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
    });
    const action = {
      type: 'PROCESS_FACILITY_TICK' as const,
      dayNumber: 2,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facility.maintenanceDebt).toBeGreaterThan(0);
    expect(result.newState.facility.facilityHealth).toBeLessThan(100);
  });
});

describe('reduce - UPGRADE_FACILITY_TIER', () => {
  it('should upgrade facility tier and increase capacities', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 20000,
    });
    const action = {
      type: 'UPGRADE_FACILITY_TIER' as const,
      targetTier: 'station',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facilityTier).toBe('station');
    expect(result.newState.facility.tier).toBe('station');
    expect(result.newState.facility.capacities.rackCapacityU).toBe(168);
    expect(result.newState.facility.capacities.powerCapacityKw).toBe(50);
    expect(result.newState.funds).toBe(5000);
    expect(result.events).toHaveLength(2);
    expect(result.events[1]?.eventType).toBe('facility.tier.upgraded');
  });

  it('should fail if insufficient funds', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 100,
    });
    const action = {
      type: 'UPGRADE_FACILITY_TIER' as const,
      targetTier: 'station',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('reduce - PURCHASE_FACILITY_UPGRADE', () => {
  it('should purchase capacity upgrade with installation timeline', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 1000,
    });
    const action = {
      type: 'PURCHASE_FACILITY_UPGRADE' as const,
      upgradeType: 'rack' as const,
      category: 'capacity' as const,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.funds).toBe(500);
    expect(result.newState.facility.upgrades).toHaveLength(1);
    expect(result.newState.facility.upgrades[0]?.status).toBe('installing');
    expect(result.newState.facility.upgrades[0]?.completesDay).toBe(3);
    expect(result.events).toHaveLength(2);
    expect(result.events[1]?.eventType).toBe('facility.upgrade.purchased');
  });

  it('should fail if insufficient funds', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 100,
    });
    const action = {
      type: 'PURCHASE_FACILITY_UPGRADE' as const,
      upgradeType: 'rack' as const,
      category: 'capacity' as const,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should fail if tier requirement not met', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 5000,
      facilityTier: 'outpost',
      facility: {
        ...createTestState().facility,
        tier: 'outpost',
      },
    });
    const action = {
      type: 'PURCHASE_FACILITY_UPGRADE' as const,
      upgradeType: 'power_efficiency' as const,
      category: 'efficiency' as const,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Requires station tier');
  });

  it('should fail if prerequisite not met', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 5000,
      facilityTier: 'station',
      facility: {
        ...createTestState().facility,
        tier: 'station',
      },
    });
    const action = {
      type: 'PURCHASE_FACILITY_UPGRADE' as const,
      upgradeType: 'ips' as const,
      category: 'security' as const,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Prerequisite upgrade not completed');
  });

  it('should fail if upgrade already installed', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 1000,
      facility: {
        ...createTestState().facility,
        upgrades: [
          {
            upgradeId: 'existing-1',
            upgradeType: 'rack' as const,
            category: 'capacity' as const,
            tierLevel: 1,
            status: 'completed' as const,
            purchasedDay: 1,
            completesDay: 2,
            isCompleted: true,
            completionDay: 2,
            resourceDelta: { rackCapacity: 21 },
            maintenanceDelta: 0.02,
            opExPerDay: 5,
            threatSurfaceDelta: 0.02,
          },
        ],
      },
    });
    const action = {
      type: 'PURCHASE_FACILITY_UPGRADE' as const,
      upgradeType: 'rack' as const,
      category: 'capacity' as const,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('already installed');
  });

  it('should add security tool OpEx when purchasing security upgrade', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 5000,
      facilityTier: 'station',
    });
    const action = {
      type: 'PURCHASE_FACILITY_UPGRADE' as const,
      upgradeType: 'threat_intel_feed' as const,
      category: 'security' as const,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facility.upgrades[0]?.status).toBe('installing');
    expect(result.newState.facility.securityToolOpExPerDay).toBe(0);
  });

  it('should add security tool OpEx immediately for instant upgrades', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 5000,
      facilityTier: 'station',
      facility: {
        ...createTestState().facility,
        upgrades: [
          {
            upgradeId: 'monitoring-1',
            upgradeType: 'monitoring' as const,
            category: 'operations' as const,
            tierLevel: 1,
            status: 'installing' as const,
            purchasedDay: 1,
            completesDay: 2,
            isCompleted: false,
            resourceDelta: { rackUsage: 1 },
            maintenanceDelta: -0.02,
            opExPerDay: 5,
            threatSurfaceDelta: 0.01,
          },
        ],
      },
    });
    const action = {
      type: 'PROCESS_FACILITY_TICK' as const,
      dayNumber: 2,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    const monitoringUpgrade = result.newState.facility.upgrades.find(
      (u) => u.upgradeType === 'monitoring',
    );
    expect(monitoringUpgrade?.status).toBe('completed');
    expect(result.newState.facility.securityToolOpExPerDay).toBe(5);
  });

  it('should update attack surface when purchasing upgrade', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 1000,
    });
    const action = {
      type: 'PURCHASE_FACILITY_UPGRADE' as const,
      upgradeType: 'rack' as const,
      category: 'capacity' as const,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facility.attackSurfaceScore).toBeGreaterThan(10);
  });
});

describe('reduce - upgrade installation completion', () => {
  it('should complete upgrade installation on day tick', () => {
    const state = createTestState({
      currentDay: 3,
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      facility: {
        ...createTestState().facility,
        upgrades: [
          {
            upgradeId: 'installing-1',
            upgradeType: 'rack' as const,
            category: 'capacity' as const,
            tierLevel: 1,
            status: 'installing' as const,
            purchasedDay: 1,
            completesDay: 3,
            isCompleted: false,
            resourceDelta: { rackCapacity: 21 },
            maintenanceDelta: 0.02,
            opExPerDay: 5,
            threatSurfaceDelta: 0.02,
          },
        ],
      },
    });
    const action = {
      type: 'PROCESS_FACILITY_TICK' as const,
      dayNumber: 3,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    const rackUpgrade = result.newState.facility.upgrades.find((u) => u.upgradeType === 'rack');
    expect(rackUpgrade?.status).toBe('completed');
    expect(rackUpgrade?.isCompleted).toBe(true);
    expect(result.newState.facility.capacities.rackCapacityU).toBe(63);
    expect(result.events.some((e) => e.eventType === 'facility.upgrade.completed')).toBe(true);
  });

  it('should apply capacity effects when upgrade completes', () => {
    const state = createTestState({
      currentDay: 3,
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      facility: {
        ...createTestState().facility,
        upgrades: [
          {
            upgradeId: 'installing-power',
            upgradeType: 'power' as const,
            category: 'capacity' as const,
            tierLevel: 1,
            status: 'installing' as const,
            purchasedDay: 1,
            completesDay: 3,
            isCompleted: false,
            resourceDelta: { powerCapacity: 5 },
            maintenanceDelta: 0.02,
            opExPerDay: 10,
            threatSurfaceDelta: 0.01,
          },
        ],
      },
    });
    const action = {
      type: 'PROCESS_FACILITY_TICK' as const,
      dayNumber: 3,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.facility.capacities.powerCapacityKw).toBe(15);
  });
});

describe('reduce - OpEx deduction', () => {
  it('should complete installation and apply OpEx during facility tick', () => {
    const state = createTestState({
      currentDay: 2,
      currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
      funds: 1000,
      facility: {
        ...createTestState().facility,
        upgrades: [
          {
            upgradeId: 'monitoring-1',
            upgradeType: 'monitoring' as const,
            category: 'operations' as const,
            tierLevel: 1,
            status: 'installing' as const,
            purchasedDay: 1,
            completesDay: 2,
            isCompleted: false,
            resourceDelta: { rackUsage: 1 },
            maintenanceDelta: -0.02,
            opExPerDay: 5,
            threatSurfaceDelta: 0.01,
          },
        ],
      },
    });
    const action = {
      type: 'PROCESS_FACILITY_TICK' as const,
      dayNumber: 2,
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    const monitoringUpgrade = result.newState.facility.upgrades.find(
      (u) => u.upgradeType === 'monitoring',
    );
    expect(monitoringUpgrade?.status).toBe('completed');
    expect(result.newState.facility.securityToolOpExPerDay).toBe(5);
  });
});

describe('Breach Reducer Actions', () => {
  describe('TRIGGER_BREACH', () => {
    it('should trigger breach with severity 3', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_THREAT_PROCESSING,
        currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
        trustScore: 100,
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

      const action = {
        type: 'TRIGGER_BREACH' as const,
        triggerType: 'accepted_phishing_email',
        severity: 3 as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_RANSOM);
      expect(result.newState.analyticsState.breaches).toBe(1);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]?.eventType).toBe('game.breach.occurred');
      expect(result.events[1]?.eventType).toBe('game.breach.ransom_displayed');
    });

    it('should trigger non-breach incident with severity 2', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_THREAT_PROCESSING,
        currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
        trustScore: 100,
      });

      const action = {
        type: 'TRIGGER_BREACH' as const,
        triggerType: 'brute_force_success',
        severity: 2 as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ACTIVE);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_THREAT_PROCESSING);
    });
  });

  describe('PAY_RANSOM', () => {
    it('should pay ransom and transition to recovery', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 500,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3,
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

      const action = {
        type: 'PAY_RANSOM' as const,
        amount: 200,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.funds).toBe(300);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_RECOVERY);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]?.eventType).toBe('game.breach.ransom_paid');
      expect(result.events[1]?.eventType).toBe('game.breach.recovery_started');
    });

    it('should throw error when insufficient funds', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 100,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3,
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

      const action = {
        type: 'PAY_RANSOM' as const,
        amount: 200,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('REFUSE_RANSOM', () => {
    it('should refuse ransom and trigger game over at severity 4', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 100,
        currentDay: 15,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 4,
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

      const action = {
        type: 'REFUSE_RANSOM' as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_COMPLETED);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_DAY_END);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]?.eventType).toBe('game.session.game_over');
      expect(result.events[1]?.eventType).toBe('game.breach.ransom_refused');
    });

    it('should refuse ransom and continue to recovery at severity 3', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RANSOM,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        funds: 100,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3,
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

      const action = {
        type: 'REFUSE_RANSOM' as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_RECOVERY);
    });
  });

  describe('ADVANCE_RECOVERY', () => {
    it('should advance recovery day', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        currentDay: 5,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3,
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

      const action = {
        type: 'ADVANCE_RECOVERY' as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.breachState.recoveryDaysRemaining).toBe(4);
    });

    it('should complete recovery when reaching day 0', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        currentDay: 10,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3,
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

      const action = {
        type: 'ADVANCE_RECOVERY' as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ACTIVE);
      expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_RESOURCE_MANAGEMENT);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]?.eventType).toBe('game.breach.recovery_completed');
      expect(result.events[1]?.eventType).toBe('game.breach.post_effects_started');
    });

    it('should set hasActiveBreach to false when recovery completes', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        currentDay: 10,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3,
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

      const action = {
        type: 'ADVANCE_RECOVERY' as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.breachState.hasActiveBreach).toBe(false);
    });

    it('should keep hasActiveBreach true while recovery is in progress', () => {
      const state = createTestState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentMacroState: SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        currentDay: 10,
        breachState: {
          hasActiveBreach: true,
          currentSeverity: 3,
          ransomAmount: null,
          ransomDeadline: null,
          recoveryDaysRemaining: 3,
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

      const action = {
        type: 'ADVANCE_RECOVERY' as const,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      expect(result.newState.breachState.hasActiveBreach).toBe(true);
      expect(result.newState.breachState.recoveryDaysRemaining).toBe(2);
    });
  });
});
