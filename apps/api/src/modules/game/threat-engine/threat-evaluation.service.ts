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

export class ThreatEvaluationService {
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

        switch (attack.vector) {
          case 'email_phishing':
            weight *= 1.0 - detectionRate * 0.7;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'spear_phishing':
            weight *= 1.0 - detectionRate * 0.6;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'bec':
            weight *= 1.0 - detectionRate * 0.5;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'supply_chain':
            weight *= 1.0 + detectionRate * 0.5;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'insider_threat':
            weight *= 1.0 + effectiveSecurityToolCoverage * 0.4;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'apt_campaign':
            weight *= 1.0 + calculatePlayerCompetence(playerProfile) * 0.6;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'zero_day':
            weight *= 1.0 + calculatePlayerCompetence(playerProfile) * 0.8;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'brute_force':
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'ddos':
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'coordinated_attack':
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'whaling':
            weight *= 1.0 - detectionRate * 0.65;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
          case 'credential_harvesting':
            weight *= 1.0 - detectionRate * 0.55;
            weight *= 1.0 + breachModifier;
            weight *= 1.0 + threatProbabilityBonus;
            break;
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
