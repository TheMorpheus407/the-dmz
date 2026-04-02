import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GAME_THREAT_TIERS } from '@the-dmz/shared/game';
import type { OfflineEmail } from '$lib/game/data/offline-emails';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/utils/id', () => ({
  generateId: vi.fn(() => 'test-engine-id'),
}));

vi.mock('$lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('$lib/storage/session', () => ({
  getLatestSessionSnapshot: vi.fn().mockResolvedValue(null),
  saveSessionSnapshot: vi.fn().mockResolvedValue({
    id: 'test-snapshot-id',
    state: {},
    timestamp: Date.now(),
    schemaVersion: 1,
    checksum: 'test-checksum',
  }),
}));

vi.mock('$lib/storage/event-queue', () => ({
  saveEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock('$lib/game/services/sync-service', () => ({
  performFullSync: vi.fn().mockResolvedValue({
    success: true,
    syncedEvents: 0,
  }),
}));

describe('offline engine', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should export resetOfflineEngine function', async () => {
    const { resetOfflineEngine } = await import('$lib/game/services/offline-engine');
    expect(typeof resetOfflineEngine).toBe('function');
  });

  it('should export createOfflineEngine function', async () => {
    const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
    expect(typeof createOfflineEngine).toBe('function');
    const engine = createOfflineEngine();
    expect(engine).toBeDefined();
  });

  it('should create new engine instance with createOfflineEngine', async () => {
    const { createOfflineEngine } = await import('$lib/game/services/offline-engine');

    const engine1 = createOfflineEngine({ emailsPerDay: 5 });
    const engine2 = createOfflineEngine({ emailsPerDay: 10 });

    expect(engine1).not.toBe(engine2);
  });

  it('should reset engine with resetOfflineEngine', async () => {
    const { getOfflineEngine, resetOfflineEngine } =
      await import('$lib/game/services/offline-engine');

    const engine1 = getOfflineEngine();
    resetOfflineEngine();
    const engine2 = getOfflineEngine();

    expect(engine1).not.toBe(engine2);
  });

  it('should initialize with low threat level and zero incidents', async () => {
    const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
    const engine = createOfflineEngine({ emailsPerDay: 0 });
    await engine.initialize();

    const state = engine.getState();
    expect(state.threat.level).toBe(GAME_THREAT_TIERS.LOW);
    expect(state.threat.activeIncidents).toBe(0);
  });

  it('should have valid 5-tier threat level enum in state type', async () => {
    const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
    const engine = createOfflineEngine();
    const state = engine.getState();

    const validThreatLevels = [
      GAME_THREAT_TIERS.LOW,
      GAME_THREAT_TIERS.GUARDED,
      GAME_THREAT_TIERS.ELEVATED,
      GAME_THREAT_TIERS.HIGH,
      GAME_THREAT_TIERS.SEVERE,
    ];
    expect(validThreatLevels).toContain(state.threat.level);
  });

  it('should support all 5 threat level values', async () => {
    const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
    const engine = createOfflineEngine();

    expect(engine).toBeDefined();

    const allThreatLevels = [
      GAME_THREAT_TIERS.LOW,
      GAME_THREAT_TIERS.GUARDED,
      GAME_THREAT_TIERS.ELEVATED,
      GAME_THREAT_TIERS.HIGH,
      GAME_THREAT_TIERS.SEVERE,
    ];

    for (const level of allThreatLevels) {
      expect(level).toMatch(/^(low|guarded|elevated|high|severe)$/);
    }
  });

  describe('threat level thresholds', () => {
    function findEmailWithZeroThreatImpact(engine: { getState: () => { inbox: OfflineEmail[] } }) {
      const inbox = engine.getState().inbox;
      for (const email of inbox) {
        if (email.groundTruth.consequences.approved.threatImpact === 0) {
          return email;
        }
      }
      return inbox[0]!;
    }

    it('should have low threat level with 0 incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.LOW);
      expect(engine.getState().threat.activeIncidents).toBe(0);
    });

    it('should have low threat level with 1 incident', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 1;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.LOW);
      expect(engine.getState().threat.activeIncidents).toBe(1);
    });

    it('should have guarded threat level with 2 incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 2;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.GUARDED);
      expect(engine.getState().threat.activeIncidents).toBe(2);
    });

    it('should have elevated threat level with 3 incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 3;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.ELEVATED);
      expect(engine.getState().threat.activeIncidents).toBe(3);
    });

    it('should have elevated threat level with 4 incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 4;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.ELEVATED);
      expect(engine.getState().threat.activeIncidents).toBe(4);
    });

    it('should have high threat level with 5 incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 5;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.HIGH);
      expect(engine.getState().threat.activeIncidents).toBe(5);
    });

    it('should have high threat level with 6 incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 6;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.HIGH);
      expect(engine.getState().threat.activeIncidents).toBe(6);
    });

    it('should have severe threat level with 7 incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 7;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.SEVERE);
      expect(engine.getState().threat.activeIncidents).toBe(7);
    });

    it('should have severe threat level with many incidents', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);
      engine.getState().threat.activeIncidents = 20;
      engine.processDecision(email.emailId, 'approve');

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.SEVERE);
      expect(engine.getState().threat.activeIncidents).toBe(20);
    });

    it('should transition through threat levels with increasing incidents via processDecision', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const email = findEmailWithZeroThreatImpact(engine);

      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.LOW);
      expect(engine.getState().threat.activeIncidents).toBe(0);

      engine.getState().threat.activeIncidents = 1;
      engine.processDecision(email.emailId, 'approve');
      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.LOW);

      engine.getState().threat.activeIncidents = 2;
      engine.processDecision(email.emailId, 'approve');
      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.GUARDED);

      engine.getState().threat.activeIncidents = 5;
      engine.processDecision(email.emailId, 'approve');
      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.HIGH);

      engine.getState().threat.activeIncidents = 10;
      engine.processDecision(email.emailId, 'approve');
      expect(engine.getState().threat.level).toBe(GAME_THREAT_TIERS.SEVERE);
    });
  });

  describe('processDecision consequences', () => {
    it('should return success false for non-existent email', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
      const engine = createOfflineEngine({ emailsPerDay: 0 });
      await engine.initialize();

      const result = engine.processDecision('non-existent-email', 'approve');

      expect(result.success).toBe(false);
      expect(result.trustChange).toBe(0);
      expect(result.fundsChange).toBe(0);
      expect(result.threatChange).toBe(0);
    });

    it('should apply correct consequences for approve decision', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');

      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const inbox = engine.getState().inbox;
      expect(inbox.length).toBeGreaterThan(0);

      const email = inbox[0]!;
      const expectedTrustChange = email.groundTruth.consequences.approved.trustImpact;
      const expectedFundsChange = email.groundTruth.consequences.approved.fundsImpact;
      const expectedThreatChange = email.groundTruth.consequences.approved.threatImpact;

      const initialTrust = engine.getState().player.trust;
      const initialFunds = engine.getState().player.funds;
      const initialIncidents = engine.getState().threat.activeIncidents;

      const result = engine.processDecision(email.emailId, 'approve');

      expect(result.success).toBe(true);
      expect(result.trustChange).toBe(expectedTrustChange);
      expect(result.fundsChange).toBe(expectedFundsChange);
      expect(result.threatChange).toBe(expectedThreatChange);

      expect(engine.getState().player.trust).toBe(initialTrust + expectedTrustChange);
      expect(engine.getState().player.funds).toBe(initialFunds + expectedFundsChange);
      expect(engine.getState().threat.activeIncidents).toBe(
        initialIncidents + expectedThreatChange,
      );
    });

    it('should apply correct consequences for deny decision', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');

      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const inbox = engine.getState().inbox;
      expect(inbox.length).toBeGreaterThan(0);

      const email = inbox[0]!;
      const expectedTrustChange = email.groundTruth.consequences.denied.trustImpact;
      const expectedFundsChange = email.groundTruth.consequences.denied.fundsImpact;
      const expectedThreatChange = email.groundTruth.consequences.denied.threatImpact;

      const result = engine.processDecision(email.emailId, 'deny');

      expect(result.success).toBe(true);
      expect(result.trustChange).toBe(expectedTrustChange);
      expect(result.fundsChange).toBe(expectedFundsChange);
      expect(result.threatChange).toBe(expectedThreatChange);
    });

    it('should apply correct consequences for flag decision', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');

      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const inbox = engine.getState().inbox;
      expect(inbox.length).toBeGreaterThan(0);

      const email = inbox[0]!;
      const expectedTrustChange = email.groundTruth.consequences.flagged.trustImpact;
      const expectedFundsChange = email.groundTruth.consequences.flagged.fundsImpact;
      const expectedThreatChange = email.groundTruth.consequences.flagged.threatImpact;

      const result = engine.processDecision(email.emailId, 'flag');

      expect(result.success).toBe(true);
      expect(result.trustChange).toBe(expectedTrustChange);
      expect(result.fundsChange).toBe(expectedFundsChange);
      expect(result.threatChange).toBe(expectedThreatChange);
    });

    it('should apply correct consequences for request_verification decision', async () => {
      const { createOfflineEngine } = await import('$lib/game/services/offline-engine');

      const engine = createOfflineEngine({ emailsPerDay: 10 });
      await engine.initialize();

      const inbox = engine.getState().inbox;
      expect(inbox.length).toBeGreaterThan(0);

      const email = inbox[0]!;
      const expectedTrustChange = email.groundTruth.consequences.deferred.trustImpact;
      const expectedFundsChange = email.groundTruth.consequences.deferred.fundsImpact;
      const expectedThreatChange = email.groundTruth.consequences.deferred.threatImpact;

      const result = engine.processDecision(email.emailId, 'request_verification');

      expect(result.success).toBe(true);
      expect(result.trustChange).toBe(expectedTrustChange);
      expect(result.fundsChange).toBe(expectedFundsChange);
      expect(result.threatChange).toBe(expectedThreatChange);
    });
  });
});
