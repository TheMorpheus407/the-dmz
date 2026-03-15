import { describe, it, expect, beforeEach } from 'vitest';

import { BehavioralMetricsService } from '../behavioral-metrics.service.js';

import type { DomainEvent } from '../../../shared/events/event-types.js';

describe('BehavioralMetricsService', () => {
  let service: BehavioralMetricsService;

  beforeEach(() => {
    service = new BehavioralMetricsService();
  });

  describe('getInitialMetrics', () => {
    it('should return initial metrics with default values', () => {
      const metrics = service.getInitialMetrics();

      expect(metrics.verificationUsageRate).toBe(0);
      expect(metrics.riskyApprovalRate).toBe(0);
      expect(metrics.dataHandlingComplianceRate).toBe(0);
      expect(metrics.meanTimeToReportMs).toBeNull();
      expect(metrics.passwordHygieneScore).toBe(50);
      expect(metrics.totalDecisions).toBe(0);
    });
  });

  describe('calculateVerificationUsageRate', () => {
    it('should return 0 when no decisions', () => {
      const rate = service.calculateVerificationUsageRate(0, 0);
      expect(rate).toBe(0);
    });

    it('should calculate correct rate', () => {
      const rate = service.calculateVerificationUsageRate(5, 10);
      expect(rate).toBe(0.5);
    });
  });

  describe('calculateRiskyApprovalRate', () => {
    it('should return 0 when no decisions', () => {
      const rate = service.calculateRiskyApprovalRate(0, 0);
      expect(rate).toBe(0);
    });

    it('should calculate correct rate', () => {
      const rate = service.calculateRiskyApprovalRate(3, 10);
      expect(rate).toBe(0.3);
    });
  });

  describe('calculateDataHandlingComplianceRate', () => {
    it('should return 0 when no decisions', () => {
      const rate = service.calculateDataHandlingComplianceRate(0, 0);
      expect(rate).toBe(0);
    });

    it('should calculate correct rate', () => {
      const rate = service.calculateDataHandlingComplianceRate(8, 10);
      expect(rate).toBe(0.8);
    });
  });

  describe('calculateMeanTimeToReport', () => {
    it('should return null for empty array', () => {
      const mean = service.calculateMeanTimeToReport([]);
      expect(mean).toBeNull();
    });

    it('should calculate correct mean', () => {
      const mean = service.calculateMeanTimeToReport([1000, 2000, 3000]);
      expect(mean).toBe(2000);
    });
  });

  describe('calculateChurnRiskScore', () => {
    it('should return elevated risk for low verification usage', () => {
      const metrics = service.getInitialMetrics();
      metrics.verificationUsageRate = 0.05;
      metrics.riskyApprovalRate = 0.1;
      metrics.dataHandlingComplianceRate = 0.8;
      metrics.passwordHygieneScore = 80;

      const risk = service.calculateChurnRiskScore(metrics);
      expect(risk).toBe(30);
    });

    it('should return elevated risk for high risky approval rate', () => {
      const metrics = service.getInitialMetrics();
      metrics.verificationUsageRate = 0.5;
      metrics.riskyApprovalRate = 0.5;
      metrics.dataHandlingComplianceRate = 0.8;
      metrics.passwordHygieneScore = 80;

      const risk = service.calculateChurnRiskScore(metrics);
      expect(risk).toBe(40);
    });
  });

  describe('updateMetricsFromEvent', () => {
    it('should update total decisions on decision event', () => {
      const metrics = service.getInitialMetrics();

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'game.decision.approved',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'game',
        payload: {
          competency_tags: ['phishing_detection'],
          outcome: 'correct',
          threat_tier: 'moderate',
        },
        version: 1,
      };

      const update = service.updateMetricsFromEvent(metrics, event);
      expect(update.totalDecisions).toBe(1);
    });

    it('should track verification actions', () => {
      const metrics = service.getInitialMetrics();
      metrics.totalDecisions = 10;

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'game.verification.packet_opened',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'game',
        payload: {},
        version: 1,
      };

      const update = service.updateMetricsFromEvent(metrics, event);
      expect(update.verificationActions).toBe(1);
    });
  });
});
