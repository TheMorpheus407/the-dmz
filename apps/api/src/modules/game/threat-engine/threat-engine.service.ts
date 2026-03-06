import {
  THREAT_TIER_CONFIG,
  ATTACK_CATALOG,
  type ThreatTierLevel,
  type AttackVector,
  type GeneratedAttack,
  type PlayerBehaviorProfile,
  createInitialPlayerBehaviorProfile,
  calculateThreatScore,
  calculatePlayerCompetence,
  getThreatTierByScore,
  NARRATIVE_MESSAGES,
  type ThreatTierChangeEvent,
  type GameState,
  rng,
  type RNGInstance,
} from '@the-dmz/shared/game';

export interface ThreatEngineConfig {
  hysteresisBuffer: number;
  minHoldDays: number;
}

export interface AggregatedSecurityDeltas {
  breachProbabilityModifier: number;
  detectionProbabilityModifier: number;
  mitigationBonus: number;
  threatVectorModifiers: Record<string, number>;
  securityToolCoverage: number;
}

const DEFAULT_CONFIG: ThreatEngineConfig = {
  hysteresisBuffer: 0.05,
  minHoldDays: 2,
};

export interface ThreatGenerationResult {
  attacks: GeneratedAttack[];
  newThreatTier: ThreatTierLevel;
  tierChanged: boolean;
  narrativeMessage?: string;
}

export interface PlayerProfileUpdate {
  detected: boolean;
  vector: AttackVector;
  responseTimeMs: number;
  verificationSteps: number;
  checkedHeaders: boolean;
  checkedUrl: boolean;
  requestedVerification: boolean;
}

export class ThreatEngineService {
  private config: ThreatEngineConfig;
  private playerProfiles: Map<string, PlayerBehaviorProfile> = new Map();
  private currentThreatTiers: Map<string, ThreatTierLevel> = new Map();
  private lastTierChangeDays: Map<string, number> = new Map();
  private intensityGauges: Map<string, number> = new Map();

