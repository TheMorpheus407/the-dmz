import {
  THREAT_TIER_CONFIG,
  NARRATIVE_MESSAGES,
  type ThreatTierLevel,
  type PlayerBehaviorProfile,
  type GameState,
  type AttackVector,
  type ThreatTierChangeEvent,
  createInitialPlayerBehaviorProfile,
  calculatePlayerCompetence,
  calculateThreatScore,
  getThreatTierByScore,
} from '@the-dmz/shared/game';

export interface ThreatEngineConfig {
  hysteresisBuffer: number;
  minHoldDays: number;
}

const DEFAULT_CONFIG: ThreatEngineConfig = {
  hysteresisBuffer: 0.05,
  minHoldDays: 2,
};

export interface PlayerProfileUpdate {
  detected: boolean;
  vector: AttackVector;
  responseTimeMs: number;
  verificationSteps: number;
  checkedHeaders: boolean;
  checkedUrl: boolean;
  requestedVerification: boolean;
}

export class ThreatDetectionService {
  private config: ThreatEngineConfig;
  private playerProfiles: Map<string, PlayerBehaviorProfile> = new Map();
  private currentThreatTiers: Map<string, ThreatTierLevel> = new Map();
  private lastTierChangeDays: Map<string, number> = new Map();

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
