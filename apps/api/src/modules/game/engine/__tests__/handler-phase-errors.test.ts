import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  PHASE_TRANSITIONS,
  type GameState,
  createInitialBreachState,
} from '@the-dmz/shared';

import { reduce } from '../reducer.js';
import { getNextPhase, GameStateMachineError } from '../state-machine.js';

let originalPhaseTransitions: Record<string, unknown> = {};

beforeEach(() => {
  originalPhaseTransitions = {};
  for (const phase of Object.keys(PHASE_TRANSITIONS)) {
    originalPhaseTransitions[phase] = [
      ...PHASE_TRANSITIONS[phase as keyof typeof PHASE_TRANSITIONS],
    ];
  }
});

afterEach(() => {
  for (const phase of Object.keys(originalPhaseTransitions)) {
    (PHASE_TRANSITIONS as Record<string, unknown>)[phase] = originalPhaseTransitions[phase];
  }
});

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

describe('handler-phase-errors', () => {
  describe('email-handlers', () => {
    describe('handleAckDayStart', () => {
      it('should fail with ACK_DAY_START not allowed in current phase when not in PHASE_DAY_START', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = { type: 'ACK_DAY_START' as const };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('ACK_DAY_START not allowed in current phase');
      });
    });

    describe('handleLoadInbox', () => {
      it('should fail with LOAD_INBOX only allowed in EMAIL_INTAKE phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'LOAD_INBOX' as const,
          emails: [],
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('LOAD_INBOX only allowed in EMAIL_INTAKE phase');
      });
    });

    describe('handleOpenEmail', () => {
      it('should fail with OPEN_EMAIL not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });
        const action = {
          type: 'OPEN_EMAIL' as const,
          emailId: 'email-1',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('OPEN_EMAIL not allowed in current phase');
      });

      it('should fail with Email not found when email does not exist', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_TRIAGE,
          inbox: [],
        });
        const action = {
          type: 'OPEN_EMAIL' as const,
          emailId: 'non-existent-email',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Email not found');
      });
    });

    describe('handleMarkIndicator', () => {
      it('should fail with MARK_INDICATOR not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });
        const action = {
          type: 'MARK_INDICATOR' as const,
          emailId: 'email-1',
          indicatorType: 'suspicious_sender',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('MARK_INDICATOR not allowed in current phase');
      });
    });

    describe('handleRequestVerification', () => {
      it('should fail with REQUEST_VERIFICATION not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });
        const action = {
          type: 'REQUEST_VERIFICATION' as const,
          emailId: 'email-1',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain(
          'REQUEST_VERIFICATION not allowed in current phase',
        );
      });
    });

    describe('handleSubmitDecision', () => {
      it('should fail with SUBMIT_DECISION not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_DAY_START });
        const action = {
          type: 'SUBMIT_DECISION' as const,
          emailId: 'email-1',
          decision: 'approve' as const,
          timeSpentMs: 5000,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('SUBMIT_DECISION not allowed in current phase');
      });
    });
  });

  describe('breach-handlers', () => {
    describe('handleResolveIncident', () => {
      it('should fail with RESOLVE_INCIDENT not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'RESOLVE_INCIDENT' as const,
          incidentId: 'incident-1',
          responseActions: ['logged'],
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('RESOLVE_INCIDENT not allowed in current phase');
      });
    });

    describe('handleTriggerBreach', () => {
      it('should fail with TRIGGER_BREACH only allowed during threat processing when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'TRIGGER_BREACH' as const,
          triggerType: 'phishing',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain(
          'TRIGGER_BREACH only allowed during threat processing',
        );
      });
    });

    describe('handlePayRansom', () => {
      it('should fail with PAY_RANSOM only allowed in RANSOM phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'PAY_RANSOM' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('PAY_RANSOM only allowed in RANSOM phase');
      });

      it('should fail with No active ransom to pay when no ransom is active', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_RANSOM,
          breachState: createInitialBreachState(),
        });
        const action = {
          type: 'PAY_RANSOM' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No active ransom to pay');
      });

      it('should fail with Insufficient funds to pay ransom when funds are too low', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_RANSOM,
          funds: 50,
          breachState: {
            ...createInitialBreachState(),
            ransomAmount: 500,
            isRansomPaid: false,
            currentSeverity: 'medium',
          },
        });
        const action = {
          type: 'PAY_RANSOM' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Insufficient funds to pay ransom');
      });
    });

    describe('handleRefuseRansom', () => {
      it('should fail with REFUSE_RANSOM only allowed in RANSOM phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'REFUSE_RANSOM' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('REFUSE_RANSOM only allowed in RANSOM phase');
      });
    });

    describe('handleAdvanceRecovery', () => {
      it('should fail with ADVANCE_RECOVERY only allowed in RECOVERY phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'ADVANCE_RECOVERY' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('ADVANCE_RECOVERY only allowed in RECOVERY phase');
      });

      it('should fail with No recovery to advance when no recovery is in progress', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_RECOVERY,
          breachState: {
            ...createInitialBreachState(),
            recoveryDaysRemaining: 0,
          },
        });
        const action = {
          type: 'ADVANCE_RECOVERY' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No recovery to advance');
      });
    });
  });

  describe('facility-handlers', () => {
    describe('handlePurchaseUpgrade', () => {
      it('should fail with PURCHASE_UPGRADE not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'PURCHASE_UPGRADE' as const,
          upgradeId: 'upgrade-1',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('PURCHASE_UPGRADE not allowed in current phase');
      });
    });

    describe('handleAdjustResource', () => {
      it('should fail with ADJUST_RESOURCE not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'ADJUST_RESOURCE' as const,
          resourceId: 'rack',
          delta: 5,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('ADJUST_RESOURCE not allowed in current phase');
      });
    });

    describe('handleOnboardClient - capacity validation', () => {
      it('should fail with Capacity exceeded: rack at X% when rack capacity would be exceeded', () => {
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
              powerUsedKw: 5,
              coolingUsedTons: 2,
              bandwidthUsedMbps: 50,
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
          clientName: 'Test Client',
          organization: 'Test Org',
          rackUnitsU: 10,
          powerKw: 1,
          coolingTons: 1,
          bandwidthMbps: 10,
          dailyRate: 100,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Capacity exceeded: rack at');
      });

      it('should fail with Capacity exceeded: power at X% when power capacity would be exceeded', () => {
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
              powerUsedKw: 9,
              coolingUsedTons: 2,
              bandwidthUsedMbps: 50,
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
          clientName: 'Test Client',
          organization: 'Test Org',
          rackUnitsU: 1,
          powerKw: 5,
          coolingTons: 1,
          bandwidthMbps: 10,
          dailyRate: 100,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Capacity exceeded: power at');
      });

      it('should fail with Capacity exceeded: cooling at X% when cooling capacity would be exceeded', () => {
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
              powerUsedKw: 5,
              coolingUsedTons: 4,
              bandwidthUsedMbps: 50,
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
          clientName: 'Test Client',
          organization: 'Test Org',
          rackUnitsU: 1,
          powerKw: 1,
          coolingTons: 5,
          bandwidthMbps: 10,
          dailyRate: 100,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Capacity exceeded: cooling at');
      });

      it('should fail with Capacity exceeded: bandwidth at X% when bandwidth capacity would be exceeded', () => {
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
              powerUsedKw: 5,
              coolingUsedTons: 2,
              bandwidthUsedMbps: 95,
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
          clientName: 'Test Client',
          organization: 'Test Org',
          rackUnitsU: 1,
          powerKw: 1,
          coolingTons: 1,
          bandwidthMbps: 20,
          dailyRate: 100,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Capacity exceeded: bandwidth at');
      });
    });

    describe('handleOnboardClient', () => {
      it('should fail with ONBOARD_CLIENT not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'ONBOARD_CLIENT' as const,
          clientId: 'client-1',
          clientName: 'Test Client',
          organization: 'Test Org',
          rackUnitsU: 4,
          powerKw: 1,
          coolingTons: 1,
          bandwidthMbps: 10,
          dailyRate: 100,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('ONBOARD_CLIENT not allowed in current phase');
      });
    });

    describe('handleEvictClient', () => {
      it('should fail with Client not found when client does not exist', () => {
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
          type: 'EVICT_CLIENT' as const,
          clientId: 'non-existent-client',
          reason: 'test',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Client not found');
      });
    });

    describe('handleProcessFacilityTick', () => {
      it('should fail with PROCESS_FACILITY_TICK not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'PROCESS_FACILITY_TICK' as const,
          dayNumber: 2,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain(
          'PROCESS_FACILITY_TICK not allowed in current phase',
        );
      });
    });

    describe('handleUpgradeFacilityTier', () => {
      it('should fail with UPGRADE_FACILITY_TIER not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'UPGRADE_FACILITY_TIER' as const,
          targetTier: 'station',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain(
          'UPGRADE_FACILITY_TIER not allowed in current phase',
        );
      });

      it('should fail with Invalid target tier when tier is not valid', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        });
        const action = {
          type: 'UPGRADE_FACILITY_TIER' as const,
          targetTier: 'invalid_tier',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Invalid target tier');
      });

      it('should fail with Insufficient funds for tier upgrade when funds are too low', () => {
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
        expect(result.error?.message).toContain('Insufficient funds for tier upgrade');
      });
    });
  });

  describe('session-handlers', () => {
    describe('handlePauseSession', () => {
      it('should fail with Cannot pause from current state when macro state does not allow pausing', () => {
        const state = createTestState({
          currentMacroState: SESSION_MACRO_STATES.SESSION_INIT,
        });
        const action = {
          type: 'PAUSE_SESSION' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Cannot pause from current state');
      });
    });

    describe('handleResumeSession', () => {
      it('should fail with Cannot resume from current state when macro state does not allow resuming', () => {
        const state = createTestState({
          currentMacroState: SESSION_MACRO_STATES.SESSION_COMPLETED,
        });
        const action = {
          type: 'RESUME_SESSION' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Cannot resume from current state');
      });
    });

    describe('handleAbandonSession', () => {
      it('should fail with Cannot abandon from current state when macro state does not allow abandoning', () => {
        const state = createTestState({
          currentMacroState: SESSION_MACRO_STATES.SESSION_COMPLETED,
        });
        const action = {
          type: 'ABANDON_SESSION' as const,
          reason: 'test',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Cannot abandon from current state');
      });
    });

    describe('handleAdvanceDay', () => {
      it('should fail with ADVANCE_DAY not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'ADVANCE_DAY' as const,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('ADVANCE_DAY not allowed in current phase');
      });
    });
  });

  describe('threat-handlers', () => {
    describe('handleProcessThreats', () => {
      it('should fail with PROCESS_THREATS not allowed in current phase when in wrong phase', () => {
        const state = createTestState({ currentPhase: DAY_PHASES.PHASE_TRIAGE });
        const action = {
          type: 'PROCESS_THREATS' as const,
          dayNumber: 1,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('PROCESS_THREATS not allowed in current phase');
      });
    });
  });

  describe('verification-handlers', () => {
    describe('handleFlagDiscrepancy', () => {
      it('should fail with FLAG_DISCREPANCY not allowed in current phase when in wrong phase', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_TRIAGE,
          verificationPackets: {
            'email-1': {
              packetId: 'packet-1',
              emailId: 'email-1',
              artifacts: [{ artifactId: 'artifact-1', documentType: 'invoice' }],
              hasIntelligenceBrief: false,
            },
          },
        });
        const action = {
          type: 'FLAG_DISCREPANCY' as const,
          emailId: 'email-1',
          artifactId: 'artifact-1',
          reason: 'test',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('FLAG_DISCREPANCY not allowed in current phase');
      });

      it('should fail with No verification packet found for this email when packet does not exist', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_VERIFICATION,
          verificationPackets: {},
        });
        const action = {
          type: 'FLAG_DISCREPANCY' as const,
          emailId: 'email-1',
          artifactId: 'artifact-1',
          reason: 'test',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('No verification packet found for this email');
      });

      it('should fail with Artifact not found in packet when artifact does not exist', () => {
        const state = createTestState({
          currentPhase: DAY_PHASES.PHASE_VERIFICATION,
          verificationPackets: {
            'email-1': {
              packetId: 'packet-1',
              emailId: 'email-1',
              artifacts: [{ artifactId: 'artifact-1', documentType: 'invoice' }],
              hasIntelligenceBrief: false,
            },
          },
        });
        const action = {
          type: 'FLAG_DISCREPANCY' as const,
          emailId: 'email-1',
          artifactId: 'non-existent-artifact',
          reason: 'test',
        };

        const result = reduce(state, action);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Artifact not found in packet');
      });
    });
  });

  describe('state-machine', () => {
    describe('getNextPhase', () => {
      it('returns next phase for all currently defined phases', () => {
        const allPhases = Object.values(DAY_PHASES);
        for (const phase of allPhases) {
          expect(() => getNextPhase(phase)).not.toThrow();
        }
      });

      it('throws NO_TRANSITIONS error when phase has no transitions', () => {
        (PHASE_TRANSITIONS as Record<string, unknown>)[DAY_PHASES.PHASE_DAY_START] = [];

        try {
          expect(() => getNextPhase(DAY_PHASES.PHASE_DAY_START)).toThrow(GameStateMachineError);
          expect(() => getNextPhase(DAY_PHASES.PHASE_DAY_START)).toThrow(
            expect.objectContaining({
              code: 'NO_TRANSITIONS',
              message: expect.stringContaining('No transitions available'),
            }),
          );
        } finally {
          (PHASE_TRANSITIONS as Record<string, unknown>)[DAY_PHASES.PHASE_DAY_START] =
            originalPhaseTransitions[DAY_PHASES.PHASE_DAY_START];
        }
      });
    });
  });
});
