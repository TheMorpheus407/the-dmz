import { GAME_THREAT_TIERS, type EmailDifficulty, type GameThreatTier } from '@the-dmz/shared/game';
import { generateId } from '$lib/utils/id';
import { getLatestSessionSnapshot, saveSessionSnapshot } from '$lib/storage/session';
import { saveEvent } from '$lib/storage/event-queue';

import { getRandomOfflineEmails, type OfflineEmail } from '../data/offline-emails';

import { performFullSync, type SyncResult } from './sync-service';

export interface OfflineGameState {
  sessionId: string;
  day: number;
  phase: string;
  player: {
    trust: number;
    funds: number;
    intelFragments: number;
  };
  facility: {
    rackSpace: number;
    power: number;
    cooling: number;
    bandwidth: number;
    clients: number;
  };
  threat: {
    level: GameThreatTier;
    activeIncidents: number;
  };
  inbox: OfflineEmail[];
  decisions: Array<{
    id: string;
    emailId: string;
    type: 'approve' | 'deny' | 'flag' | 'request_verification' | 'defer';
    createdAt: string;
    resolved: boolean;
  }>;
  eventHistory: Array<{
    type: string;
    payload: unknown;
    timestamp: string;
  }>;
}

export interface OfflineGameConfig {
  emailsPerDay: number;
  difficultyDistribution: Record<EmailDifficulty, number>;
}

const DEFAULT_CONFIG: OfflineGameConfig = {
  emailsPerDay: 10,
  difficultyDistribution: {
    1: 2,
    2: 3,
    3: 3,
    4: 1,
    5: 1,
  },
};

export class OfflineGameEngine {
  private config: OfflineGameConfig;
  private state: OfflineGameState;
  private isInitialized = false;

