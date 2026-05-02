import { getOutcome, getCompetencyTags, getThreatTier } from '../../shared/utils/payload.js';

import type { DomainEvent } from '../../shared/events/event-types.js';

interface TTLCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const EMAIL_RECEIVE_TIME_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface BehavioralMetrics {
  verificationUsageRate: number;
  riskyApprovalRate: number;
  dataHandlingComplianceRate: number;
  meanTimeToReportMs: number | null;
  passwordHygieneScore: number;
  totalDecisions: number;
  verificationActions: number;
  riskyApprovals: number;
  correctDataHandlingDecisions: number;
  totalDataHandlingDecisions: number;
  reportTimes: number[];
}

export class BehavioralMetricsService {
  private emailReceiveTimes: Map<string, TTLCacheEntry<string>> = new Map();

  private getCurrentTime(): number {
    return Date.now();
  }

  private getWithTTL<T>(map: Map<string, TTLCacheEntry<T>>, key: string): T | undefined {
    const entry = map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < this.getCurrentTime()) {
      map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private setWithTTL<T>(
    map: Map<string, TTLCacheEntry<T>>,
    key: string,
    value: T,
    ttlMs: number,
  ): void {
    map.set(key, {
      value,
      expiresAt: this.getCurrentTime() + ttlMs,
    });
  }

  public getInitialMetrics(): BehavioralMetrics {
    return {
      verificationUsageRate: 0,
      riskyApprovalRate: 0,
      dataHandlingComplianceRate: 0,
      meanTimeToReportMs: null,
      passwordHygieneScore: 50,
      totalDecisions: 0,
      verificationActions: 0,
      riskyApprovals: 0,
      correctDataHandlingDecisions: 0,
      totalDataHandlingDecisions: 0,
      reportTimes: [],
    };
  }

  private processEmailReceived(event: DomainEvent, payload: Record<string, unknown>): void {
    const emailId = payload['email_id'] as string | undefined;
    const isPhishing = payload['is_phishing'] as boolean | undefined;

    if (emailId && isPhishing) {
      this.setWithTTL(this.emailReceiveTimes, emailId, event.timestamp, EMAIL_RECEIVE_TIME_TTL_MS);
    }
  }

  private processPhishingDetection(
    currentMetrics: BehavioralMetrics,
    update: Partial<BehavioralMetrics>,
    event: DomainEvent,
    context: {
      outcome: string | undefined;
      threatTier: string | undefined;
      emailId: string | undefined;
      eventType: string;
    },
  ): void {
    const isRiskyThreat = context.threatTier === 'high' || context.threatTier === 'severe';

    if (isRiskyThreat) {
      if (context.outcome === 'correct') {
        update.riskyApprovals = currentMetrics.riskyApprovals + 1;
      }

      if (context.eventType === 'game.decision.flagged' || context.outcome === 'correct') {
        const receiveTime = this.getWithTTL(this.emailReceiveTimes, context.emailId || '');
        if (receiveTime) {
          const reportTime = new Date(event.timestamp).getTime() - new Date(receiveTime).getTime();
          const newReportTimes = [...currentMetrics.reportTimes, reportTime];
          update.reportTimes = newReportTimes;
          update.meanTimeToReportMs =
            newReportTimes.reduce((a, b) => a + b, 0) / newReportTimes.length;
          this.emailReceiveTimes.delete(context.emailId || '');
        }
      }
    }
  }

  private processDataHandling(
    currentMetrics: BehavioralMetrics,
    update: Partial<BehavioralMetrics>,
    outcome: string | undefined,
  ): void {
    update.totalDataHandlingDecisions = currentMetrics.totalDataHandlingDecisions + 1;

    if (outcome === 'correct') {
      update.correctDataHandlingDecisions = currentMetrics.correctDataHandlingDecisions + 1;
    }
  }

  private processPasswordSecurity(
    currentMetrics: BehavioralMetrics,
    update: Partial<BehavioralMetrics>,
    outcome: string | undefined,
  ): void {
    if (outcome === 'correct') {
      update.passwordHygieneScore = Math.min(100, currentMetrics.passwordHygieneScore + 2);
    } else if (outcome === 'incorrect') {
      update.passwordHygieneScore = Math.max(0, currentMetrics.passwordHygieneScore - 5);
    }
  }

  private processVerification(
    currentMetrics: BehavioralMetrics,
    update: Partial<BehavioralMetrics>,
    event: DomainEvent,
    outcome: string | undefined,
  ): void {
    update.verificationActions = currentMetrics.verificationActions + 1;

    if (outcome === 'correct') {
      update.verificationActions = currentMetrics.verificationActions + 1;
    }
  }

  private updateDerivedRates(
    currentMetrics: BehavioralMetrics,
    update: Partial<BehavioralMetrics>,
    eventType: string,
  ): void {
    if (update.totalDecisions !== undefined) {
      const totalDecisions = update.totalDecisions;
      const verificationActions =
        (eventType.includes('verification') ? 1 : 0) + currentMetrics.verificationActions;
      update.verificationUsageRate = verificationActions / totalDecisions;
    }

    if (update.riskyApprovals !== undefined) {
      const totalDecisions = update.totalDecisions || currentMetrics.totalDecisions;
      update.riskyApprovalRate = totalDecisions > 0 ? update.riskyApprovals / totalDecisions : 0;
    }

    if (update.totalDataHandlingDecisions !== undefined) {
      const correctDataHandling =
        update.correctDataHandlingDecisions ?? currentMetrics.correctDataHandlingDecisions;
      const totalDataHandling = update.totalDataHandlingDecisions;
      update.dataHandlingComplianceRate =
        totalDataHandling > 0 ? correctDataHandling / totalDataHandling : 0;
    }
  }

  private processDecisionEvent(
    currentMetrics: BehavioralMetrics,
    update: Partial<BehavioralMetrics>,
    event: DomainEvent,
    payload: Record<string, unknown>,
  ): void {
    update.totalDecisions = currentMetrics.totalDecisions + 1;

    const outcome = getOutcome(payload) as string | undefined;
    const competencyTags = getCompetencyTags(payload);
    const threatTier = getThreatTier(payload);
    const emailId = payload['email_id'] as string | undefined;

    if (competencyTags?.includes('phishing_detection')) {
      this.processPhishingDetection(currentMetrics, update, event, {
        outcome,
        threatTier,
        emailId,
        eventType: event.eventType,
      });
    }

    if (competencyTags?.includes('data_handling')) {
      this.processDataHandling(currentMetrics, update, outcome);
    }

    if (competencyTags?.includes('password_security')) {
      this.processPasswordSecurity(currentMetrics, update, outcome);
    }
  }

  public updateMetricsFromEvent(
    currentMetrics: BehavioralMetrics,
    event: DomainEvent,
  ): Partial<BehavioralMetrics> {
    const payload = event.payload as Record<string, unknown> | undefined;
    const update: Partial<BehavioralMetrics> = {};

    if (!payload) {
      return update;
    }

    if (event.eventType === 'game.email.received') {
      this.processEmailReceived(event, payload);
      return update;
    }

    if (
      event.eventType === 'game.decision.approved' ||
      event.eventType === 'game.decision.denied' ||
      event.eventType === 'game.decision.flagged'
    ) {
      this.processDecisionEvent(currentMetrics, update, event, payload);
    }

    if (event.eventType === 'game.verification.packet_opened') {
      update.verificationActions = currentMetrics.verificationActions + 1;
    }

    if (event.eventType === 'game.verification.result') {
      const outcome = getOutcome(payload) as string | undefined;
      this.processVerification(currentMetrics, update, event, outcome);
    }

    this.updateDerivedRates(currentMetrics, update, event.eventType);

    return update;
  }

  public calculateVerificationUsageRate(
    verificationActions: number,
    totalDecisions: number,
  ): number {
    if (totalDecisions === 0) return 0;
    return verificationActions / totalDecisions;
  }

  public calculateRiskyApprovalRate(riskyApprovals: number, totalDecisions: number): number {
    if (totalDecisions === 0) return 0;
    return riskyApprovals / totalDecisions;
  }

  public calculateDataHandlingComplianceRate(
    correctDecisions: number,
    totalDecisions: number,
  ): number {
    if (totalDecisions === 0) return 0;
    return correctDecisions / totalDecisions;
  }

  public calculateMeanTimeToReport(reportTimes: number[]): number | null {
    if (reportTimes.length === 0) return null;
    return reportTimes.reduce((a, b) => a + b, 0) / reportTimes.length;
  }

  public calculateChurnRiskScore(metrics: BehavioralMetrics): number {
    let riskScore = 0;

    if (metrics.verificationUsageRate < 0.1) {
      riskScore += 30;
    }

    if (metrics.riskyApprovalRate > 0.3) {
      riskScore += 40;
    }

    if (metrics.dataHandlingComplianceRate < 0.5) {
      riskScore += 30;
    }

    if (metrics.passwordHygieneScore < 40) {
      riskScore += 20;
    }

    return Math.min(100, riskScore);
  }
}
