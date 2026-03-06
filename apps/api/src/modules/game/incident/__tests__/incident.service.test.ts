import { describe, it, expect } from 'vitest';

import {
  mapAttackVectorToIncidentClassification,
  getAvailableResponseActions,
  calculateIncidentSeverity,
  calculateConsequences,
  generatePostIncidentReview,
  type Incident,
  type IncidentResponseAction,
  type ResponseAction,
} from '@the-dmz/shared/game';

describe('Incident Types', () => {
  describe('mapAttackVectorToIncidentClassification', () => {
    it('should map email_phishing to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('email_phishing')).toBe('phishing');
    });

    it('should map spear_phishing to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('spear_phishing')).toBe('phishing');
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

    it('should map zero_day to zero_day', () => {
      expect(mapAttackVectorToIncidentClassification('zero_day')).toBe('zero_day');
    });

    it('should map credential_harvesting to credential', () => {
      expect(mapAttackVectorToIncidentClassification('credential_harvesting')).toBe('credential');
    });

    it('should map coordinated_attack to infrastructure', () => {
      expect(mapAttackVectorToIncidentClassification('coordinated_attack')).toBe('infrastructure');
    });

    it('should map whaling to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('whaling')).toBe('phishing');
    });

    it('should map bec to phishing', () => {
      expect(mapAttackVectorToIncidentClassification('bec')).toBe('phishing');
    });
  });

  describe('getAvailableResponseActions', () => {
    it('should return phishing response actions', () => {
      const actions = getAvailableResponseActions('phishing');
      expect(actions).toContain('deny_email');
      expect(actions).toContain('revoke_access');
      expect(actions).toContain('quarantine_data');
    });

    it('should return supply_chain response actions', () => {
      const actions = getAvailableResponseActions('supply_chain');
      expect(actions).toContain('isolate_segment');
      expect(actions).toContain('integrity_scan');
    });

    it('should return insider response actions', () => {
      const actions = getAvailableResponseActions('insider');
      expect(actions).toContain('restrict_readonly');
      expect(actions).toContain('deploy_honeytokens');
    });

    it('should return infrastructure response actions', () => {
      const actions = getAvailableResponseActions('infrastructure');
      expect(actions).toContain('activate_mitigation');
      expect(actions).toContain('enable_lockout');
    });

    it('should return apt response actions', () => {
      const actions = getAvailableResponseActions('apt');
      expect(actions).toContain('correlate_events');
      expect(actions).toContain('brief_morpheus');
    });

    it('should return zero_day response actions', () => {
      const actions = getAvailableResponseActions('zero_day');
      expect(actions).toContain('patch_tool');
      expect(actions).toContain('compensating_controls');
    });
  });

  describe('calculateIncidentSeverity', () => {
    it('should return severity 1 for low difficulty, high detection, high coverage', () => {
      const severity = calculateIncidentSeverity(1, 0.9, 0.9);
      expect(severity).toBe(1);
    });

    it('should return severity 2 for medium difficulty, medium detection', () => {
      const severity = calculateIncidentSeverity(3, 0.5, 0.5);
      expect(severity).toBe(2);
    });

    it('should return severity 3 for high difficulty, low detection', () => {
      const severity = calculateIncidentSeverity(4, 0.3, 0.3);
      expect(severity).toBe(3);
    });

    it('should return severity 4 for high difficulty, no detection, no coverage', () => {
      const severity = calculateIncidentSeverity(5, 0, 0);
      expect(severity).toBe(4);
    });
  });

  describe('calculateConsequences', () => {
    it('should calculate consequences with no response actions', () => {
      const consequences = calculateConsequences(3, [], 'phishing');
      expect(consequences.severityAfterResponse).toBe(3);
      expect(consequences.trustDelta).toBeLessThanOrEqual(0);
      expect(consequences.creditsDelta).toBe(-50);
    });

    it('should reduce severity with effective response actions', () => {
      const responseActions: IncidentResponseAction[] = [
        {
          actionId: 'action-1',
          actionType: 'revoke_access' as ResponseAction,
          timestamp: new Date().toISOString(),
          day: 1,
          effectiveness: 1.0,
        },
      ];
      const consequences = calculateConsequences(4, responseActions, 'phishing');
      expect(consequences.severityAfterResponse).toBeLessThan(4);
    });

    it('should improve trust with positive response actions', () => {
      const responseActions: IncidentResponseAction[] = [
        {
          actionId: 'action-1',
          actionType: 'report_threat_intel' as ResponseAction,
          timestamp: new Date().toISOString(),
          day: 1,
          effectiveness: 1.0,
        },
      ];
      const consequences = calculateConsequences(1, responseActions, 'phishing');
      expect(consequences.trustDelta).toBeGreaterThan(0);
    });

    it('should cap trust delta between -0.5 and 0.2', () => {
      const responseActions: IncidentResponseAction[] = [
        {
          actionId: 'action-1',
          actionType: 'accept_risk' as ResponseAction,
          timestamp: new Date().toISOString(),
          day: 1,
          effectiveness: 1.0,
        },
      ];
      const consequences = calculateConsequences(4, responseActions, 'phishing');
      expect(consequences.trustDelta).toBeGreaterThanOrEqual(-0.5);
      expect(consequences.trustDelta).toBeLessThanOrEqual(0.2);
    });
  });

  describe('generatePostIncidentReview', () => {
    it('should generate review with excellent detection for quick detection', () => {
      const incident: Incident = {
        incidentId: 'test-incident-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
        day: 1,
        detectionSource: 'siem',
        classification: 'phishing',
        severity: 2,
        affectedAssets: [],
        evidence: { indicators: [], logs: [] },
        status: 'closed',
        timeline: [
          {
            timestamp: new Date().toISOString(),
            day: 1,
            action: 'detected',
            description: 'Detected by SIEM',
            actor: 'system',
          },
        ],
        responseActions: [
          {
            actionId: 'action-1',
            actionType: 'deny_email' as ResponseAction,
            timestamp: new Date().toISOString(),
            day: 1,
            effectiveness: 0.9,
          },
        ],
        outcome: 'Resolved successfully',
        rootCause: 'Phishing email',
        resolvedAt: new Date().toISOString(),
        resolutionDays: 1,
      };

      const review = generatePostIncidentReview(incident);
      expect(review.detectionAnalysis.detectionQuality).toBe('excellent');
    });

    it('should calculate competence score based on multiple factors', () => {
      const incident: Incident = {
        incidentId: 'test-incident-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
        day: 1,
        detectionSource: 'siem',
        classification: 'phishing',
        severity: 1,
        affectedAssets: [],
        evidence: { indicators: [], logs: [] },
        status: 'closed',
        timeline: [
          {
            timestamp: new Date().toISOString(),
            day: 1,
            action: 'detected',
            description: 'Detected by SIEM',
            actor: 'system',
          },
        ],
        responseActions: [
          {
            actionId: 'action-1',
            actionType: 'deny_email' as ResponseAction,
            timestamp: new Date().toISOString(),
            day: 1,
            effectiveness: 1.0,
          },
        ],
        outcome: 'Resolved',
        lessonsLearned: 'Be more vigilant',
        resolvedAt: new Date().toISOString(),
        resolutionDays: 0,
      };

      const review = generatePostIncidentReview(incident);
      expect(review.competenceScore).toBeGreaterThan(0);
      expect(review.competenceScore).toBeLessThanOrEqual(100);
    });

    it('should include suggestions for poor effectiveness', () => {
      const incident: Incident = {
        incidentId: 'test-incident-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
        day: 1,
        detectionSource: 'siem',
        classification: 'phishing',
        severity: 3,
        affectedAssets: [],
        evidence: { indicators: [], logs: [] },
        status: 'closed',
        timeline: [
          {
            timestamp: new Date().toISOString(),
            day: 1,
            action: 'detected',
            description: 'Detected late',
            actor: 'system',
          },
        ],
        responseActions: [],
        outcome: 'Resolved',
        resolvedAt: new Date().toISOString(),
        resolutionDays: 5,
      };

      const review = generatePostIncidentReview(incident);
      expect(review.responseEvaluation.suggestions.length).toBeGreaterThan(0);
    });
  });
});
