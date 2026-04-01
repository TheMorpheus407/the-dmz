import {
  THREAT_TIER_CONFIG,
  type ThreatTierLevel,
  type GeneratedAttack,
  type GameState,
  type PartyDifficultyTier,
  NARRATIVE_MESSAGES,
  getCoopScalingForPartySize,
  calculateEffectiveScaling,
  rng,
  type CoopThreatScaling,
} from '@the-dmz/shared/game';

import type { ThreatDetectionService } from './threat-detection.service.js';
import type {
  ThreatEvaluationService,
  AggregatedSecurityDeltas,
} from './threat-evaluation.service.js';

export interface ThreatGenerationResult {
  attacks: GeneratedAttack[];
  newThreatTier: ThreatTierLevel;
  tierChanged: boolean;
  narrativeMessage?: string;
  coopScalingApplied: CoopThreatScaling | undefined;
}

export class ThreatResponseService {
  private intensityGauges: Map<string, number> = new Map();

  public generateAttacks(
    state: GameState,
    sessionId: string,
    dayNumber: number,
    threatDetection: ThreatDetectionService,
    threatEvaluation: ThreatEvaluationService,
    partySize?: number,
    difficultyTier?: PartyDifficultyTier,
    securityDeltas?: AggregatedSecurityDeltas,
  ): ThreatGenerationResult {
    const tier = threatDetection.getThreatTier(sessionId);
    const tierConfig = THREAT_TIER_CONFIG[tier];

    const effectivePartySize = partySize ?? state.partyContext?.partySize ?? 1;
    const effectiveDifficultyTier =
      difficultyTier ?? state.partyContext?.difficultyTier ?? 'standard';

    const coopScaling = getCoopScalingForPartySize(effectivePartySize);
    const effectiveScaling = calculateEffectiveScaling(coopScaling, effectiveDifficultyTier);

    const seed = threatEvaluation.deriveThreatSeed(state.seed, dayNumber, effectivePartySize);
    const random = rng.create(seed);

    let numAttacks: number;
    if (effectivePartySize <= 1) {
      numAttacks = random.nextInt(tierConfig.attacksPerDayMin, tierConfig.attacksPerDayMax + 1);
    } else {
      const scaledMin = Math.ceil(
        tierConfig.attacksPerDayMin * effectiveScaling.emailVolumeMultiplier,
      );
      const scaledMax = Math.ceil(
        tierConfig.attacksPerDayMax * effectiveScaling.emailVolumeMultiplier,
      );
      numAttacks = random.nextInt(scaledMin, Math.max(scaledMin, scaledMax));
    }

    const attacks: GeneratedAttack[] = [];
    const playerProfile = threatDetection.getPlayerProfile(sessionId);

    const weights = threatEvaluation.calculateAttackWeights(
      tier,
      playerProfile,
      attacks.length > 0 && attacks[attacks.length - 1]
        ? attacks[attacks.length - 1]!.vector
        : null,
      securityDeltas,
      effectiveScaling.threatProbabilityBonus,
    );

    for (let i = 0; i < numAttacks; i++) {
      const vector = threatEvaluation.weightedRandomVector(
        random,
        weights,
        tierConfig.availableVectors,
      );

      const maxDifficulty =
        tierConfig.difficultyMin === tierConfig.difficultyMax
          ? tierConfig.difficultyMax
          : tierConfig.difficultyMax + 1;
      const difficulty = random.nextInt(tierConfig.difficultyMin, maxDifficulty);

      const factions = [
        'sovereign_compact',
        'nexion_industries',
        'librarians',
        'hacktivists',
        'criminals',
      ];
      const faction = random.pick(factions);

      attacks.push({
        attackId: random.uuid(`attack-${dayNumber}-${i}`),
        vector,
        difficulty,
        faction,
        timestamp: new Date().toISOString(),
        isCampaignPart: false,
      });
    }

    const { tier: newThreatTier, changed } = threatDetection.calculateThreatTier(state, sessionId);

    const result: ThreatGenerationResult = {
      attacks,
      newThreatTier: changed ? newThreatTier : tier,
      tierChanged: changed,
      coopScalingApplied: effectivePartySize > 1 ? effectiveScaling : undefined,
    };

    if (changed) {
      result.narrativeMessage = NARRATIVE_MESSAGES['escalation'][newThreatTier];
    }

    return result;
  }

  public getIntensityGauge(sessionId: string): number {
    return this.intensityGauges.get(sessionId) ?? 0;
  }

  public updateIntensityGauge(
    sessionId: string,
    attacksThisDay: number,
    activeIncidents: number,
    recentBreach: boolean,
    timeSinceLastAttack: number,
  ): number {
    let gauge = this.getIntensityGauge(sessionId);

    gauge += attacksThisDay * 0.1;
    gauge += activeIncidents * 0.15;
    gauge += recentBreach ? 0.3 : 0;
    gauge -= timeSinceLastAttack * 0.02;

    gauge = Math.max(0, Math.min(1, gauge));
    this.intensityGauges.set(sessionId, gauge);

    return gauge;
  }

  public shouldTriggerBreathingRoom(sessionId: string): boolean {
    const gauge = this.getIntensityGauge(sessionId);
    return gauge >= 0.85;
  }
}
