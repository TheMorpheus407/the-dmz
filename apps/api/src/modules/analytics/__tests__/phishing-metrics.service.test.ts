import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PhishingMetricsService } from '../phishing-metrics.service.js';

describe('PhishingMetricsService', () => {
  let phishingMetricsService: PhishingMetricsService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };
    phishingMetricsService = new PhishingMetricsService(mockDb as never);
  });

  describe('calculateMetricsFromEvents', () => {
    it('should return default values for empty events', () => {
      const result = phishingMetricsService['calculateMetricsFromEvents']([]);

      expect(result.clickRate).toBe(0);
      expect(result.reportRate).toBe(0);
      expect(result.falsePositiveRate).toBe(0);
      expect(result.meanTimeToReportSeconds).toBeNull();
      expect(result.meanTimeToDecisionSeconds).toBeNull();
      expect(result.suspiciousIndicatorFlaggingRate).toBe(0);
      expect(result.totalPhishingEmails).toBe(0);
      expect(result.totalLegitimateEmails).toBe(0);
      expect(result.sampleSize).toBe(0);
    });

    it('should calculate click rate correctly', () => {
      const now = new Date();
      const events = [
        {
          eventName: 'game.email.received',
          eventTime: now,
          eventProperties: { email_type: 'phishing' },
          userId: 'user-1',
        },
        {
          eventName: 'game.email.opened',
          eventTime: new Date(now.getTime() + 1000),
          eventProperties: { action: 'click' },
          userId: 'user-1',
        },
      ];

      const result = phishingMetricsService['calculateMetricsFromEvents'](events as never);

      expect(result.totalPhishingEmails).toBe(1);
      expect(result.totalClicks).toBe(1);
      expect(result.clickRate).toBe(1);
    });

    it('should calculate report rate correctly', () => {
      const now = new Date();
      const events = [
        {
          eventName: 'game.email.received',
          eventTime: now,
          eventProperties: { email_type: 'phishing' },
          userId: 'user-1',
        },
        {
          eventName: 'game.decision.flagged',
          eventTime: new Date(now.getTime() + 5000),
          eventProperties: {},
          userId: 'user-1',
        },
      ];

      const result = phishingMetricsService['calculateMetricsFromEvents'](events as never);

      expect(result.totalPhishingEmails).toBe(1);
      expect(result.totalReports).toBe(1);
      expect(result.reportRate).toBe(1);
    });

    it('should calculate false positive rate correctly', () => {
      const now = new Date();
      const events = [
        {
          eventName: 'game.email.received',
          eventTime: now,
          eventProperties: { email_type: 'legitimate' },
          userId: 'user-1',
        },
        {
          eventName: 'game.decision.denied',
          eventTime: new Date(now.getTime() + 5000),
          eventProperties: { email_type: 'legitimate' },
          userId: 'user-1',
        },
      ];

      const result = phishingMetricsService['calculateMetricsFromEvents'](events as never);

      expect(result.totalLegitimateEmails).toBe(1);
      expect(result.totalFalsePositives).toBe(1);
      expect(result.falsePositiveRate).toBe(1);
    });

    it('should calculate mean time to report correctly', () => {
      const now = new Date();
      const events = [
        {
          eventName: 'game.email.received',
          eventTime: now,
          eventProperties: { email_type: 'phishing' },
          userId: 'user-1',
        },
        {
          eventName: 'game.decision.flagged',
          eventTime: new Date(now.getTime() + 30000),
          eventProperties: {},
          userId: 'user-1',
        },
      ];

      const result = phishingMetricsService['calculateMetricsFromEvents'](events as never);

      expect(result.meanTimeToReportSeconds).toBe(30);
    });

    it('should calculate indicator flagging rate correctly', () => {
      const now = new Date();
      const events = [
        {
          eventName: 'game.email.indicator.marked',
          eventTime: now,
          eventProperties: { indicator_id: 'indicator-1' },
          userId: 'user-1',
        },
        {
          eventName: 'game.email.indicator.marked',
          eventTime: new Date(now.getTime() + 1000),
          eventProperties: { indicator_id: 'indicator-2' },
          userId: 'user-1',
        },
      ];

      const result = phishingMetricsService['calculateMetricsFromEvents'](events as never);

      expect(result.suspiciousIndicatorFlaggingRate).toBeGreaterThan(0);
    });
  });
});
