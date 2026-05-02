import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  type GameState,
  type FacilityState,
  createInitialBreachState,
} from '@the-dmz/shared/game';

import { ThreatDetectionService } from '../threat-detection.service.js';
import { ThreatResponseService } from '../threat-response.service.js';

describe('ThreatDetectionService TTL Eviction', () => {
  let service: ThreatDetectionService;
  const sessionId = 'test-session-ttl-123';
  const otherSessionId = 'test-session-ttl-456';

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ThreatDetectionService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('playerProfiles Map', () => {
    it('should evict player profile after TTL expires', () => {
      service.getOrCreatePlayerProfile(sessionId);

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      const profile = service.getPlayerProfile(sessionId);
      expect(profile).toBeUndefined();
    });

    it('should return fresh profile for expired session after re-creation', () => {
      const originalProfile = service.getOrCreatePlayerProfile(sessionId);
      originalProfile.detectionRateByCategory.email_phishing = 0.8;

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      const newProfile = service.getOrCreatePlayerProfile(sessionId);
      expect(newProfile.detectionRateByCategory.email_phishing).toBe(0.5);
    });

    it('should not evict profile before TTL expires', () => {
      service.getOrCreatePlayerProfile(sessionId);

      vi.advanceTimersByTime(23 * 60 * 60 * 1000);

      const profile = service.getPlayerProfile(sessionId);
      expect(profile).toBeDefined();
      expect(profile?.detectionRateByCategory.email_phishing).toBe(0.5);
    });

    it('should track different sessions independently', () => {
      service.getOrCreatePlayerProfile(sessionId).detectionRateByCategory.email_phishing = 0.9;
      service.getOrCreatePlayerProfile(otherSessionId).detectionRateByCategory.email_phishing = 0.3;

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      expect(service.getPlayerProfile(sessionId)).toBeUndefined();
      expect(service.getPlayerProfile(otherSessionId)).toBeUndefined();
    });

    it('should refresh TTL on profile update', () => {
      const profile = service.getOrCreatePlayerProfile(sessionId);
      profile.detectionRateByCategory.email_phishing = 0.8;

      vi.advanceTimersByTime(23 * 60 * 60 * 1000);

      service.updatePlayerProfile(sessionId, {
        detected: true,
        vector: 'email_phishing',
        responseTimeMs: 5000,
        verificationSteps: 2,
        checkedHeaders: true,
        checkedUrl: true,
        requestedVerification: true,
      });

      vi.advanceTimersByTime(23 * 60 * 60 * 1000);

      const refreshedProfile = service.getPlayerProfile(sessionId);
      expect(refreshedProfile).toBeDefined();
    });
  });

  describe('currentThreatTiers Map', () => {
    it('should evict threat tier after TTL expires', () => {
      service.setThreatTier(sessionId, 'high');

      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const tier = service.getThreatTier(sessionId);
      expect(tier).toBe('low');
    });

    it('should not evict tier before TTL expires', () => {
      service.setThreatTier(sessionId, 'severe');

      vi.advanceTimersByTime(59 * 60 * 1000);

      const tier = service.getThreatTier(sessionId);
      expect(tier).toBe('severe');
    });

    it('should return default tier for expired session', () => {
      service.setThreatTier(sessionId, 'elevated');

      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const tier = service.getThreatTier(sessionId);
      expect(tier).toBe('low');
    });
  });

  describe('lastTierChangeDays Map', () => {
    it('should evict lastTierChangeDays entry after TTL expires', () => {
      const mockState = createMockState({ currentDay: 10 });
      service.calculateThreatTier(mockState, sessionId);

      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const result = service.calculateThreatTier(mockState, sessionId);
      expect(result.changed).toBe(false);
    });
  });
});

describe('ThreatResponseService TTL Eviction', () => {
  let service: ThreatResponseService;
  const sessionId = 'test-session-ttl-789';
  const otherSessionId = 'test-session-ttl-101';

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ThreatResponseService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('intensityGauges Map', () => {
    it('should evict intensity gauge after TTL expires', () => {
      service.updateIntensityGauge(sessionId, 5, 2, true, 0);

      vi.advanceTimersByTime(30 * 60 * 1000 + 1);

      const gauge = service.getIntensityGauge(sessionId);
      expect(gauge).toBe(0);
    });

    it('should not evict gauge before TTL expires', () => {
      service.updateIntensityGauge(sessionId, 10, 5, true, 0);

      vi.advanceTimersByTime(29 * 60 * 1000);

      const gauge = service.getIntensityGauge(sessionId);
      expect(gauge).toBeGreaterThan(0);
    });

    it('should return default gauge for expired session', () => {
      service.updateIntensityGauge(sessionId, 8, 3, true, 0);

      vi.advanceTimersByTime(30 * 60 * 1000 + 1);

      const gauge = service.getIntensityGauge(sessionId);
      expect(gauge).toBe(0);
    });

    it('should track different sessions independently', () => {
      service.updateIntensityGauge(sessionId, 10, 5, true, 0);
      service.updateIntensityGauge(otherSessionId, 2, 1, false, 100);

      vi.advanceTimersByTime(30 * 60 * 1000 + 1);

      expect(service.getIntensityGauge(sessionId)).toBe(0);
      expect(service.getIntensityGauge(otherSessionId)).toBe(0);
    });

    it('should refresh TTL on gauge update', () => {
      service.updateIntensityGauge(sessionId, 5, 2, true, 0);

      vi.advanceTimersByTime(29 * 60 * 1000);

      service.updateIntensityGauge(sessionId, 3, 1, false, 50);

      vi.advanceTimersByTime(29 * 60 * 1000);

      const gauge = service.getIntensityGauge(sessionId);
      expect(gauge).toBeGreaterThan(0);
    });
  });
});

describe('TTL Eviction Integration', () => {
  it('should handle multiple sessions with interleaved TTLs', () => {
    vi.useFakeTimers();

    const detectionService = new ThreatDetectionService();
    const responseService = new ThreatResponseService();

    const session1 = 'session-1';
    const session2 = 'session-2';
    const session3 = 'session-3';

    detectionService.getOrCreatePlayerProfile(session1);
    detectionService.getOrCreatePlayerProfile(session2);
    detectionService.getOrCreatePlayerProfile(session3);

    responseService.updateIntensityGauge(session1, 5, 2, true, 0);
    responseService.updateIntensityGauge(session2, 3, 1, false, 50);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    expect(detectionService.getPlayerProfile(session1)).toBeUndefined();
    expect(detectionService.getPlayerProfile(session2)).toBeUndefined();
    expect(detectionService.getPlayerProfile(session3)).toBeDefined();

    expect(responseService.getIntensityGauge(session1)).toBe(0);
    expect(responseService.getIntensityGauge(session2)).toBe(0);

    vi.useRealTimers();
  });
});

function createMockState(
  overrides: Partial<Pick<GameState, 'currentDay' | 'seed' | 'facility' | 'partyContext'>> = {},
): GameState {
  const defaultFacility: FacilityState = {
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
  };

  return {
    sessionId: 'mock-session',
    userId: 'user-1',
    tenantId: 'tenant-1',
    seed: 12345,
    currentDay: 1,
    currentMacroState: 'SESSION_ACTIVE' as const,
    currentPhase: 'PHASE_THREAT_PROCESSING' as const,
    funds: 1000,
    trustScore: 50,
    intelFragments: 0,
    playerLevel: 1,
    playerXP: 0,
    threatTier: 'low' as const,
    facilityTier: 'outpost' as const,
    facility: {
      ...defaultFacility,
      ...overrides.facility,
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
    ...overrides,
  };
}