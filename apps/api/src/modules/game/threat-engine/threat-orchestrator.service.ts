import {
  type ThreatTierLevel,
  type GameState,
  type PartyDifficultyTier,
  type ThreatTierChangeEvent,
} from '@the-dmz/shared/game';

export { ThreatDetectionService } from './threat-detection.service.js';
export { ThreatEvaluationService } from './threat-evaluation.service.js';
export { ThreatResponseService } from './threat-response.service.js';
export type { ThreatEngineConfig } from './threat-detection.service.js';
export type { AggregatedSecurityDeltas } from './threat-evaluation.service.js';
export type { PlayerProfileUpdate } from './threat-detection.service.js';
export type { ThreatGenerationResult } from './threat-response.service.js';

import {
  ThreatDetectionService,
  type ThreatEngineConfig,
  type PlayerProfileUpdate,
} from './threat-detection.service.js';
import {
  ThreatEvaluationService,
  type AggregatedSecurityDeltas,
} from './threat-evaluation.service.js';
import { ThreatResponseService, type ThreatGenerationResult } from './threat-response.service.js';

const DEFAULT_CONFIG: ThreatEngineConfig = {
  hysteresisBuffer: 0.05,
  minHoldDays: 2,
};

export class ThreatOrchestrator {
  private config: ThreatEngineConfig;
  private threatDetection: ThreatDetectionService;
  private threatEvaluation: ThreatEvaluationService;
  private threatResponse: ThreatResponseService;

  constructor(config: Partial<ThreatEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.threatDetection = new ThreatDetectionService(this.config);
    this.threatEvaluation = new ThreatEvaluationService();
    this.threatResponse = new ThreatResponseService();
  }

  public getOrCreatePlayerProfile(sessionId: string) {
    return this.threatDetection.getOrCreatePlayerProfile(sessionId);
  }

  public getPlayerProfile(sessionId: string) {
    return this.threatDetection.getPlayerProfile(sessionId);
  }

  public updatePlayerProfile(sessionId: string, update: PlayerProfileUpdate): void {
    return this.threatDetection.updatePlayerProfile(sessionId, update);
  }

  public getThreatTier(sessionId: string): ThreatTierLevel {
    return this.threatDetection.getThreatTier(sessionId);
  }

  public setThreatTier(sessionId: string, tier: ThreatTierLevel): void {
    return this.threatDetection.setThreatTier(sessionId, tier);
  }

  public calculateThreatTier(
    state: GameState,
    sessionId: string,
  ): { tier: ThreatTierLevel; changed: boolean; event?: ThreatTierChangeEvent } {
    return this.threatDetection.calculateThreatTier(state, sessionId);
  }

  public generateAttacks(
    state: GameState,
    sessionId: string,
    dayNumber: number,
    partySize?: number,
    difficultyTier?: PartyDifficultyTier,
    securityDeltas?: AggregatedSecurityDeltas,
  ): ThreatGenerationResult {
    return this.threatResponse.generateAttacks(
      state,
      sessionId,
      dayNumber,
      this.threatDetection,
      this.threatEvaluation,
      partySize,
      difficultyTier,
      securityDeltas,
    );
  }

  public getIntensityGauge(sessionId: string): number {
    return this.threatResponse.getIntensityGauge(sessionId);
  }

  public updateIntensityGauge(
    sessionId: string,
    attacksThisDay: number,
    activeIncidents: number,
    recentBreach: boolean,
    timeSinceLastAttack: number,
  ): number {
    return this.threatResponse.updateIntensityGauge(
      sessionId,
      attacksThisDay,
      activeIncidents,
      recentBreach,
      timeSinceLastAttack,
    );
  }

  public shouldTriggerBreathingRoom(sessionId: string): boolean {
    return this.threatResponse.shouldTriggerBreathingRoom(sessionId);
  }

  public calculateFacilityScale(state: GameState): number {
    return this.threatDetection.calculateFacilityScale(state);
  }
}

export class ThreatEngineService extends ThreatOrchestrator {
  constructor(config: Partial<ThreatEngineConfig> = {}) {
    super(config);
  }
}
