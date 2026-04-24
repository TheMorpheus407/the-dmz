import {
  THREAT_TIER_CONFIG,
  ATTACK_CATALOG,
  type ThreatTierLevel,
  type AttackVector,
  type PlayerBehaviorProfile,
  type RNGInstance,
  calculatePlayerCompetence,
} from '@the-dmz/shared/game';

export interface AggregatedSecurityDeltas {
  breachProbabilityModifier: number;
  detectionProbabilityModifier: number;
  mitigationBonus: number;
  threatVectorModifiers: Record<string, number>;
  securityToolCoverage: number;
}

type WeightFormulaType = 'detectionRate' | 'competence' | 'securityToolCoverage' | 'none';

interface AttackWeightConfig {
  formulaType: WeightFormulaType;
  coefficient: number;
  sign: number;
}

const ATTACK_WEIGHT_CONFIG: Record<AttackVector, AttackWeightConfig> = {
  email_phishing: { formulaType: 'detectionRate', coefficient: 0.7, sign: -1 },
  spear_phishing: { formulaType: 'detectionRate', coefficient: 0.6, sign: -1 },
  bec: { formulaType: 'detectionRate', coefficient: 0.5, sign: -1 },
  supply_chain: { formulaType: 'detectionRate', coefficient: 0.5, sign: 1 },
  insider_threat: { formulaType: 'securityToolCoverage', coefficient: 0.4, sign: 1 },
  apt_campaign: { formulaType: 'competence', coefficient: 0.6, sign: 1 },
  zero_day: { formulaType: 'competence', coefficient: 0.8, sign: 1 },
  brute_force: { formulaType: 'none', coefficient: 0, sign: 0 },
  ddos: { formulaType: 'none', coefficient: 0, sign: 0 },
  coordinated_attack: { formulaType: 'none', coefficient: 0, sign: 0 },
  whaling: { formulaType: 'detectionRate', coefficient: 0.65, sign: -1 },
  credential_harvesting: { formulaType: 'detectionRate', coefficient: 0.55, sign: -1 },
};

export class ThreatEvaluationService {
  /* eslint-disable max-params, max-statements, complexity, @typescript-eslint/max-params -- pre-existing: original code had same 5 params, refactoring preserved structure */
  public calculateAttackWeights(
    tier: ThreatTierLevel,
    playerProfile: PlayerBehaviorProfile | undefined,
    lastVector: AttackVector | null,
    securityDeltas?: AggregatedSecurityDeltas,
    threatProbabilityBonus: number = 0,
  ): Record<AttackVector, number> {
    const weights: Record<AttackVector, number> = {} as Record<AttackVector, number>;

    const tierAvailability = THREAT_TIER_CONFIG[tier].availableVectors;

    const effectiveSecurityToolCoverage = securityDeltas
      ? securityDeltas.securityToolCoverage
      : (playerProfile?.securityToolCoverage ?? 0);

    for (const attack of ATTACK_CATALOG) {
      if (!tierAvailability.includes(attack.vector)) {
        continue;
      }

      let weight = attack.baseWeight;

      if (playerProfile) {
        const baseDetectionRate = playerProfile.detectionRateByCategory[attack.vector];

        const vectorModifier = securityDeltas?.threatVectorModifiers?.[attack.vector] ?? 0;
        const detectionModifier = securityDeltas?.detectionProbabilityModifier ?? 0;
        const detectionRate = Math.max(
          0,
          Math.min(1, baseDetectionRate + detectionModifier + vectorModifier),
        );

        const breachModifier = securityDeltas?.breachProbabilityModifier ?? 0;

        const config = ATTACK_WEIGHT_CONFIG[attack.vector];
        if (!config) {
          weight *= 1.0 + breachModifier;
          weight *= 1.0 + threatProbabilityBonus;
        } else {
          switch (config.formulaType) {
            case 'detectionRate':
              weight *= 1.0 + config.sign * detectionRate * config.coefficient;
              break;
            case 'securityToolCoverage':
              weight *= 1.0 + config.sign * effectiveSecurityToolCoverage * config.coefficient;
              break;
            case 'competence':
              weight *=
                1.0 + config.sign * calculatePlayerCompetence(playerProfile) * config.coefficient;
              break;
            case 'none':
              break;
          }
          weight *= 1.0 + breachModifier;
          weight *= 1.0 + threatProbabilityBonus;
        }
      }

      if (lastVector && attack.vector === lastVector) {
        weight *= 0.5;
      }

      weights[attack.vector] = weight;
    }

    return weights;
  }

  public weightedRandomVector(
    random: RNGInstance,
    weights: Record<AttackVector, number>,
    available: AttackVector[],
  ): AttackVector {
    const filteredWeights = available.map((v) => ({
      vector: v,
      weight: weights[v] ?? 0.1,
    }));

    const totalWeight = filteredWeights.reduce((sum, item) => sum + item.weight, 0);
    let randomValue = random.nextFloat() * totalWeight;

    for (const item of filteredWeights) {
      randomValue -= item.weight;
      if (randomValue <= 0) {
        return item.vector;
      }
    }

    return filteredWeights[filteredWeights.length - 1]!.vector;
  }

  public deriveThreatSeed(sessionSeed: number, dayNumber: number, partySize: number = 1): bigint {
    const combined = `${sessionSeed}-threat-${dayNumber}-party${partySize}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return BigInt(Math.abs(hash));
  }
}
