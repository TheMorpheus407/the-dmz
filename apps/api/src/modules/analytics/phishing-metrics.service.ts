import { eq, and, gte, lte, desc } from 'drizzle-orm';

import { analyticsEvents } from '../../db/schema/analytics/index.js';

import type { DB } from '../../shared/database/connection.js';

export interface PhishingMetricsInput {
  tenantId: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PhishingMetricsResult {
  clickRate: number;
  reportRate: number;
  falsePositiveRate: number;
  meanTimeToReportSeconds: number | null;
  meanTimeToDecisionSeconds: number | null;
  suspiciousIndicatorFlaggingRate: number;
  totalPhishingEmails: number;
  totalLegitimateEmails: number;
  totalClicks: number;
  totalReports: number;
  totalFalsePositives: number;
  sampleSize: number;
}

export interface AggregatedPhishingMetrics {
  clickRate: number;
  reportRate: number;
  falsePositiveRate: number;
  meanTimeToReportSeconds: number | null;
  meanTimeToDecisionSeconds: number | null;
  suspiciousIndicatorFlaggingRate: number;
  period: {
    start: string;
    end: string;
  };
  sampleSize: number;
}

export class PhishingMetricsService {
  private readonly db: DB;

  public constructor(db: DB) {
    this.db = db;
  }

  public async computeMetrics(input: PhishingMetricsInput): Promise<PhishingMetricsResult> {
    const conditions = [eq(analyticsEvents.tenantId, input.tenantId)];

    if (input.userId) {
      conditions.push(eq(analyticsEvents.userId, input.userId));
    }

    if (input.startDate) {
      conditions.push(gte(analyticsEvents.eventTime, input.startDate));
    }

    if (input.endDate) {
      conditions.push(lte(analyticsEvents.eventTime, input.endDate));
    }

    const whereClause = and(...conditions);

    const emailEvents = await this.db
      .select()
      .from(analyticsEvents)
      .where(whereClause)
      .orderBy(desc(analyticsEvents.eventTime))
      .execute();

    const typedEvents = emailEvents.map((e) => ({
      ...e,
      eventProperties: e.eventProperties as Record<string, unknown>,
    }));

    return this.calculateMetricsFromEvents(typedEvents);
  }

  private calculateMetricsFromEvents(
    events: Array<{
      eventName: string;
      eventTime: Date;
      eventProperties: Record<string, unknown>;
      userId: string;
    }>,
  ): PhishingMetricsResult {
    const phishingEmails = events.filter(
      (e) =>
        e.eventName === 'game.email.received' && e.eventProperties['email_type'] === 'phishing',
    );
    const legitimateEmails = events.filter(
      (e) =>
        e.eventName === 'game.email.received' && e.eventProperties['email_type'] === 'legitimate',
    );

    const userEmailEvents: Map<
      string,
      {
        received?: Date;
        clicked?: Date;
        reported?: Date;
        indicatorsMarked: number;
        flagged?: boolean;
        decision?: string;
      }
    > = new Map();

    for (const event of events) {
      if (!userEmailEvents.has(event.userId)) {
        userEmailEvents.set(event.userId, { indicatorsMarked: 0 });
      }

      const userEvents = userEmailEvents.get(event.userId)!;

      switch (event.eventName) {
        case 'game.email.received':
          userEvents.received = event.eventTime;
          break;
        case 'game.email.opened':
        case 'game.email.url.hovered':
          if (!userEvents.clicked && event.eventProperties['action'] === 'click') {
            userEvents.clicked = event.eventTime;
          }
          break;
        case 'game.decision.approved':
        case 'game.decision.denied':
          userEvents.decision = event.eventName;
          if (
            event.eventProperties['email_type'] === 'legitimate' &&
            event.eventName === 'game.decision.denied'
          ) {
            userEvents.flagged = true;
          }
          break;
        case 'game.decision.flagged':
          userEvents.reported = event.eventTime;
          break;
        case 'game.email.indicator.marked':
          userEvents.indicatorsMarked++;
          break;
      }
    }

    const phishingEmailIds = new Set(
      phishingEmails.map((e) => `${e.userId}-${e.eventTime.getTime()}`),
    );
    const legitimateEmailIds = new Set(
      legitimateEmails.map((e) => `${e.userId}-${e.eventTime.getTime()}`),
    );

    let totalClicks = 0;
    let totalReports = 0;
    let totalFalsePositives = 0;
    let totalReportTimes = 0;
    let reportCount = 0;
    let totalDecisionTimes = 0;
    let decisionCount = 0;
    let totalIndicatorsMarked = 0;
    let totalIndicatorsExpected = 0;

    for (const [userId, userEvents] of userEmailEvents) {
      if (phishingEmailIds.has(`${userId}-${userEvents.received?.getTime() ?? 0}`)) {
        if (userEvents.clicked) {
          totalClicks++;
        }
        if (userEvents.reported) {
          totalReports++;
          if (userEvents.received) {
            totalReportTimes +=
              (userEvents.reported.getTime() - userEvents.received.getTime()) / 1000;
            reportCount++;
          }
        }
        if (userEvents.received) {
          totalDecisionTimes +=
            (userEvents.clicked?.getTime() ??
              userEvents.reported?.getTime() ??
              0 - userEvents.received.getTime()) / 1000;
          decisionCount++;
        }
      }

      if (legitimateEmailIds.has(`${userId}-${userEvents.received?.getTime() ?? 0}`)) {
        if (userEvents.flagged) {
          totalFalsePositives++;
        }
      }

      if (userEvents.indicatorsMarked > 0) {
        totalIndicatorsMarked += userEvents.indicatorsMarked;
        totalIndicatorsExpected += Math.max(userEvents.indicatorsMarked, 1);
      }
    }

    const totalPhishingEmails = phishingEmails.length;
    const totalLegitimateEmails = legitimateEmails.length;

    const clickRate = totalPhishingEmails > 0 ? totalClicks / totalPhishingEmails : 0;
    const reportRate = totalPhishingEmails > 0 ? totalReports / totalPhishingEmails : 0;
    const falsePositiveRate =
      totalLegitimateEmails > 0 ? totalFalsePositives / totalLegitimateEmails : 0;
    const meanTimeToReportSeconds = reportCount > 0 ? totalReportTimes / reportCount : null;
    const meanTimeToDecisionSeconds = decisionCount > 0 ? totalDecisionTimes / decisionCount : null;
    const suspiciousIndicatorFlaggingRate =
      totalIndicatorsExpected > 0 ? totalIndicatorsMarked / totalIndicatorsExpected : 0;

    return {
      clickRate,
      reportRate,
      falsePositiveRate,
      meanTimeToReportSeconds,
      meanTimeToDecisionSeconds,
      suspiciousIndicatorFlaggingRate,
      totalPhishingEmails,
      totalLegitimateEmails,
      totalClicks,
      totalReports,
      totalFalsePositives,
      sampleSize: userEmailEvents.size,
    };
  }

  public async computeAggregatedMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AggregatedPhishingMetrics> {
    const metrics = await this.computeMetrics({
      tenantId,
      startDate,
      endDate,
    });

    return {
      clickRate: metrics.clickRate,
      reportRate: metrics.reportRate,
      falsePositiveRate: metrics.falsePositiveRate,
      meanTimeToReportSeconds: metrics.meanTimeToReportSeconds,
      meanTimeToDecisionSeconds: metrics.meanTimeToDecisionSeconds,
      suspiciousIndicatorFlaggingRate: metrics.suspiciousIndicatorFlaggingRate,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      sampleSize: metrics.sampleSize,
    };
  }
}
