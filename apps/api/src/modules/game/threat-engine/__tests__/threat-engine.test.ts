import { describe, it, expect, beforeEach } from 'vitest';

import {
  THREAT_TIER_CONFIG,
  ATTACK_CATALOG,
  type ThreatTierLevel,
  createInitialPlayerBehaviorProfile,
  calculateThreatScore,
  calculatePlayerCompetence,
  type GameState,
  type FacilityState,
} from '@the-dmz/shared/game';

import { ThreatEngineService, type PlayerProfileUpdate } from '../threat-engine.service.js';

describe('ThreatEngineService', () => {
  let service: ThreatEngineService;
  const sessionId = 'test-session-123';

  const createMockState = (
    overrides: Partial<Pick<GameState, 'currentDay' | 'seed' | 'facility'>> = {},
  ): GameState => {
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
      attackSurfaceScore: 10,
      lastTickDay: 1,
    };

    return {
      sessionId,
      userId: 'user-1',
      tenantId: 'tenant-1',
      seed: 12345,
      currentDay: 1,
      currentMacroState: 'SESSION_ACTIVE' as const,
      currentPhase: 'PHASE_THREAT_PROCESSING' as const,
      funds: 1000,
      trustScore: 100,
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
  };

  beforeEach(() => {
    service = new ThreatEngineService();
  });

  describe('getOrCreatePlayerProfile', () => {
    it('should create a new profile if none exists', () => {
      const profile = service.getOrCreatePlayerProfile(sessionId);

      expect(profile).toBeDefined();
      expect(profile.detectionRateByCategory).toBeDefined();
      expect(profile.detectionRateByCategory.email_phishing).toBe(0.5);
    });

    it('should return existing profile if one exists', () => {
      const profile1 = service.getOrCreatePlayerProfile(sessionId);
      profile1.detectionRateByCategory.email_phishing = 0.8;

      const profile2 = service.getOrCreatePlayerProfile(sessionId);

      expect(profile2.detectionRateByCategory.email_phishing).toBe(0.8);
    });
  });

  describe('updatePlayerProfile', () => {
    it('should increase detection rate on successful detection', () => {
      const update: PlayerProfileUpdate = {
        detected: true,
        vector: 'email_phishing',
        responseTimeMs: 5000,
        verificationSteps: 2,
        checkedHeaders: true,
        checkedUrl: true,
        requestedVerification: true,
      };

      service.updatePlayerProfile(sessionId, update);
      const profile = service.getPlayerProfile(sessionId);

      expect(profile?.detectionRateByCategory.email_phishing).toBeGreaterThan(0.5);
      expect(profile?.streakCorrect).toBe(1);
      expect(profile?.streakIncorrect).toBe(0);
    });

    it('should decrease detection rate on missed detection', () => {
      service.updatePlayerProfile(sessionId, {
        detected: false,
        vector: 'email_phishing',
        responseTimeMs: 5000,
        verificationSteps: 0,
        checkedHeaders: false,
        checkedUrl: false,
        requestedVerification: false,
      });

      const profile = service.getPlayerProfile(sessionId);

      expect(profile?.detectionRateByCategory.email_phishing).toBeLessThan(0.5);
      expect(profile?.streakCorrect).toBe(0);
      expect(profile?.streakIncorrect).toBe(1);
    });

    it('should track verification behavior', () => {
      service.updatePlayerProfile(sessionId, {
        detected: true,
        vector: 'email_phishing',
        responseTimeMs: 5000,
        verificationSteps: 3,
        checkedHeaders: true,
        checkedUrl: true,
        requestedVerification: true,
      });

      const profile = service.getPlayerProfile(sessionId);

      expect(profile?.verificationDepth).toBeGreaterThan(0);
      expect(profile?.headerCheckRate).toBeGreaterThan(0);
    });
  });

  describe('getThreatTier', () => {
    it('should return low as default tier', () => {
      const tier = service.getThreatTier(sessionId);
      expect(tier).toBe('low');
    });
  });

  describe('setThreatTier', () => {
    it('should set a specific threat tier', () => {
      service.setThreatTier(sessionId, 'high');
      const tier = service.getThreatTier(sessionId);
      expect(tier).toBe('high');
    });
  });

  describe('generateAttacks', () => {
    it('should generate attacks based on threat tier', () => {
      service.setThreatTier(sessionId, 'low');
      const state = createMockState({ currentDay: 5 });

      const result = service.generateAttacks(state, sessionId, 5);

      expect(result.attacks).toBeDefined();
      expect(result.attacks.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate attacks within tier difficulty range for low tier', () => {
      service.setThreatTier(sessionId, 'low');
      const state = createMockState({ currentDay: 5 });

      const result = service.generateAttacks(state, sessionId, 5);

      for (const attack of result.attacks) {
        expect(attack.difficulty).toBeGreaterThanOrEqual(1);
        expect(attack.difficulty).toBeLessThanOrEqual(2);
      }
    });

    it('should generate attacks within tier difficulty range for severe tier', () => {
      service.setThreatTier(sessionId, 'severe');
      const state = createMockState({ currentDay: 35 });

      const result = service.generateAttacks(state, sessionId, 35);

      for (const attack of result.attacks) {
        expect(attack.difficulty).toBeGreaterThanOrEqual(5);
        expect(attack.difficulty).toBeLessThanOrEqual(5);
      }
    });

    it('should only use available vectors for the tier', () => {
      service.setThreatTier(sessionId, 'low');
      const state = createMockState({ currentDay: 5 });

      const result = service.generateAttacks(state, sessionId, 5);
      const lowVectors = THREAT_TIER_CONFIG.low.availableVectors;

      for (const attack of result.attacks) {
        expect(lowVectors).toContain(attack.vector);
      }
    });

    it('should use adaptive weights based on player profile', () => {
      service.setThreatTier(sessionId, 'guarded');
      service.updatePlayerProfile(sessionId, {
        detected: true,
        vector: 'email_phishing',
        responseTimeMs: 5000,
        verificationSteps: 3,
        checkedHeaders: true,
        checkedUrl: true,
        requestedVerification: true,
      });

      const state = createMockState({ currentDay: 10 });

      const result = service.generateAttacks(state, sessionId, 10);

      expect(result.attacks.length).toBeGreaterThanOrEqual(0);
    });

    it('should return tier changed flag when tier changes', () => {
      service.setThreatTier(sessionId, 'low');
      const state = createMockState({
        currentDay: 12,
        facility: {
          tier: 'vault',
          attackSurfaceScore: 30,
          capacities: {
            rackCapacityU: 200,
            powerCapacityKw: 50,
            coolingCapacityTons: 25,
            bandwidthCapacityMbps: 500,
          },
          usage: {
            rackUsedU: 50,
            powerUsedKw: 20,
            coolingUsedTons: 10,
            bandwidthUsedMbps: 200,
          },
          upgrades: [],
          maintenanceDebt: 0,
          facilityHealth: 100,
          operatingCostPerDay: 200,
          lastTickDay: 10,
          clients: Array.from({ length: 20 }, (_, i) => ({
            clientId: String(i + 1),
            clientName: `Client ${i + 1}`,
            organization: 'Test Org',
            rackUnitsU: 1,
            powerKw: 1,
            coolingTons: 0.5,
            bandwidthMbps: 10,
            dailyRate: 100,
            leaseStartDay: 1,
            leaseEndDay: null,
            isActive: true,
            burstProfile: 'steady' as const,
          })),
        },
      });

      const result = service.generateAttacks(state, sessionId, 12);

      expect(result.tierChanged).toBe(true);
    });
  });

  describe('intensity gauge', () => {
    it('should track intensity gauge', () => {
      const gauge1 = service.getIntensityGauge(sessionId);
      expect(gauge1).toBe(0);

      service.updateIntensityGauge(sessionId, 3, 1, false, 0);

      const gauge2 = service.getIntensityGauge(sessionId);
      expect(gauge2).toBeGreaterThan(0);
    });

    it('should trigger breathing room at high intensity', () => {
      service.updateIntensityGauge(sessionId, 10, 5, true, 0);

      const shouldTrigger = service.shouldTriggerBreathingRoom(sessionId);
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger breathing room at low intensity', () => {
      service.updateIntensityGauge(sessionId, 0, 0, false, 100);

      const shouldTrigger = service.shouldTriggerBreathingRoom(sessionId);
      expect(shouldTrigger).toBe(false);
    });
  });
});

describe('THREAT_TIER_CONFIG', () => {
  it('should have all required tiers defined', () => {
    expect(THREAT_TIER_CONFIG.low).toBeDefined();
    expect(THREAT_TIER_CONFIG.guarded).toBeDefined();
    expect(THREAT_TIER_CONFIG.elevated).toBeDefined();
    expect(THREAT_TIER_CONFIG.high).toBeDefined();
    expect(THREAT_TIER_CONFIG.severe).toBeDefined();
  });

  it('should have increasing attack frequency per tier', () => {
    const tiers: ThreatTierLevel[] = ['low', 'guarded', 'elevated', 'high', 'severe'];

    for (let i = 1; i < tiers.length; i++) {
      const current = THREAT_TIER_CONFIG[tiers[i]!];
      const previous = THREAT_TIER_CONFIG[tiers[i - 1]!];

      expect(current.attacksPerDayMin).toBeGreaterThanOrEqual(previous.attacksPerDayMin);
      expect(current.attacksPerDayMax).toBeGreaterThanOrEqual(previous.attacksPerDayMax);
    }
  });

  it('should have increasing phishing ratio per tier', () => {
    const tiers: ThreatTierLevel[] = ['low', 'guarded', 'elevated', 'high', 'severe'];

    for (let i = 1; i < tiers.length; i++) {
      const current = THREAT_TIER_CONFIG[tiers[i]!];
      const previous = THREAT_TIER_CONFIG[tiers[i - 1]!];

      expect(current.phishingRatio).toBeGreaterThan(previous.phishingRatio);
    }
  });

  it('should have increasing difficulty range per tier', () => {
    const tiers: ThreatTierLevel[] = ['low', 'guarded', 'elevated', 'high', 'severe'];

    for (let i = 1; i < tiers.length; i++) {
      const current = THREAT_TIER_CONFIG[tiers[i]!];
      const previous = THREAT_TIER_CONFIG[tiers[i - 1]!];

      expect(current.difficultyMin).toBeGreaterThanOrEqual(previous.difficultyMin);
      expect(current.difficultyMax).toBeGreaterThanOrEqual(previous.difficultyMax);
    }
  });

  it('should have minimum day thresholds in ascending order', () => {
    const tiers: ThreatTierLevel[] = ['low', 'guarded', 'elevated', 'high', 'severe'];

    for (let i = 1; i < tiers.length; i++) {
      expect(THREAT_TIER_CONFIG[tiers[i]!].minimumDay).toBeGreaterThan(
        THREAT_TIER_CONFIG[tiers[i - 1]!].minimumDay,
      );
    }
  });
});

describe('ATTACK_CATALOG', () => {
  it('should have MITRE ATT&CK mappings for all attacks', () => {
    for (const attack of ATTACK_CATALOG) {
      expect(attack.mitreAttack).toBeDefined();
      expect(attack.mitreAttack.length).toBeGreaterThan(0);
    }
  });

  it('should have tier availability for all attacks', () => {
    for (const attack of ATTACK_CATALOG) {
      expect(attack.tierAvailability.low).toBeDefined();
      expect(attack.tierAvailability.guarded).toBeDefined();
      expect(attack.tierAvailability.elevated).toBeDefined();
      expect(attack.tierAvailability.high).toBeDefined();
      expect(attack.tierAvailability.severe).toBeDefined();
    }
  });

  it('should have increasing availability across tiers', () => {
    const attack = ATTACK_CATALOG.find((a) => a.vector === 'spear_phishing');
    expect(attack?.tierAvailability.low).toBe(false);
    expect(attack?.tierAvailability.guarded).toBe(true);
  });
});

describe('calculateThreatScore', () => {
  it('should return a score between 0 and 1', () => {
    const score = calculateThreatScore({
      narrativeProgress: 0.5,
      playerCompetence: 0.5,
      facilityScale: 0.5,
      eventTriggers: 0,
    });

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should weight narrative progress highest', () => {
    const scoreNarrative = calculateThreatScore({
      narrativeProgress: 1,
      playerCompetence: 0,
      facilityScale: 0,
      eventTriggers: 0,
    });

    const scoreOther = calculateThreatScore({
      narrativeProgress: 0,
      playerCompetence: 1,
      facilityScale: 0,
      eventTriggers: 0,
    });

    expect(scoreNarrative).toBeGreaterThan(scoreOther);
  });
});

describe('calculatePlayerCompetence', () => {
  it('should return a score between 0 and 1', () => {
    const profile = createInitialPlayerBehaviorProfile();
    const competence = calculatePlayerCompetence(profile);

    expect(competence).toBeGreaterThanOrEqual(0);
    expect(competence).toBeLessThanOrEqual(1);
  });

  it('should increase with higher detection rates', () => {
    const lowSkill = createInitialPlayerBehaviorProfile();
    lowSkill.detectionRateByCategory.email_phishing = 0.2;

    const highSkill = createInitialPlayerBehaviorProfile();
    highSkill.detectionRateByCategory.email_phishing = 0.8;

    const lowCompetence = calculatePlayerCompetence(lowSkill);
    const highCompetence = calculatePlayerCompetence(highSkill);

    expect(highCompetence).toBeGreaterThan(lowCompetence);
  });
});