  constructor(config: Partial<OfflineGameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  private createInitialState(): OfflineGameState {
    return {
      sessionId: generateId(),
      day: 1,
      phase: 'DAY_START',
      player: {
        trust: 100,
        funds: 1000,
        intelFragments: 0,
      },
      facility: {
        rackSpace: 10,
        power: 100,
        cooling: 100,
        bandwidth: 1000,
        clients: 5,
      },
      threat: {
        level: GAME_THREAT_TIERS.LOW,
        activeIncidents: 0,
      },
      inbox: [],
      decisions: [],
      eventHistory: [],
    };
  }

  async initialize(): Promise<void> {
    const savedSnapshot = await getLatestSessionSnapshot();

    if (savedSnapshot) {
      this.state = savedSnapshot.state as OfflineGameState;
      this.isInitialized = true;
      return;
    }

    this.state = this.createInitialState();
    await this.startNewDay();
    this.isInitialized = true;
  }

  async startNewDay(): Promise<void> {
    this.state.day++;
    this.state.phase = 'EMAIL_TRIAGE';
    this.state.inbox = this.generateDailyEmails();
    this.state.decisions = [];

    await this.persistState();
    await this.emitEvent('day_started', { day: this.state.day });
  }

  private generateDailyEmails(): OfflineEmail[] {
    const emails: OfflineEmail[] = [];
    const { difficultyDistribution, emailsPerDay } = this.config;

    for (const [difficulty, count] of Object.entries(difficultyDistribution)) {
      const difficultyEmails = getRandomOfflineEmails(
        count,
        parseInt(difficulty) as EmailDifficulty,
      );
      emails.push(...difficultyEmails);
    }

    while (emails.length < emailsPerDay) {
      const randomEmail = getRandomOfflineEmails(1)[0];
      if (randomEmail && !emails.find((e) => e.emailId === randomEmail.emailId)) {
        emails.push(randomEmail);
      }
    }

    return emails.slice(0, emailsPerDay);
  }

  processDecision(
    emailId: string,
    decisionType: 'approve' | 'deny' | 'flag' | 'request_verification',
  ): { success: boolean; trustChange: number; fundsChange: number; threatChange: number } {
    const email = this.state.inbox.find((e) => e.emailId === emailId);
    if (!email) {
      return { success: false, trustChange: 0, fundsChange: 0, threatChange: 0 };
    }

    const groundTruth = email.groundTruth;
    const consequenceKeyMap: Record<
      'approve' | 'deny' | 'flag' | 'request_verification',
      keyof typeof groundTruth.consequences
    > = {
      approve: 'approved',
      deny: 'denied',
      flag: 'flagged',
      request_verification: 'deferred',
    };
    const consequenceKey = consequenceKeyMap[decisionType];
    const consequences = groundTruth.consequences[consequenceKey];

    this.state.player.trust += consequences.trustImpact;
    this.state.player.funds += consequences.fundsImpact;
    this.state.threat.activeIncidents += consequences.threatImpact;

    this.state.player.trust = Math.max(0, Math.min(500, this.state.player.trust));
    this.state.player.funds = Math.max(0, this.state.player.funds);
    this.state.threat.activeIncidents = Math.max(0, this.state.threat.activeIncidents);

    this.state.threat.level = this.#deriveThreatLevel(this.state.threat.activeIncidents);

    const decision = {
      id: generateId(),
      emailId,
      type: decisionType,
      createdAt: new Date().toISOString(),
      resolved: true,
    };

    this.state.decisions.push(decision);

    void this.emitEvent('decision_made', {
      emailId,
      decisionType,
      trustChange: consequences.trustImpact,
      fundsChange: consequences.fundsImpact,
      threatChange: consequences.threatImpact,
    });

    void this.persistState();

    return {
      success: true,
      trustChange: consequences.trustImpact,
      fundsChange: consequences.fundsImpact,
      threatChange: consequences.threatImpact,
    };
  }

  advancePhase(phase: string): void {
    this.state.phase = phase;
    void this.persistState();
    void this.emitEvent('phase_changed', { phase });
  }

  updateFacilityResource(
    resource: 'power' | 'cooling' | 'bandwidth' | 'rackSpace',
    change: number,
  ): void {
    const current = this.state.facility[resource];
    this.state.facility[resource] = Math.max(0, Math.min(100, current + change));
    void this.persistState();
    void this.emitEvent('facility_updated', { resource, change });
  }

  getState(): OfflineGameState {
    return { ...this.state };
  }

  getEmail(emailId: string): OfflineEmail | undefined {
    return this.state.inbox.find((e) => e.emailId === emailId);
  }

  private async persistState(): Promise<void> {
    await saveSessionSnapshot(this.state);
  }

  private async emitEvent(type: string, payload: unknown): Promise<void> {
    const event = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.state.eventHistory.push(event);
    await saveEvent(type, payload);
  }

  async syncWithServer(): Promise<{ success: boolean; syncedEvents: number }> {
    const syncResult: SyncResult = await performFullSync();

    return {
      success: syncResult.success,
      syncedEvents: syncResult.syncedEvents,
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  isGameOver(): boolean {
    return this.state.player.trust <= 0 || this.state.player.funds <= 0;
  }

  getScore(): number {
    return (
      this.state.player.trust +
      this.state.player.funds / 10 +
      this.state.player.intelFragments * 5 -
      this.state.threat.activeIncidents * 10
    );
  }

  #deriveThreatLevel(activeIncidents: number): GameThreatTier {
    if (activeIncidents > 6) return GAME_THREAT_TIERS.SEVERE;
    if (activeIncidents > 4) return GAME_THREAT_TIERS.HIGH;
    if (activeIncidents > 2) return GAME_THREAT_TIERS.ELEVATED;
    if (activeIncidents > 1) return GAME_THREAT_TIERS.GUARDED;
    return GAME_THREAT_TIERS.LOW;
  }
}

let offlineEngine: OfflineGameEngine | null = null;

export function getOfflineEngine(config?: Partial<OfflineGameConfig>): OfflineGameEngine {
  if (!offlineEngine) {
    offlineEngine = new OfflineGameEngine(config);
  }
  return offlineEngine;
}

export async function initializeOfflineGame(): Promise<OfflineGameEngine> {
  const engine = getOfflineEngine();
  await engine.initialize();
  return engine;
}

export function createOfflineEngine(config?: Partial<OfflineGameConfig>): OfflineGameEngine {
  return new OfflineGameEngine(config);
}

export function resetOfflineEngine(): void {
  offlineEngine = null;
}
