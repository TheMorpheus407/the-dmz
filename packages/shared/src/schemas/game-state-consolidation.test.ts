import { describe, expect, it } from 'vitest';

import { gameStateSchema } from './game-engine.schema.js';

import type { GameState, EmailState, IncidentState, FacilityState } from '../types/game-state.js';
import type { EmailInstance, VerificationPacket } from '../game/email-instance.js';
import type { GeneratedAttack } from '../game/threat-catalog.js';
import type { BreachState } from '../game/breach.js';
import type { CoopContext } from '../game/coop-scaling.js';
import type { CoopRole } from './coop-session.schema.js';

describe('GameState Schema Consolidation (Issue #1737)', () => {
  describe('gameStateSchema must accept all fields from GameState interface', () => {
    it('should accept facility field with FacilityState structure', () => {
      const facility: FacilityState = {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 100,
          coolingCapacityTons: 50,
          bandwidthCapacityMbps: 1000,
        },
        usage: {
          rackUsedU: 10,
          powerUsedKw: 25,
          coolingUsedTons: 12,
          bandwidthUsedMbps: 250,
        },
        clients: [],
        upgrades: [],
        maintenanceDebt: 0,
        facilityHealth: 100,
        operatingCostPerDay: 100,
        securityToolOpExPerDay: 50,
        attackSurfaceScore: 10,
        lastTickDay: 1,
      };

      const gameState = createMinimalGameState({ facility });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected facility to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept emailInstances field with Record<string, EmailInstance>', () => {
      const emailInstances: Record<string, EmailInstance> = {
        '550e8400-e29b-41d4-a716-446655440010': {
          emailId: '550e8400-e29b-41d4-a716-446655440010',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          dayNumber: 1,
          difficulty: 1,
          intent: 'legitimate',
          technique: 'phishing',
          threatTier: 'low',
          faction: 'neutral',
          sender: {
            displayName: 'John Doe',
            emailAddress: 'john@example.com',
            domain: 'example.com',
            jobRole: 'Manager',
            organization: 'Acme Corp',
            relationshipHistory: 5,
          },
          headers: {
            messageId: '<abc123@example.com>',
            returnPath: 'john@example.com',
            received: ['from mail.example.com'],
            spfResult: 'pass',
            dkimResult: 'pass',
            dmarcResult: 'pass',
            originalDate: '2024-01-01T00:00:00.000Z',
            subject: 'Test Email',
          },
          body: {
            preview: 'This is a test',
            fullBody: 'This is a test email body',
            embeddedLinks: [],
          },
          attachments: [],
          accessRequest: {
            applicantName: 'John Doe',
            applicantRole: 'Manager',
            organization: 'Acme Corp',
            requestedAssets: ['server1'],
            requestedServices: ['backup'],
            justification: 'Need backup access',
            urgency: 'low',
            value: 1000,
          },
          indicators: [],
          groundTruth: {
            isMalicious: false,
            correctDecision: 'approve',
            riskScore: 0.1,
            explanation: 'Legitimate email',
            consequences: {
              approved: { trustImpact: 1, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
              denied: { trustImpact: -1, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
              flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
              deferred: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
            },
          },
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      };

      const gameState = createMinimalGameState({ emailInstances });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected emailInstances to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept verificationPackets field with Record<string, VerificationPacket>', () => {
      const verificationPackets: Record<string, VerificationPacket> = {
        '550e8400-e29b-41d4-a716-446655440020': {
          packetId: '550e8400-e29b-41d4-a716-446655440020',
          emailId: '550e8400-e29b-41d4-a716-446655440010',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2024-01-01T00:00:00.000Z',
          artifacts: [],
          hasIntelligenceBrief: false,
        },
      };

      const gameState = createMinimalGameState({ verificationPackets });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected verificationPackets to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept threats field with GeneratedAttack[]', () => {
      const threats: GeneratedAttack[] = [
        {
          attackId: '550e8400-e29b-41d4-a716-446655440030',
          vector: 'email_phishing',
          difficulty: 3,
          faction: 'hostile',
          timestamp: '2024-01-01T00:00:00.000Z',
          isCampaignPart: false,
        },
      ];

      const gameState = createMinimalGameState({ threats });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected threats to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept breachState field with BreachState structure', () => {
      const breachState: BreachState = {
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
      };

      const gameState = createMinimalGameState({ breachState });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected breachState to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept partyContext field with optional CoopContext', () => {
      const partyContext: CoopContext = {
        partySize: 2,
        coopRole: 'triage_lead' as CoopRole,
        difficultyTier: 'standard',
        threatScaling: {
          emailVolumeMultiplier: 1.2,
          threatProbabilityBonus: 0.1,
          incidentProbabilityBonus: 0.05,
          breachSeverityBonus: 1,
          timePressureMultiplier: 1.15,
        },
      };

      const gameState = createMinimalGameState({ partyContext });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected partyContext to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept game state without partyContext (optional field)', () => {
      const gameState = createMinimalGameState({});
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected partyContext to be optional: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept complete game state with all new fields', () => {
      const facility: FacilityState = {
        tier: 'outpost',
        capacities: {
          rackCapacityU: 42,
          powerCapacityKw: 100,
          coolingCapacityTons: 50,
          bandwidthCapacityMbps: 1000,
        },
        usage: {
          rackUsedU: 10,
          powerUsedKw: 25,
          coolingUsedTons: 12,
          bandwidthUsedMbps: 250,
        },
        clients: [],
        upgrades: [],
        maintenanceDebt: 0,
        facilityHealth: 100,
        operatingCostPerDay: 100,
        securityToolOpExPerDay: 50,
        attackSurfaceScore: 10,
        lastTickDay: 1,
      };

      const breachState: BreachState = {
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
      };

      const completeGameState = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        tenantId: '550e8400-e29b-41d4-a716-446655440002',
        seed: 12345,
        currentDay: 1,
        currentMacroState: 'SESSION_INIT' as const,
        currentPhase: 'PHASE_DAY_START' as const,
        funds: 1000,
        trustScore: 50,
        intelFragments: 0,
        playerLevel: 1,
        playerXP: 0,
        threatTier: 'low' as const,
        facilityTier: 'outpost' as const,
        facility,
        inbox: [],
        emailInstances: {} as Record<string, EmailInstance>,
        verificationPackets: {} as Record<string, VerificationPacket>,
        incidents: [],
        threats: [] as GeneratedAttack[],
        breachState,
        narrativeState: {
          currentChapter: 1,
          activeTriggers: [],
          completedEvents: [],
        },
        factionRelations: {} as Record<string, number>,
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
        partyContext: undefined as CoopContext | undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = gameStateSchema.safeParse(completeGameState);
      expect(
        result.success,
        `Expected complete game state to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });
  });

  describe('Inbox email items must support openedAt field', () => {
    it('should accept inbox email with openedAt field', () => {
      const emailState: EmailState = {
        emailId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'pending',
        indicators: [],
        verificationRequested: false,
        timeSpentMs: 0,
        openedAt: '2024-01-01T00:00:00.000Z',
      };

      const gameState = createMinimalGameState({
        inbox: [emailState],
      });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected inbox email with openedAt to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });

    it('should accept inbox email without openedAt field', () => {
      const emailState: EmailState = {
        emailId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'pending',
        indicators: [],
        verificationRequested: false,
        timeSpentMs: 0,
      };

      const gameState = createMinimalGameState({
        inbox: [emailState],
      });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected inbox email without openedAt to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });
  });

  describe('Incident items must use incidentId field', () => {
    it('should accept incident with incidentId field', () => {
      const incident: IncidentState = {
        incidentId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'active',
        severity: 5,
        type: 'phishing',
        createdDay: 1,
        responseActions: [],
      };

      const gameState = createMinimalGameState({
        incidents: [incident],
      });
      const result = gameStateSchema.safeParse(gameState);
      expect(
        result.success,
        `Expected incident with incidentId to be valid: ${JSON.stringify(result.error?.format())}`,
      ).toBe(true);
    });
  });

  describe('Schema must reject invalid data', () => {
    it('should reject inbox email with invalid email status', () => {
      const invalidEmailState = {
        emailId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'invalid_status',
        indicators: [],
        verificationRequested: false,
        timeSpentMs: 0,
      };

      const gameState = createMinimalGameState({
        inbox: [invalidEmailState as EmailState],
      });
      const result = gameStateSchema.safeParse(gameState);
      expect(result.success).toBe(false);
    });

    it('should reject incident with invalid status', () => {
      const invalidIncident = {
        incidentId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'invalid_status',
        severity: 5,
        type: 'phishing',
        createdDay: 1,
        responseActions: [],
      };

      const gameState = createMinimalGameState({
        incidents: [invalidIncident as IncidentState],
      });
      const result = gameStateSchema.safeParse(gameState);
      expect(result.success).toBe(false);
    });
  });
});

function createMinimalGameState(overrides: Partial<GameState>): GameState {
  return {
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    tenantId: '550e8400-e29b-41d4-a716-446655440002',
    seed: 12345,
    currentDay: 1,
    currentMacroState: 'SESSION_INIT',
    currentPhase: 'PHASE_DAY_START',
    funds: 1000,
    trustScore: 50,
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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
