import { describe, it, expect, beforeEach } from 'vitest';

import {
  THREAT_TIER_CONFIG,
  ATTACK_CATALOG,
  type AttackVector,
  createInitialPlayerBehaviorProfile,
  calculatePlayerCompetence,
} from '@the-dmz/shared/game';

import { ThreatEvaluationService } from '../threat-evaluation.service.js';

describe('ThreatEvaluationService', () => {
  let service: ThreatEvaluationService;

  beforeEach(() => {
    service = new ThreatEvaluationService();
  });

  describe('calculateAttackWeights', () => {
    describe('email_phishing vector (coefficient 0.7)', () => {
      it('should apply detection rate penalty with coefficient 0.7', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;

        const weights = service.calculateAttackWeights('low', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.7);

        expect(weights.email_phishing).toBeCloseTo(expectedWeight, 10);
      });

      it('should reduce weight when detection rate increases', () => {
        const lowDetection = createInitialPlayerBehaviorProfile();
        lowDetection.detectionRateByCategory.email_phishing = 0.2;

        const highDetection = createInitialPlayerBehaviorProfile();
        highDetection.detectionRateByCategory.email_phishing = 0.8;

        const weightsLow = service.calculateAttackWeights('low', lowDetection, null);
        const weightsHigh = service.calculateAttackWeights('low', highDetection, null);

        expect(weightsHigh.email_phishing).toBeLessThan(weightsLow.email_phishing);
      });
    });

    describe('spear_phishing vector (coefficient 0.6)', () => {
      it('should apply detection rate penalty with coefficient 0.6', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.spear_phishing = 0.5;

        const weights = service.calculateAttackWeights('guarded', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'spear_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.6);

        expect(weights.spear_phishing).toBeCloseTo(expectedWeight, 10);
      });
    });

    describe('bec vector (coefficient 0.5)', () => {
      it('should apply detection rate penalty with coefficient 0.5', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.bec = 0.5;

        const weights = service.calculateAttackWeights('elevated', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'bec')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.5);

        expect(weights.bec).toBeCloseTo(expectedWeight, 10);
      });

      it('should be available in elevated tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('elevated', profile, null);

        expect(weights.bec).toBeDefined();
        expect(THREAT_TIER_CONFIG.elevated.availableVectors).toContain('bec');
      });

      it('should be available in high tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('high', profile, null);

        expect(weights.bec).toBeDefined();
        expect(THREAT_TIER_CONFIG.high.availableVectors).toContain('bec');
      });

      it('should be available in severe tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('severe', profile, null);

        expect(weights.bec).toBeDefined();
        expect(THREAT_TIER_CONFIG.severe.availableVectors).toContain('bec');
      });

      it('should not be available in low tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('low', profile, null);

        expect(weights.bec).toBeUndefined();
      });

      it('should not be available in guarded tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('guarded', profile, null);

        expect(weights.bec).toBeUndefined();
      });

      it('should reduce weight when detection rate increases for bec', () => {
        const lowDetection = createInitialPlayerBehaviorProfile();
        lowDetection.detectionRateByCategory.bec = 0.2;

        const highDetection = createInitialPlayerBehaviorProfile();
        highDetection.detectionRateByCategory.bec = 0.8;

        const weightsLow = service.calculateAttackWeights('elevated', lowDetection, null);
        const weightsHigh = service.calculateAttackWeights('elevated', highDetection, null);

        expect(weightsHigh.bec).toBeLessThan(weightsLow.bec);
      });
    });

    describe('credential_harvesting vector (coefficient 0.55)', () => {
      it('should apply detection rate penalty with coefficient 0.55', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.credential_harvesting = 0.5;

        const weights = service.calculateAttackWeights('guarded', profile, null);

        const baseWeight = ATTACK_CATALOG.find(
          (a) => a.vector === 'credential_harvesting',
        )!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.55);

        expect(weights.credential_harvesting).toBeCloseTo(expectedWeight, 10);
      });
    });

    describe('supply_chain vector (positive coefficient 0.5)', () => {
      it('should apply detection rate with positive sign', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.supply_chain = 0.5;

        const weights = service.calculateAttackWeights('elevated', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'supply_chain')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 + 0.5 * 0.5);

        expect(weights.supply_chain).toBeCloseTo(expectedWeight, 10);
      });

      it('should increase weight when detection rate increases (opposite of phishing)', () => {
        const lowDetection = createInitialPlayerBehaviorProfile();
        lowDetection.detectionRateByCategory.supply_chain = 0.2;

        const highDetection = createInitialPlayerBehaviorProfile();
        highDetection.detectionRateByCategory.supply_chain = 0.8;

        const weightsLow = service.calculateAttackWeights('elevated', lowDetection, null);
        const weightsHigh = service.calculateAttackWeights('elevated', highDetection, null);

        expect(weightsHigh.supply_chain).toBeGreaterThan(weightsLow.supply_chain);
      });
    });

    describe('insider_threat vector (uses securityToolCoverage)', () => {
      it('should use securityToolCoverage instead of detectionRate', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.securityToolCoverage = 0.5;

        const weights = service.calculateAttackWeights('elevated', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'insider_threat')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 + 0.5 * 0.4);

        expect(weights.insider_threat).toBeCloseTo(expectedWeight, 10);
      });

      it('should increase weight with higher security tool coverage', () => {
        const lowCoverage = createInitialPlayerBehaviorProfile();
        lowCoverage.securityToolCoverage = 0.2;

        const highCoverage = createInitialPlayerBehaviorProfile();
        highCoverage.securityToolCoverage = 0.8;

        const weightsLow = service.calculateAttackWeights('elevated', lowCoverage, null);
        const weightsHigh = service.calculateAttackWeights('elevated', highCoverage, null);

        expect(weightsHigh.insider_threat).toBeGreaterThan(weightsLow.insider_threat);
      });
    });

    describe('apt_campaign vector (uses player competence 0.6)', () => {
      it('should use calculatePlayerCompetence with coefficient 0.6', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const competence = calculatePlayerCompetence(profile);

        const weights = service.calculateAttackWeights('high', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'apt_campaign')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 + competence * 0.6);

        expect(weights.apt_campaign).toBeCloseTo(expectedWeight, 10);
      });
    });

    describe('zero_day vector (uses player competence 0.8)', () => {
      it('should use calculatePlayerCompetence with coefficient 0.8', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const competence = calculatePlayerCompetence(profile);

        const weights = service.calculateAttackWeights('severe', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'zero_day')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 + competence * 0.8);

        expect(weights.zero_day).toBeCloseTo(expectedWeight, 10);
      });

      it('should weight zero_day higher than apt_campaign due to higher coefficient', () => {
        const profile = createInitialPlayerBehaviorProfile();

        const weights = service.calculateAttackWeights('severe', profile, null);

        expect(weights.zero_day).toBeGreaterThan(weights.apt_campaign);
      });
    });

    describe('brute_force, ddos, coordinated_attack vectors (no detection rate)', () => {
      it('should not be affected by detection rate for brute_force', () => {
        const lowDetection = createInitialPlayerBehaviorProfile();
        lowDetection.detectionRateByCategory.brute_force = 0.2;

        const highDetection = createInitialPlayerBehaviorProfile();
        highDetection.detectionRateByCategory.brute_force = 0.8;

        const weightsLow = service.calculateAttackWeights('elevated', lowDetection, null);
        const weightsHigh = service.calculateAttackWeights('elevated', highDetection, null);

        expect(weightsHigh.brute_force).toEqual(weightsLow.brute_force);
      });

      it('should not be affected by detection rate for ddos', () => {
        const lowDetection = createInitialPlayerBehaviorProfile();
        lowDetection.detectionRateByCategory.ddos = 0.2;

        const highDetection = createInitialPlayerBehaviorProfile();
        highDetection.detectionRateByCategory.ddos = 0.8;

        const weightsLow = service.calculateAttackWeights('high', lowDetection, null);
        const weightsHigh = service.calculateAttackWeights('high', highDetection, null);

        expect(weightsHigh.ddos).toEqual(weightsLow.ddos);
      });

      it('should not be affected by detection rate for coordinated_attack', () => {
        const lowDetection = createInitialPlayerBehaviorProfile();
        lowDetection.detectionRateByCategory.coordinated_attack = 0.2;

        const highDetection = createInitialPlayerBehaviorProfile();
        highDetection.detectionRateByCategory.coordinated_attack = 0.8;

        const weightsLow = service.calculateAttackWeights('high', lowDetection, null);
        const weightsHigh = service.calculateAttackWeights('high', highDetection, null);

        expect(weightsHigh.coordinated_attack).toEqual(weightsLow.coordinated_attack);
      });
    });

    describe('whaling vector (coefficient 0.65)', () => {
      it('should apply detection rate penalty with coefficient 0.65', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.whaling = 0.5;

        const weights = service.calculateAttackWeights('severe', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'whaling')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.65);

        expect(weights.whaling).toBeCloseTo(expectedWeight, 10);
      });
    });

    describe('breach modifier application', () => {
      it('should multiply weight by (1 + breachModifier) for email_phishing', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;

        const securityDeltas = {
          breachProbabilityModifier: 0.2,
          detectionProbabilityModifier: 0,
          mitigationBonus: 0,
          threatVectorModifiers: {},
          securityToolCoverage: 0,
        };

        const weights = service.calculateAttackWeights('low', profile, null, securityDeltas);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.7) * (1.0 + 0.2);

        expect(weights.email_phishing).toBeCloseTo(expectedWeight, 10);
      });

      it('should multiply weight by (1 + breachModifier) for bec', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.bec = 0.5;

        const securityDeltas = {
          breachProbabilityModifier: 0.3,
          detectionProbabilityModifier: 0,
          mitigationBonus: 0,
          threatVectorModifiers: {},
          securityToolCoverage: 0,
        };

        const weights = service.calculateAttackWeights('elevated', profile, null, securityDeltas);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'bec')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.5) * (1.0 + 0.3);

        expect(weights.bec).toBeCloseTo(expectedWeight, 10);
      });

      it('should apply negative breach modifier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;

        const securityDeltas = {
          breachProbabilityModifier: -0.1,
          detectionProbabilityModifier: 0,
          mitigationBonus: 0,
          threatVectorModifiers: {},
          securityToolCoverage: 0,
        };

        const weights = service.calculateAttackWeights('low', profile, null, securityDeltas);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.7) * (1.0 - 0.1);

        expect(weights.email_phishing).toBeCloseTo(expectedWeight, 10);
      });
    });

    describe('threatProbabilityBonus application', () => {
      it('should add threatProbabilityBonus to weight', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;

        const weights = service.calculateAttackWeights('low', profile, null, undefined, 0.1);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.7) * (1.0 + 0.1);

        expect(weights.email_phishing).toBeCloseTo(expectedWeight, 10);
      });

      it('should apply negative threatProbabilityBonus', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;

        const weights = service.calculateAttackWeights('low', profile, null, undefined, -0.2);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.7) * (1.0 - 0.2);

        expect(weights.email_phishing).toBeCloseTo(expectedWeight, 10);
      });

      it('should reduce weight with negative threatProbabilityBonus for bec', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.bec = 0.5;

        const weightsWithNegativeBonus = service.calculateAttackWeights(
          'elevated',
          profile,
          null,
          undefined,
          -0.15,
        );

        const weightsWithZeroBonus = service.calculateAttackWeights(
          'elevated',
          profile,
          null,
          undefined,
          0,
        );

        expect(weightsWithNegativeBonus.bec).toBeLessThan(weightsWithZeroBonus.bec);
      });

      it('should stack threatProbabilityBonus with other modifiers', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.bec = 0.5;

        const securityDeltas = {
          breachProbabilityModifier: 0.1,
          detectionProbabilityModifier: 0,
          mitigationBonus: 0,
          threatVectorModifiers: {},
          securityToolCoverage: 0,
        };

        const weights = service.calculateAttackWeights(
          'elevated',
          profile,
          null,
          securityDeltas,
          0.05,
        );

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'bec')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0.5 * 0.5) * (1.0 + 0.1) * (1.0 + 0.05);

        expect(weights.bec).toBeCloseTo(expectedWeight, 10);
      });
    });

    describe('lastVector penalty', () => {
      it('should apply 0.5x multiplier when attack matches lastVector', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;

        const weightsWithLastVector = service.calculateAttackWeights(
          'low',
          profile,
          'email_phishing',
        );
        const weightsWithoutLastVector = service.calculateAttackWeights('low', profile, null);

        expect(weightsWithLastVector.email_phishing).toBeCloseTo(
          weightsWithoutLastVector.email_phishing * 0.5,
          10,
        );
      });

      it('should apply lastVector penalty to bec when it was the last vector', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.bec = 0.5;

        const weightsWithLastVector = service.calculateAttackWeights('elevated', profile, 'bec');
        const weightsWithoutLastVector = service.calculateAttackWeights('elevated', profile, null);

        expect(weightsWithLastVector.bec).toBeCloseTo(weightsWithoutLastVector.bec * 0.5, 10);
      });

      it('should not affect other vectors when lastVector is different', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;
        profile.detectionRateByCategory.spear_phishing = 0.5;

        const weightsWithLastVector = service.calculateAttackWeights(
          'guarded',
          profile,
          'email_phishing',
        );
        const weightsWithoutLastVector = service.calculateAttackWeights('guarded', profile, null);

        expect(weightsWithLastVector.spear_phishing).toEqual(
          weightsWithoutLastVector.spear_phishing,
        );
      });
    });

    describe('tier availability', () => {
      it('should only include vectors available for the tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('low', profile, null);

        expect(Object.keys(weights)).toHaveLength(1);
        expect(weights.email_phishing).toBeDefined();
      });

      it('should include multiple vectors for elevated tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('elevated', profile, null);

        expect(Object.keys(weights).length).toBeGreaterThan(1);
      });

      it('should include bec in elevated tier', () => {
        const profile = createInitialPlayerBehaviorProfile();
        const weights = service.calculateAttackWeights('elevated', profile, null);

        expect(weights.bec).toBeDefined();
      });
    });

    describe('detection rate clamping', () => {
      it('should clamp detection rate to [0, 1] range - low bound', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = -0.5;

        const weights = service.calculateAttackWeights('low', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 0 * 0.7);

        expect(weights.email_phishing).toBeCloseTo(expectedWeight, 10);
        expect(weights.email_phishing).toBeGreaterThan(0);
      });

      it('should clamp detection rate to [0, 1] range - high bound', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 1.5;

        const weights = service.calculateAttackWeights('low', profile, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        const expectedWeight = baseWeight * (1.0 - 1 * 0.7);

        expect(weights.email_phishing).toBeCloseTo(expectedWeight, 10);
      });

      it('should clamp detection rate for bec vector', () => {
        const profileLow = createInitialPlayerBehaviorProfile();
        profileLow.detectionRateByCategory.bec = -0.5;

        const profileHigh = createInitialPlayerBehaviorProfile();
        profileHigh.detectionRateByCategory.bec = 1.5;

        const weightsLow = service.calculateAttackWeights('elevated', profileLow, null);
        const weightsHigh = service.calculateAttackWeights('elevated', profileHigh, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'bec')!.baseWeight;

        const expectedLow = baseWeight * (1.0 - 0 * 0.5);
        const expectedHigh = baseWeight * (1.0 - 1 * 0.5);

        expect(weightsLow.bec).toBeCloseTo(expectedLow, 10);
        expect(weightsHigh.bec).toBeCloseTo(expectedHigh, 10);
      });
    });

    describe('without player profile', () => {
      it('should return base weights when no player profile provided', () => {
        const weights = service.calculateAttackWeights('low', undefined, null);

        const baseWeight = ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight;
        expect(weights.email_phishing).toBeCloseTo(baseWeight, 10);
      });

      it('should not apply any modifiers without player profile', () => {
        const weights = service.calculateAttackWeights('elevated', undefined, null);

        const vectors = THREAT_TIER_CONFIG.elevated.availableVectors;
        for (const vector of vectors) {
          const baseWeight = ATTACK_CATALOG.find((a) => a.vector === vector)!.baseWeight;
          expect(weights[vector]).toBeCloseTo(baseWeight, 10);
        }
      });
    });

    describe('weight formula consistency', () => {
      it('should apply breach modifier to all detection-rate-based vectors', () => {
        const profile = createInitialPlayerBehaviorProfile();
        profile.detectionRateByCategory.email_phishing = 0.5;
        profile.detectionRateByCategory.spear_phishing = 0.5;
        profile.detectionRateByCategory.bec = 0.5;

        const securityDeltas = {
          breachProbabilityModifier: 0.25,
          detectionProbabilityModifier: 0,
          mitigationBonus: 0,
          threatVectorModifiers: {},
          securityToolCoverage: 0,
        };

        const weights = service.calculateAttackWeights('guarded', profile, null, securityDeltas);

        expect(weights.email_phishing).toBeGreaterThan(
          ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight,
        );
        expect(weights.spear_phishing).toBeGreaterThan(
          ATTACK_CATALOG.find((a) => a.vector === 'spear_phishing')!.baseWeight,
        );
        expect(weights.bec).toBeGreaterThan(
          ATTACK_CATALOG.find((a) => a.vector === 'bec')!.baseWeight,
        );
      });

      it('should apply threatProbabilityBonus to all vectors', () => {
        const profile = createInitialPlayerBehaviorProfile();

        const weights = service.calculateAttackWeights('low', profile, null, undefined, 0.5);

        expect(weights.email_phishing).toBeGreaterThan(
          ATTACK_CATALOG.find((a) => a.vector === 'email_phishing')!.baseWeight,
        );
      });
    });
  });

  describe('weightedRandomVector', () => {
    it('should return a vector from the available list', () => {
      const mockRandom = {
        nextFloat: () => 0.5,
      };

      const weights: Record<AttackVector, number> = {
        email_phishing: 0.5,
        spear_phishing: 0.3,
        credential_harvesting: 0.2,
      };

      const available: AttackVector[] = [
        'email_phishing',
        'spear_phishing',
        'credential_harvesting',
      ];

      const result = service.weightedRandomVector(mockRandom, weights, available);

      expect(available).toContain(result);
    });

    it('should return the last vector when random value exceeds all weights', () => {
      const mockRandom = {
        nextFloat: () => 0.0,
      };

      const weights: Record<AttackVector, number> = {
        email_phishing: 0.1,
        spear_phishing: 0.1,
      };

      const available: AttackVector[] = ['email_phishing', 'spear_phishing'];

      const result = service.weightedRandomVector(mockRandom, weights, available);

      expect(result).toBe('spear_phishing');
    });
  });

  describe('deriveThreatSeed', () => {
    it('should return consistent seed for same inputs', () => {
      const seed1 = service.deriveThreatSeed(12345, 5, 2);
      const seed2 = service.deriveThreatSeed(12345, 5, 2);

      expect(seed1).toBe(seed2);
    });

    it('should return different seeds for different day numbers', () => {
      const seed1 = service.deriveThreatSeed(12345, 5, 2);
      const seed2 = service.deriveThreatSeed(12345, 10, 2);

      expect(seed1).not.toBe(seed2);
    });

    it('should return different seeds for different party sizes', () => {
      const seed1 = service.deriveThreatSeed(12345, 5, 1);
      const seed2 = service.deriveThreatSeed(12345, 5, 2);

      expect(seed1).not.toBe(seed2);
    });
  });
});
