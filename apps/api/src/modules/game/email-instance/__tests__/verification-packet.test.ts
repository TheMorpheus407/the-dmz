import { describe, it, expect } from 'vitest';

import { SESSION_MACRO_STATES, DAY_PHASES, type GameState } from '@the-dmz/shared';

import { reduce } from '../../engine/reducer.js';
import {
  assembleVerificationPacket,
  validatePacketDeterminism,
} from '../verification-packet.service.js';

const createTestState = (overrides?: Partial<GameState>): GameState => {
  const baseState: GameState = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    seed: 12345,
    currentDay: 1,
    currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
    currentPhase: DAY_PHASES.PHASE_TRIAGE,
    funds: 1000,
    trustScore: 100,
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
      attackSurfaceScore: 10,
      lastTickDay: 1,
    },
    inbox: [],
    emailInstances: {},
    verificationPackets: {},
    incidents: [],
    threats: [],
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

describe('Verification Packet Assembly', () => {
  it('should generate a packet with 2-5 documents', () => {
    const packet = assembleVerificationPacket({
      sessionSeed: 12345n,
      emailId: 'email-123',
      sessionId: 'session-123',
    });

    expect(packet.artifacts.length).toBeGreaterThanOrEqual(2);
    expect(packet.artifacts.length).toBeLessThanOrEqual(5);
  });

  it('should always include identity, ownership, and chain of custody documents', () => {
    const packet = assembleVerificationPacket({
      sessionSeed: 99999n,
      emailId: 'email-999',
      sessionId: 'session-999',
    });

    const categories = packet.artifacts.map((a) => a.metadata['category'] as string);
    expect(categories).toContain('identity');
    expect(categories).toContain('ownership');
    expect(categories).toContain('chain_of_custody');
  });

  it('should include intelligence brief when requested', () => {
    const packetWithIntelligence = assembleVerificationPacket({
      sessionSeed: 11111n,
      emailId: 'email-111',
      sessionId: 'session-111',
      includeIntelligence: true,
    });

    expect(packetWithIntelligence.hasIntelligenceBrief).toBe(true);
  });

  it('should generate deterministic packets', () => {
    const params = {
      sessionSeed: 55555n,
      emailId: 'email-deterministic',
      sessionId: 'session-deterministic',
    };

    const isDeterministic = validatePacketDeterminism(params);
    expect(isDeterministic).toBe(true);
  });

  it('should use faction information when provided', () => {
    const packet = assembleVerificationPacket({
      sessionSeed: 77777n,
      emailId: 'email-faction',
      sessionId: 'session-faction',
      faction: 'Nexion Industries',
    });

    const titlesIncludeFaction = packet.artifacts.some((a) =>
      a.title.includes('Nexion Industries'),
    );
    expect(titlesIncludeFaction).toBe(true);
  });

  it('should generate valid artifact metadata', () => {
    const packet = assembleVerificationPacket({
      sessionSeed: 88888n,
      emailId: 'email-metadata',
      sessionId: 'session-metadata',
    });

    for (const artifact of packet.artifacts) {
      expect(artifact.artifactId).toBeDefined();
      expect(artifact.documentType).toBeDefined();
      expect(artifact.title).toBeDefined();
      expect(artifact.validityIndicator).toMatch(/^(valid|suspicious|invalid|unknown)$/);
    }
  });
});

describe('reduce - REQUEST_VERIFICATION', () => {
  it('should generate verification packet when REQUEST_VERIFICATION action is dispatched', () => {
    const state = createTestState({
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
    expect(result.newState.verificationPackets['email-1']).toBeDefined();
    expect(result.newState.verificationPackets['email-1']!.emailId).toBe('email-1');
    expect(result.newState.verificationPackets['email-1']!.artifacts.length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('should emit events when verification is requested', () => {
    const state = createTestState({
      inbox: [
        {
          emailId: 'email-2',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
    });

    const action = {
      type: 'REQUEST_VERIFICATION' as const,
      emailId: 'email-2',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]!.eventType).toBe('game.email.verification_requested');
    expect(result.events[1]!.eventType).toBe('game.verification.packet_generated');
  });

  it('should fail if REQUEST_VERIFICATION not allowed in current phase', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_START,
      inbox: [
        {
          emailId: 'email-3',
          status: 'pending',
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
    });

    const action = {
      type: 'REQUEST_VERIFICATION' as const,
      emailId: 'email-3',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('reduce - FLAG_DISCREPANCY', () => {
  it('should emit discrepancy flagged event', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_VERIFICATION,
      verificationPackets: {
        'email-1': {
          packetId: 'packet-1',
          emailId: 'email-1',
          sessionId: 'session-1',
          createdAt: new Date().toISOString(),
          hasIntelligenceBrief: false,
          artifacts: [
            {
              artifactId: 'artifact-1',
              documentType: 'id_document',
              title: 'Government ID',
              description: 'Valid ID',
              issuer: 'Department of Identity',
              issuedDate: '2024-01-01',
              validityIndicator: 'valid',
              metadata: { category: 'identity' },
            },
          ],
        },
      },
    });

    const action = {
      type: 'FLAG_DISCREPANCY' as const,
      emailId: 'email-1',
      artifactId: 'artifact-1',
      reason: 'Date format mismatch',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.eventType).toBe('game.verification.discrepancy_flagged');
  });

  it('should fail if no packet exists for email', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_VERIFICATION,
      verificationPackets: {},
    });

    const action = {
      type: 'FLAG_DISCREPANCY' as const,
      emailId: 'email-nonexistent',
      artifactId: 'artifact-1',
      reason: 'Test reason',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should fail if artifact not found in packet', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_VERIFICATION,
      verificationPackets: {
        'email-1': {
          packetId: 'packet-1',
          emailId: 'email-1',
          sessionId: 'session-1',
          createdAt: new Date().toISOString(),
          hasIntelligenceBrief: false,
          artifacts: [
            {
              artifactId: 'artifact-1',
              documentType: 'id_document',
              title: 'Government ID',
              description: 'Valid ID',
              issuer: 'Department of Identity',
              issuedDate: '2024-01-01',
              validityIndicator: 'valid',
              metadata: { category: 'identity' },
            },
          ],
        },
      },
    });

    const action = {
      type: 'FLAG_DISCREPANCY' as const,
      emailId: 'email-1',
      artifactId: 'nonexistent-artifact',
      reason: 'Test reason',
    };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