  constructor(config: Partial<ThreatEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public getOrCreatePlayerProfile(sessionId: string): PlayerBehaviorProfile {
    let profile = this.playerProfiles.get(sessionId);
    if (!profile) {
      profile = createInitialPlayerBehaviorProfile();
      this.playerProfiles.set(sessionId, profile);
    }
    return profile;
  }

  public getPlayerProfile(sessionId: string): PlayerBehaviorProfile | undefined {
    return this.playerProfiles.get(sessionId);
  }

  public updatePlayerProfile(sessionId: string, update: PlayerProfileUpdate): void {
    const profile = this.getOrCreatePlayerProfile(sessionId);

    if (update.detected) {
      profile.streakCorrect++;
      profile.streakIncorrect = 0;
      profile.detectionRateByCategory[update.vector] = Math.min(
        1,
        profile.detectionRateByCategory[update.vector] + 0.05,
      );
    } else {
      profile.streakIncorrect++;
      profile.streakCorrect = 0;
      profile.detectionRateByCategory[update.vector] = Math.max(
        0,
        profile.detectionRateByCategory[update.vector] - 0.05,
      );
    }

    const currentResponseTime = profile.responseTimeByCategory[update.vector];
    profile.responseTimeByCategory[update.vector] =
      currentResponseTime * 0.7 + (update.responseTimeMs / 1000) * 0.3;

    profile.verificationDepth = profile.verificationDepth * 0.9 + update.verificationSteps * 0.1;
    profile.headerCheckRate = profile.headerCheckRate * 0.9 + (update.checkedHeaders ? 1 : 0) * 0.1;
    profile.urlInspectionRate = profile.urlInspectionRate * 0.9 + (update.checkedUrl ? 1 : 0) * 0.1;
    profile.crossReferenceRate =
      profile.crossReferenceRate * 0.9 + (update.requestedVerification ? 1 : 0) * 0.1;
  }

  public getThreatTier(sessionId: string): ThreatTierLevel {
    return this.currentThreatTiers.get(sessionId) ?? 'low';
  }

  public setThreatTier(sessionId: string, tier: ThreatTierLevel): void {
    this.currentThreatTiers.set(sessionId, tier);
  }

  public calculateThreatTier(
    state: GameState,
    sessionId: string,
  ): { tier: ThreatTierLevel; changed: boolean; event?: ThreatTierChangeEvent } {
    const currentTier = this.getThreatTier(sessionId);
    const lastChangeDay = this.lastTierChangeDays.get(sessionId) ?? 0;
    const daysSinceLastChange = state.currentDay - lastChangeDay;

    if (daysSinceLastChange < this.config.minHoldDays) {
      return { tier: currentTier, changed: false };
    }

    const playerProfile = this.getPlayerProfile(sessionId);
    const playerCompetence = playerProfile ? calculatePlayerCompetence(playerProfile) : 0.5;

    const narrativeProgress = Math.min(1, state.currentDay / 30);
    const facilityScale = Math.min(
      1,
      state.facility.clients.length / 30 + state.facility.attackSurfaceScore / 100,
    );
    const eventTriggers = 0;

    const threatScore = calculateThreatScore({
      narrativeProgress,
      playerCompetence,
      facilityScale,
      eventTriggers,
    });

    let newTier = getThreatTierByScore(threatScore, state.currentDay);

    const canEscalate = (_from: ThreatTierLevel, to: ThreatTierLevel): boolean => {
      const toConfig = THREAT_TIER_CONFIG[to];
      return threatScore >= toConfig.threatScoreThreshold + this.config.hysteresisBuffer;
    };

    const canDeescalate = (from: ThreatTierLevel, _to: ThreatTierLevel): boolean => {
      const fromConfig = THREAT_TIER_CONFIG[from];
      return threatScore <= fromConfig.threatScoreThreshold - this.config.hysteresisBuffer;
    };

    const tierProgression: ThreatTierLevel[] = ['low', 'guarded', 'elevated', 'high', 'severe'];
    const currentIndex = tierProgression.indexOf(currentTier);
    const newIndex = tierProgression.indexOf(newTier);

    if (newIndex > currentIndex) {
      if (!canEscalate(currentTier, newTier)) {
        newTier = currentTier;
      }
    } else if (newIndex < currentIndex) {
      if (!canDeescalate(currentTier, newTier)) {
        newTier = currentTier;
      }
    }

    if (newTier === currentTier) {
      return { tier: currentTier, changed: false };
    }

    this.currentThreatTiers.set(sessionId, newTier);
    this.lastTierChangeDays.set(sessionId, state.currentDay);

    const isEscalation = newIndex > currentIndex;
    const narrativeKey = isEscalation ? 'escalation' : 'deescalation';
    const narrativeMessage = NARRATIVE_MESSAGES[narrativeKey][newTier];

    return {
      tier: newTier,
      changed: true,
      event: {
        sessionId,
        previousTier: currentTier,
        newTier,
        reason: isEscalation ? 'escalation' : 'deescalation',
        narrativeMessage,
      },
    };
  }

  public generateAttacks(
    state: GameState,
    sessionId: string,
    dayNumber: number,
    securityDeltas?: AggregatedSecurityDeltas,
  ): ThreatGenerationResult {
    const tier = this.getThreatTier(sessionId);
    const tierConfig = THREAT_TIER_CONFIG[tier];

    const seed = this.deriveThreatSeed(state.seed, dayNumber);
    const random = rng.create(seed);

    const numAttacks = random.nextInt(tierConfig.attacksPerDayMin, tierConfig.attacksPerDayMax + 1);

    const attacks: GeneratedAttack[] = [];
    const playerProfile = this.getPlayerProfile(sessionId);

    const weights = this.calculateAttackWeights(
      tier,
      playerProfile,
      attacks.length > 0 && attacks[attacks.length - 1]
        ? attacks[attacks.length - 1]!.vector
        : null,
      securityDeltas,
    );

    for (let i = 0; i < numAttacks; i++) {
      const vector = this.weightedRandomVector(random, weights, tierConfig.availableVectors);

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

    const { tier: newThreatTier, changed } = this.calculateThreatTier(state, sessionId);

    const result: ThreatGenerationResult = {
      attacks,
      newThreatTier: changed ? newThreatTier : tier,
      tierChanged: changed,
    };

    if (changed) {
      result.narrativeMessage = NARRATIVE_MESSAGES['escalation'][newThreatTier];
    }

    return result;
  }

  private calculateAttackWeights(
    tier: ThreatTierLevel,
    playerProfile: PlayerBehaviorProfile | undefined,
    lastVector: AttackVector | null,
    securityDeltas?: AggregatedSecurityDeltas,
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
            break;
          case 'spear_phishing':
            weight *= 1.0 - detectionRate * 0.6;
            weight *= 1.0 + breachModifier;
            break;
          case 'bec':
            weight *= 1.0 - detectionRate * 0.5;
            weight *= 1.0 + breachModifier;
            break;
          case 'supply_chain':
            weight *= 1.0 + detectionRate * 0.5;
            weight *= 1.0 + breachModifier;
            break;
          case 'insider_threat':
            weight *= 1.0 + effectiveSecurityToolCoverage * 0.4;
            weight *= 1.0 + breachModifier;
            break;
          case 'apt_campaign':
            weight *= 1.0 + calculatePlayerCompetence(playerProfile) * 0.6;
            weight *= 1.0 + breachModifier;
            break;
          case 'zero_day':
            weight *= 1.0 + calculatePlayerCompetence(playerProfile) * 0.8;
            weight *= 1.0 + breachModifier;
            break;
          case 'brute_force':
            weight *= 1.0 + breachModifier;
            break;
          case 'ddos':
            weight *= 1.0 + breachModifier;
            break;
          case 'coordinated_attack':
            weight *= 1.0 + breachModifier;
            break;
          case 'whaling':
            weight *= 1.0 - detectionRate * 0.65;
            weight *= 1.0 + breachModifier;
            break;
          case 'credential_harvesting':
            weight *= 1.0 - detectionRate * 0.55;
            weight *= 1.0 + breachModifier;
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

  private weightedRandomVector(
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

  private deriveThreatSeed(sessionSeed: number, dayNumber: number): bigint {
    const combined = `${sessionSeed}-threat-${dayNumber}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return BigInt(Math.abs(hash));
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

  public calculateFacilityScale(state: GameState): number {
    const tierValues: Record<string, number> = {
      outpost: 0.2,
      station: 0.4,
      vault: 0.6,
      fortress: 0.8,
      citadel: 1.0,
    };

    const tierScale = tierValues[state.facility.tier] ?? 0.2;
    const clientScale = Math.min(1, state.facility.clients.length / 30);

    return (tierScale + clientScale) / 2;
  }
}
