import { describe, it, expect } from 'vitest';

import {
  ConsequenceEngine,
  createConsequenceEngine,
  CONSEQUENCE_EVENTS,
} from '../consequence-engine.js';

describe('ConsequenceEngine', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const engine = new ConsequenceEngine();
      const state = engine.getState();
      expect(state.trust).toBe(250);
      expect(state.funds).toBe(10000);
      expect(state.backlogPenalty).toBe(0);
    });

    it('should initialize with custom values', () => {
      const factionRelations = {
        sovereign_compact: 10,
        librarian_network: 5,
        red_hand: -10,
        circuit_syndicate: 0,
        unaffiliated: 20,
      };
      const engine = new ConsequenceEngine(300, 15000, factionRelations, -5);
      const state = engine.getState();
      expect(state.trust).toBe(300);
      expect(state.funds).toBe(15000);
      expect(state.backlogPenalty).toBe(-5);
      expect(state.factionRelations['sovereign_compact']).toBe(10);
    });
  });

  describe('applyDecisionConsequence', () => {
    it('should apply trust and funds changes from decision', () => {
      const engine = new ConsequenceEngine();
      const result = engine.applyDecisionConsequence({
        decisionId: 'dec-1',
        emailId: 'email-1',
        decision: 'approve',
        wasCorrect: true,
        isMalicious: false,
        emailDifficulty: 3,
        clientTier: 2,
        factionId: 'sovereign_compact',
        isHighUrgency: false,
        trustImpact: 5,
        fundsImpact: 150,
        factionImpact: 5,
      });

      expect(result.trustChange).toBeDefined();
      expect(result.fundsChange).toBe(150);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should clamp trust to valid range', () => {
      const engine = new ConsequenceEngine(10, 1000);
      engine.applyDecisionConsequence({
        decisionId: 'dec-1',
        emailId: 'email-1',
        decision: 'approve',
        wasCorrect: false,
        isMalicious: true,
        emailDifficulty: 3,
        clientTier: 2,
        factionId: 'sovereign_compact',
        isHighUrgency: false,
        trustImpact: -50,
        fundsImpact: 0,
        factionImpact: 0,
      });

      const state = engine.getState();
      expect(state.trust).toBeGreaterThanOrEqual(0);
    });

    it('should clamp funds to valid range', () => {
      const engine = new ConsequenceEngine(250, 100);
      engine.applyDecisionConsequence({
        decisionId: 'dec-1',
        emailId: 'email-1',
        decision: 'approve',
        wasCorrect: false,
        isMalicious: true,
        emailDifficulty: 3,
        clientTier: 2,
        factionId: 'sovereign_compact',
        isHighUrgency: false,
        trustImpact: 0,
        fundsImpact: -500,
        factionImpact: 0,
      });

      const state = engine.getState();
      expect(state.funds).toBeGreaterThanOrEqual(0);
    });

    it('should emit trust modified event', () => {
      const engine = new ConsequenceEngine();
      engine.applyDecisionConsequence({
        decisionId: 'dec-1',
        emailId: 'email-1',
        decision: 'approve',
        wasCorrect: true,
        isMalicious: false,
        emailDifficulty: 3,
        clientTier: 2,
        factionId: 'sovereign_compact',
        isHighUrgency: false,
        trustImpact: 5,
        fundsImpact: 0,
        factionImpact: 0,
      });

      const state = engine.getState();
      expect(state.trust).toBe(250 + 5);
    });
  });

  describe('applyBreachConsequence', () => {
    it('should apply severe trust and funds penalties', () => {
      const engine = new ConsequenceEngine(200, 5000, { sovereign_compact: 0 });
      const result = engine.applyBreachConsequence({
        severity: 7,
        involvedFactions: ['sovereign_compact'],
      });

      expect(result.trustChange).toBeLessThan(0);
      expect(result.fundsChange).toBeLessThan(0);
      expect(result.events.some((e) => e.type === CONSEQUENCE_EVENTS.BREACH_OCCURRED)).toBe(true);
    });

    it('should apply faction impacts', () => {
      const engine = new ConsequenceEngine(200, 5000, { sovereign_compact: 10, red_hand: 0 });
      const result = engine.applyBreachConsequence({
        severity: 5,
        involvedFactions: ['sovereign_compact', 'red_hand'],
      });

      expect(result.factionChanges['sovereign_compact']).toBeLessThan(0);
    });
  });

  describe('applyOperationalCosts', () => {
    it('should deduct operational costs from funds', () => {
      const engine = new ConsequenceEngine(250, 5000);
      const result = engine.applyOperationalCosts({
        operatingCost: 50,
        facilityTier: 'standard',
      });

      expect(result.fundsChange).toBeLessThan(0);
      const state = engine.getState();
      expect(state.funds).toBeLessThan(5000);
    });
  });

  describe('updateBacklog', () => {
    it('should update backlog pressure', () => {
      const engine = new ConsequenceEngine();
      const result = engine.updateBacklog(8);

      expect(result.accumulatedPenalty).toBe(-5);
      expect(result.shouldCreateIncident).toBe(false);
    });

    it('should trigger incident at threshold', () => {
      const engine = new ConsequenceEngine();
      const result = engine.updateBacklog(12);

      expect(result.shouldCreateIncident).toBe(true);
      expect(result.accumulatedPenalty).toBe(-9);
    });
  });

  describe('resolveBacklog', () => {
    it('should reduce backlog penalty when resolving', () => {
      const engine = new ConsequenceEngine();
      engine.updateBacklog(8);
      const newPenalty = engine.resolveBacklog(3);

      expect(newPenalty).toBe(-2);
    });
  });

  describe('computeDaySummary', () => {
    it('should return day summary with narrative notes', () => {
      const engine = new ConsequenceEngine(50, 500);
      const summary = engine.computeDaySummary(1, 2);

      expect(summary.trustDelta).toBe(0);
      expect(summary.fundsDelta).toBe(0);
      expect(summary.incidentsResolved).toBe(2);
      expect(summary.narrativeNotes.length).toBeGreaterThan(0);
    });

    it('should include faction warnings for hostile relations', () => {
      const engine = new ConsequenceEngine(250, 5000, {
        sovereign_compact: -60,
        librarian_network: 0,
        red_hand: 0,
        circuit_syndicate: 0,
        unaffiliated: 0,
      });
      const summary = engine.computeDaySummary(1, 0);

      expect(summary.narrativeNotes.some((n) => n.includes('sovereign_compact'))).toBe(true);
    });
  });

  describe('createConsequenceEngine', () => {
    it('should create engine with default values', () => {
      const engine = createConsequenceEngine();
      const state = engine.getState();
      expect(state.trust).toBe(250);
      expect(state.funds).toBe(10000);
    });

    it('should create engine with custom values', () => {
      const engine = createConsequenceEngine(300, 20000, { sovereign_compact: 20 });
      const state = engine.getState();
      expect(state.trust).toBe(300);
      expect(state.funds).toBe(20000);
      expect(state.factionRelations['sovereign_compact']).toBe(20);
    });
  });

  describe('event emission', () => {
    it('should emit trust modified events', () => {
      const engine = new ConsequenceEngine();
      engine.applyDecisionConsequence({
        decisionId: 'dec-1',
        emailId: 'email-1',
        decision: 'approve',
        wasCorrect: true,
        isMalicious: false,
        emailDifficulty: 3,
        clientTier: 2,
        factionId: 'sovereign_compact',
        isHighUrgency: false,
        trustImpact: 5,
        fundsImpact: 0,
        factionImpact: 0,
      });

      const result = engine.applyDecisionConsequence({
        decisionId: 'dec-2',
        emailId: 'email-2',
        decision: 'approve',
        wasCorrect: true,
        isMalicious: false,
        emailDifficulty: 3,
        clientTier: 2,
        factionId: 'sovereign_compact',
        isHighUrgency: false,
        trustImpact: 5,
        fundsImpact: 0,
        factionImpact: 0,
      });

      const trustEvents = result.events.filter((e) => e.type === CONSEQUENCE_EVENTS.TRUST_MODIFIED);
      expect(trustEvents.length).toBe(2);
    });

    it('should emit funds modified events', () => {
      const engine = new ConsequenceEngine();
      const result = engine.applyDecisionConsequence({
        decisionId: 'dec-1',
        emailId: 'email-1',
        decision: 'approve',
        wasCorrect: true,
        isMalicious: false,
        emailDifficulty: 3,
        clientTier: 2,
        factionId: 'sovereign_compact',
        isHighUrgency: false,
        trustImpact: 0,
        fundsImpact: 150,
        factionImpact: 0,
      });

      const fundsEvents = result.events.filter((e) => e.type === CONSEQUENCE_EVENTS.FUNDS_MODIFIED);
      expect(fundsEvents.length).toBe(1);
    });
  });
});
