import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { BehavioralMetricsService } from '../behavioral-metrics.service.js';

import type { DomainEvent } from '../../../shared/events/event-types.js';

const EMAIL_RECEIVE_TIME_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

  describe('emailReceiveTimes TTL eviction', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const createPhishingEmailReceivedEvent = (emailId: string, timestamp: string): DomainEvent => ({
      eventId: `event-${emailId}-received`,
      eventType: 'game.email.received',
      timestamp,
      correlationId: 'corr-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      source: 'game',
      payload: {
        email_id: emailId,
        is_phishing: true,
      },
      version: 1,
    });

    const createPhishingDecisionEvent = (
      emailId: string,
      timestamp: string,
      outcome: 'correct' | 'incorrect',
    ): DomainEvent => ({
      eventId: `event-${emailId}-decision`,
      eventType: 'game.decision.approved',
      timestamp,
      correlationId: 'corr-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      source: 'game',
      payload: {
        email_id: emailId,
        competency_tags: ['phishing_detection'],
        outcome,
        threat_tier: 'high',
      },
      version: 1,
    });

    it('should calculate meanTimeToReport for email reported before TTL expires', () => {
      const metrics = service.getInitialMetrics();
      const receiveTime = new Date();
      vi.setSystemTime(receiveTime);

      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-1', receiveTime.toISOString()),
      );

      const decisionTime = new Date(receiveTime.getTime() + 5000);
      vi.setSystemTime(decisionTime);

      const update = service.updateMetricsFromEvent(
        metrics,
        createPhishingDecisionEvent('email-1', decisionTime.toISOString(), 'correct'),
      );

      expect(update.meanTimeToReportMs).toBe(5000);
      expect(update.reportTimes).toEqual([5000]);
    });

    it('should not calculate meanTimeToReport for email received after TTL expired', () => {
      const metrics = service.getInitialMetrics();
      const receiveTime = new Date();
      vi.setSystemTime(receiveTime);

      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-1', receiveTime.toISOString()),
      );

      vi.advanceTimersByTime(EMAIL_RECEIVE_TIME_TTL_MS + 1);

      const decisionTime = new Date(receiveTime.getTime() + EMAIL_RECEIVE_TIME_TTL_MS + 10000);
      vi.setSystemTime(decisionTime);

      const update = service.updateMetricsFromEvent(
        metrics,
        createPhishingDecisionEvent('email-1', decisionTime.toISOString(), 'correct'),
      );

      expect(update.meanTimeToReportMs).toBeUndefined();
      expect(update.reportTimes).toBeUndefined();
    });

    it('should track different emails independently with TTL', () => {
      const metrics = service.getInitialMetrics();
      const time1 = new Date();
      vi.setSystemTime(time1);

      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-1', time1.toISOString()),
      );

      const time2 = new Date(time1.getTime() + 10000);
      vi.setSystemTime(time2);
      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-2', time2.toISOString()),
      );

      vi.advanceTimersByTime(EMAIL_RECEIVE_TIME_TTL_MS + 1);

      const decisionTime = new Date(time2.getTime() + EMAIL_RECEIVE_TIME_TTL_MS + 5000);
      vi.setSystemTime(decisionTime);

      const update = service.updateMetricsFromEvent(
        metrics,
        createPhishingDecisionEvent('email-2', decisionTime.toISOString(), 'correct'),
      );

      expect(update.meanTimeToReportMs).toBe(5000);
      expect(update.reportTimes).toEqual([5000]);
    });

    it('should not affect in-flight email processing after TTL for unreported email', () => {
      const metrics = service.getInitialMetrics();
      const receiveTime = new Date();
      vi.setSystemTime(receiveTime);

      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-1', receiveTime.toISOString()),
      );

      const time2 = new Date(receiveTime.getTime() + 10000);
      vi.setSystemTime(time2);
      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-2', time2.toISOString()),
      );

      vi.advanceTimersByTime(EMAIL_RECEIVE_TIME_TTL_MS + 1);

      const decisionTime = new Date(time2.getTime() + 5000);
      vi.setSystemTime(decisionTime);

      const update = service.updateMetricsFromEvent(
        metrics,
        createPhishingDecisionEvent('email-2', decisionTime.toISOString(), 'correct'),
      );

      expect(update.meanTimeToReportMs).toBe(5000);
    });

    it('should handle decision on email within TTL while another email TTL has expired', () => {
      const metrics = service.getInitialMetrics();
      const time1 = new Date();
      vi.setSystemTime(time1);

      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-1', time1.toISOString()),
      );

      const time2 = new Date(time1.getTime() + 10000);
      vi.setSystemTime(time2);
      service.updateMetricsFromEvent(
        metrics,
        createPhishingEmailReceivedEvent('email-2', time2.toISOString()),
      );

      vi.advanceTimersByTime(EMAIL_RECEIVE_TIME_TTL_MS + 1);

      const decisionTime = new Date(time2.getTime() + 5000);
      vi.setSystemTime(decisionTime);

      const update = service.updateMetricsFromEvent(
        metrics,
        createPhishingDecisionEvent('email-2', decisionTime.toISOString(), 'correct'),
      );

      expect(update.meanTimeToReportMs).toBe(5000);
      expect(update.reportTimes).toEqual([5000]);
    });
  });
});
