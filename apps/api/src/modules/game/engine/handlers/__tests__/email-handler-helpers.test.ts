import { describe, it, expect } from 'vitest';

import {
  DAY_PHASES,
  type GameState,
  type EmailState,
  type SubmitDecisionPayload,
  createInitialBreachState,
} from '@the-dmz/shared';

import {
  mapDecisionToStatus,
  findEmailForDecision,
  assertDecisionPhase,
} from '../email-handlers.js';

describe('email-handlers helper functions', () => {
  describe('mapDecisionToStatus', () => {
    it('should map approve to approved status', () => {
      expect(mapDecisionToStatus('approve')).toBe('approved');
    });

    it('should map deny to denied status', () => {
      expect(mapDecisionToStatus('deny')).toBe('denied');
    });

    it('should map flag to flagged status', () => {
      expect(mapDecisionToStatus('flag')).toBe('flagged');
    });

    it('should map request_verification to request_verification status', () => {
      expect(mapDecisionToStatus('request_verification')).toBe('request_verification');
    });

    it('should map defer to deferred status', () => {
      expect(mapDecisionToStatus('defer')).toBe('deferred');
    });

    it('should return pending for unknown decision types', () => {
      expect(mapDecisionToStatus('unknown' as SubmitDecisionPayload['decision'])).toBe('pending');
    });
  });

  describe('findEmailForDecision', () => {
    const _createTestState = (inbox: EmailState[]): GameState => ({
      sessionId: 'test-session-id',
      userId: 'test-user-id',
      tenantId: 'test-tenant-id',
      seed: 12345,
      currentDay: 1,
      currentMacroState: 'SESSION_ACTIVE',
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
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
      inbox,
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
      factionRelations: {},
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
    });

    it('should return the email when email exists in inbox', () => {
      const inbox = [
        {
          emailId: 'email-1',
          status: 'pending' as const,
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ];

      const result = findEmailForDecision(inbox, 'email-1');

      expect(result).toBeDefined();
      expect(result?.emailId).toBe('email-1');
    });

    it('should return undefined when email does not exist in inbox', () => {
      const inbox: EmailState[] = [];

      const result = findEmailForDecision(inbox, 'non-existent-email');

      expect(result).toBeUndefined();
    });

    it('should return undefined when inbox is empty', () => {
      const inbox: EmailState[] = [];

      const result = findEmailForDecision(inbox, 'email-1');

      expect(result).toBeUndefined();
    });
  });

  describe('assertDecisionPhase', () => {
    const createTestState = (phase: DayPhase): GameState => ({
      sessionId: 'test-session-id',
      userId: 'test-user-id',
      tenantId: 'test-tenant-id',
      seed: 12345,
      currentDay: 1,
      currentMacroState: 'SESSION_ACTIVE',
      currentPhase: phase,
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
      factionRelations: {},
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
    });

    it('should not throw when phase allows SUBMIT_DECISION', () => {
      const state = createTestState(DAY_PHASES.PHASE_TRIAGE);
      expect(() => assertDecisionPhase(state)).not.toThrow();
    });

    it('should throw when phase does not allow SUBMIT_DECISION', () => {
      const state = createTestState(DAY_PHASES.PHASE_DAY_START);
      expect(() => assertDecisionPhase(state)).toThrow(
        'SUBMIT_DECISION not allowed in current phase',
      );
    });
  });
});
