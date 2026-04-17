import { describe, expect, it, vi } from 'vitest';

import {
  mapAttackVectorToIncidentClassification,
  getAvailableResponseActions,
  calculateIncidentSeverity,
  calculateConsequences,
  generatePostIncidentReview,
  type Incident,
  type IncidentResponseAction,
} from '../incident.js';

describe('incident', () => {
  describe('mapAttackVectorToIncidentClassification', () => {
    it('should map email_phishing to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('email_phishing')).toBe('phishing');
    });

    it('should map spear_phishing to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('spear_phishing')).toBe('phishing');
    });

    it('should map whaling to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('whaling')).toBe('phishing');
    });

    it('should map bec to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('bec')).toBe('phishing');
    });

    it('should map supply_chain to supply_chain', () => {
      expect(mapAttackVectorToIncidentClassification('supply_chain')).toBe('supply_chain');
    });

    it('should map insider_threat to insider', () => {
      expect(mapAttackVectorToIncidentClassification('insider_threat')).toBe('insider');
    });

    it('should map brute_force to infrastructure', () => {
      expect(mapAttackVectorToIncidentClassification('brute_force')).toBe('infrastructure');
    });

    it('should map ddos to ddos', () => {
      expect(mapAttackVectorToIncidentClassification('ddos')).toBe('ddos');
    });

    it('should map apt_campaign to apt', () => {
      expect(mapAttackVectorToIncidentClassification('apt_campaign')).toBe('apt');
    });

    it('should map coordinated_attack to infrastructure', () => {
      expect(mapAttackVectorToIncidentClassification('coordinated_attack')).toBe('infrastructure');
    });

    it('should map zero_day to zero_day', () => {
      expect(mapAttackVectorToIncidentClassification('zero_day')).toBe('zero_day');
    });

    it('should map credential_harvesting to credential', () => {
      expect(mapAttackVectorToIncidentClassification('credential_harvesting')).toBe('credential');
    });
  });

  describe('getAvailableResponseActions', () => {
    it('should return non-empty array for phishing', () => {
      const actions = getAvailableResponseActions('phishing');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('deny_email');
      expect(actions).not.toContain('rate_limiting');
    });

    it('should return non-empty array for supply_chain', () => {
      const actions = getAvailableResponseActions('supply_chain');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('isolate_segment');
      expect(actions).not.toContain('deny_email');
    });

    it('should return non-empty array for insider', () => {
      const actions = getAvailableResponseActions('insider');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('restrict_readonly');
      expect(actions).toContain('deploy_honeytokens');
      expect(actions).not.toContain('rate_limiting');
    });

    it('should return non-empty array for infrastructure', () => {
      const actions = getAvailableResponseActions('infrastructure');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('rate_limiting');
      expect(actions).toContain('activate_mitigation');
      expect(actions).not.toContain('deny_email');
    });

    it('should return non-empty array for apt', () => {
      const actions = getAvailableResponseActions('apt');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('brief_morpheus');
      expect(actions).toContain('comprehensive_containment');
      expect(actions).not.toContain('deny_email');
    });

    it('should return non-empty array for zero_day', () => {
      const actions = getAvailableResponseActions('zero_day');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('patch_tool');
      expect(actions).toContain('accept_risk');
      expect(actions).not.toContain('deny_email');
    });

    it('should return non-empty array for credential', () => {
      const actions = getAvailableResponseActions('credential');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('deploy_mfa');
      expect(actions).toContain('enable_lockout');
      expect(actions).not.toContain('deny_email');
    });

    it('should return non-empty array for ddos', () => {
      const actions = getAvailableResponseActions('ddos');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('rate_limiting');
      expect(actions).toContain('reallocate_bandwidth');
      expect(actions).not.toContain('deny_email');
    });

    it('should return non-empty array for breach', () => {
      const actions = getAvailableResponseActions('breach');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('comprehensive_containment');
      expect(actions).toContain('notify_affected');
      expect(actions).not.toContain('deny_email');
    });
  });

  describe('calculateIncidentSeverity', () => {
    it('should return 1 when score is below 0.5', () => {
      expect(calculateIncidentSeverity(0, 1, 1)).toBe(1);
      expect(calculateIncidentSeverity(0.1, 0.9, 0.9)).toBe(1);
      expect(calculateIncidentSeverity(0.2, 0.9, 0.8)).toBe(1);
    });

    it('should return 2 when score is at or above 0.5 (boundary at exactly 0.5)', () => {
      expect(calculateIncidentSeverity(0, 0.5, 1)).toBe(2);
      expect(calculateIncidentSeverity(0, 1, 0.5)).toBe(2);
      expect(calculateIncidentSeverity(0.5, 1, 0.5)).toBe(2);
    });

    it('should return 2 when score is between 0.5 and 1.61', () => {
      expect(calculateIncidentSeverity(0, 0.5, 0.5)).toBe(2);
      expect(calculateIncidentSeverity(0.3, 0.5, 0.5)).toBe(2);
    });

    it('should return 3 when score is between 1.61 and 2.2', () => {
      expect(calculateIncidentSeverity(0.8, 0, 0)).toBe(3);
      expect(calculateIncidentSeverity(0.9, 0, 0.5)).toBe(3);
    });

    it('should return 4 when score is at or above 2.2 (boundary at exactly 2.2)', () => {
      expect(calculateIncidentSeverity(1, 0, 0)).toBe(4);
    });

    it('should return 4 for maximum difficulty, zero detection, zero coverage', () => {
      expect(calculateIncidentSeverity(1, 0, 0)).toBe(4);
    });

    it('should handle parametric combinations correctly', () => {
      expect(calculateIncidentSeverity(0, 0.5, 1)).toBe(2);
      expect(calculateIncidentSeverity(0.2, 0.5, 0.4)).toBe(2);
      expect(calculateIncidentSeverity(0.5, 0.5, 0.7)).toBe(2);
      expect(calculateIncidentSeverity(1, 0.3, 0)).toBe(3);
    });
  });

  describe('calculateConsequences', () => {
    it('should apply base credits penalty based on severity weights', () => {
      const result1 = calculateConsequences(1, [], 'phishing');
      expect(result1.creditsDelta).toBe(-10);

      const result2 = calculateConsequences(2, [], 'phishing');
      expect(result2.creditsDelta).toBe(-25);

      const result3 = calculateConsequences(3, [], 'phishing');
      expect(result3.creditsDelta).toBe(-50);

      const result4 = calculateConsequences(4, [], 'phishing');
      expect(result4.creditsDelta).toBe(-100);
    });

    it('should return 0 intelDelta for empty response actions', () => {
      const result = calculateConsequences(2, [], 'phishing');
      expect(result.intelDelta).toBe(0);
    });

    it('should calculate intelDelta as floor of half the response actions length', () => {
      const actions: IncidentResponseAction[] = [
        { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 0.8 },
        {
          actionId: '2',
          actionType: 'add_sender_blacklist',
          timestamp: '',
          day: 1,
          effectiveness: 0.8,
        },
        {
          actionId: '3',
          actionType: 'report_threat_intel',
          timestamp: '',
          day: 1,
          effectiveness: 0.8,
        },
      ];
      const result = calculateConsequences(2, actions, 'phishing');
      expect(result.intelDelta).toBe(Math.floor(3 * 0.5));
    });

    it('should clamp trustDelta to [-0.5, 0.2]', () => {
      const highTrustActions: IncidentResponseAction[] = [
        { actionId: '1', actionType: 'brief_morpheus', timestamp: '', day: 1, effectiveness: 1 },
        { actionId: '2', actionType: 'brief_morpheus', timestamp: '', day: 1, effectiveness: 1 },
      ];
      const result = calculateConsequences(2, highTrustActions, 'phishing');
      expect(result.trustDelta).toBeLessThanOrEqual(0.2);
      expect(result.trustDelta).toBeGreaterThanOrEqual(-0.5);
    });

    it('should clamp negative trustDelta to -0.5', () => {
      const negativeTrustActions: IncidentResponseAction[] = [
        {
          actionId: '1',
          actionType: 'sacrifice_low_priority',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
        {
          actionId: '2',
          actionType: 'sacrifice_low_priority',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
        {
          actionId: '3',
          actionType: 'sacrifice_low_priority',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
        {
          actionId: '4',
          actionType: 'sacrifice_low_priority',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
        {
          actionId: '5',
          actionType: 'sacrifice_low_priority',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
      ];
      const result = calculateConsequences(3, negativeTrustActions, 'phishing');
      expect(result.trustDelta).toBe(-0.5);
    });

    it('should apply severity modifier for revoke_access action', () => {
      const actions: IncidentResponseAction[] = [
        { actionId: '1', actionType: 'revoke_access', timestamp: '', day: 1, effectiveness: 1 },
      ];
      const result = calculateConsequences(3, actions, 'phishing');
      expect(result.severityAfterResponse).toBeLessThan(3);
    });

    it('should not apply clientImpact for severity <= 2', () => {
      const mockRandom = vi.fn(() => 0.5);
      vi.stubGlobal('Math.random', mockRandom);

      const result1 = calculateConsequences(1, [], 'phishing');
      const result2 = calculateConsequences(2, [], 'phishing');

      expect(result1.clientImpact).toBe(0);
      expect(result2.clientImpact).toBe(0);

      vi.restoreAllMocks();
    });

    it('should apply non-zero clientImpact for severity > 2', () => {
      const mockRandom = vi.fn(() => 0.5);
      vi.stubGlobal('Math.random', mockRandom);

      const result3 = calculateConsequences(3, [], 'phishing');
      const result4 = calculateConsequences(4, [], 'phishing');

      expect(result3.clientImpact).toBeGreaterThan(0);
      expect(result4.clientImpact).toBeGreaterThan(0);
      expect(result3.clientImpact).toBeLessThanOrEqual(0.2);
      expect(result4.clientImpact).toBeLessThanOrEqual(0.2);

      vi.restoreAllMocks();
    });

    it('should stack multiple action effects cumulatively', () => {
      const actions: IncidentResponseAction[] = [
        { actionId: '1', actionType: 'revoke_access', timestamp: '', day: 1, effectiveness: 1 },
        {
          actionId: '2',
          actionType: 'quarantine_data',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
      ];
      const result = calculateConsequences(2, actions, 'phishing');
      expect(result.creditsDelta).toBeLessThan(-25);
    });

    it('should keep severityAfterResponse within bounds [1, 4]', () => {
      const severeActions: IncidentResponseAction[] = [
        {
          actionId: '1',
          actionType: 'comprehensive_containment',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
        {
          actionId: '2',
          actionType: 'comprehensive_containment',
          timestamp: '',
          day: 1,
          effectiveness: 1,
        },
      ];
      const result = calculateConsequences(1, severeActions, 'phishing');
      expect(result.severityAfterResponse).toBeGreaterThanOrEqual(1);
      expect(result.severityAfterResponse).toBeLessThanOrEqual(4);
    });
  });

  describe('generatePostIncidentReview', () => {
    const createTestIncident = (overrides: Partial<Incident>): Incident => ({
      incidentId: 'test-incident-1',
      sessionId: 'test-session',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      day: 1,
      detectionSource: 'siem',
      classification: 'phishing',
      severity: 2,
      affectedAssets: [],
      evidence: { indicators: [], logs: [] },
      status: 'closed',
      timeline: [
        {
          timestamp: new Date('2024-01-01T11:00:00Z'),
          day: 1,
          action: 'detected',
          description: 'Incident detected',
          actor: 'system',
        },
      ],
      responseActions: [
        { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 0.8 },
      ],
      ...overrides,
    });

    it('should classify detection as excellent when timeToDetect <= 1 hour', () => {
      const incident = createTestIncident({
        timestamp: new Date('2024-01-01T10:00:00Z'),
        timeline: [
          {
            timestamp: new Date('2024-01-01T10:30:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.detectionAnalysis.detectionQuality).toBe('excellent');
      expect(review.detectionAnalysis.timeToDetect).toBe(0);
    });

    it('should classify detection as good when timeToDetect <= 4 hours', () => {
      const incident = createTestIncident({
        timestamp: new Date('2024-01-01T10:00:00Z'),
        timeline: [
          {
            timestamp: new Date('2024-01-01T13:00:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.detectionAnalysis.detectionQuality).toBe('good');
      expect(review.detectionAnalysis.timeToDetect).toBe(3);
    });

    it('should classify detection as fair when timeToDetect <= 12 hours', () => {
      const incident = createTestIncident({
        timestamp: new Date('2024-01-01T10:00:00Z'),
        timeline: [
          {
            timestamp: new Date('2024-01-01T18:00:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.detectionAnalysis.detectionQuality).toBe('fair');
      expect(review.detectionAnalysis.timeToDetect).toBe(8);
    });

    it('should classify detection as poor when timeToDetect > 12 hours', () => {
      const incident = createTestIncident({
        timestamp: new Date('2024-01-01T10:00:00Z'),
        timeline: [
          {
            timestamp: new Date('2024-01-01T23:00:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.detectionAnalysis.detectionQuality).toBe('poor');
      expect(review.detectionAnalysis.timeToDetect).toBe(13);
    });

    it('should calculate competence score with excellent detection bonus', () => {
      const incident = createTestIncident({
        severity: 1,
        responseActions: [
          { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 1 },
        ],
        timeline: [
          {
            timestamp: new Date('2024-01-01T10:30:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.competenceScore).toBe(100);
    });

    it('should calculate competence score without excellent detection bonus', () => {
      const incident = createTestIncident({
        severity: 1,
        responseActions: [
          { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 1 },
        ],
        timeline: [
          {
            timestamp: new Date('2024-01-01T14:00:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.competenceScore).toBe(100);
    });

    it('should clamp competence score to maximum of 100', () => {
      const incident = createTestIncident({
        severity: 1,
        responseActions: [
          { actionId: '1', actionType: 'brief_morpheus', timestamp: '', day: 1, effectiveness: 1 },
        ],
        timeline: [
          {
            timestamp: new Date('2024-01-01T10:30:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.competenceScore).toBeLessThanOrEqual(100);
    });

    it('should clamp competence score to minimum of 0', () => {
      const incident = createTestIncident({
        severity: 4,
        responseActions: [
          { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 0 },
        ],
        timeline: [
          {
            timestamp: new Date('2024-01-01T23:00:00Z'),
            day: 1,
            action: 'detected',
            description: 'Detected',
            actor: 'system',
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.competenceScore).toBeGreaterThanOrEqual(0);
    });

    it('should suggest faster response times when effectiveness is below 0.5', () => {
      const incident = createTestIncident({
        responseActions: [
          { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 0.3 },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.responseEvaluation.suggestions).toContain('Consider faster response times');
    });

    it('should suggest more comprehensive response when severity >= 3 and actions < 2', () => {
      const incident = createTestIncident({
        severity: 3,
        responseActions: [
          { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 0.8 },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.responseEvaluation.suggestions).toContain(
        'More comprehensive response actions needed',
      );
    });

    it('should not suggest more comprehensive response when severity >= 3 but actions >= 2', () => {
      const incident = createTestIncident({
        severity: 3,
        responseActions: [
          { actionId: '1', actionType: 'deny_email', timestamp: '', day: 1, effectiveness: 0.8 },
          {
            actionId: '2',
            actionType: 'add_sender_blacklist',
            timestamp: '',
            day: 1,
            effectiveness: 0.8,
          },
        ],
      });
      const review = generatePostIncidentReview(incident);
      expect(review.responseEvaluation.suggestions).not.toContain(
        'More comprehensive response actions needed',
      );
    });

    it('should return empty timeline when incident has no timeline', () => {
      const incident = createTestIncident({
        timeline: [],
        timestamp: new Date('2024-01-01T10:00:00Z'),
      });
      const review = generatePostIncidentReview(incident);
      expect(review.detectionAnalysis.timeToDetect).toBe(0);
    });

    it('should use rootCause from incident or default string', () => {
      const incidentWithRootCause = createTestIncident({
        rootCause: 'Phishing email bypassed filters',
      });
      const review1 = generatePostIncidentReview(incidentWithRootCause);
      expect(review1.rootCause).toBe('Phishing email bypassed filters');

      const incidentWithoutRootCause = createTestIncident({
        rootCause: undefined,
      });
      const review2 = generatePostIncidentReview(incidentWithoutRootCause);
      expect(review2.rootCause).toBe('Analysis pending');
    });

    it('should use lessonsLearned for recommendations or default', () => {
      const incidentWithLessons = createTestIncident({
        lessonsLearned: 'Update email filters',
      });
      const review1 = generatePostIncidentReview(incidentWithLessons);
      expect(review1.recommendations).toContain('Update email filters');

      const incidentWithoutLessons = createTestIncident({
        lessonsLearned: undefined,
      });
      const review2 = generatePostIncidentReview(incidentWithoutLessons);
      expect(review2.recommendations).toContain('Continue monitoring for similar incidents');
    });
  });
});
