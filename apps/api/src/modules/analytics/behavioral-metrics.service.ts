import { getOutcome, getCompetencyTags, getThreatTier } from '../../shared/utils/payload.js';
import { GAME_THREAT_TIERS } from '@the-dmz/shared/game';

import type { DomainEvent } from '../../shared/events/event-types.js';

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
  private emailReceiveTimes: Map<string, string> = new Map();

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
      const emailId = payload?.['email_id'] as string | undefined;
      const isPhishing = payload?.['is_phishing'] as boolean | undefined;

      if (emailId && isPhishing) {
        this.emailReceiveTimes.set(emailId, event.timestamp);
      }
    }

    if (
      event.eventType === 'game.decision.approved' ||
      event.eventType === 'game.decision.denied' ||
      event.eventType === 'game.decision.flagged'
    ) {
      update.totalDecisions = currentMetrics.totalDecisions + 1;

      const outcome = getOutcome(payload);
      const competencyTags = getCompetencyTags(payload);
      const threatTier = getThreatTier(payload);
      const emailId = payload?.['email_id'] as string | undefined;

      if (competencyTags?.includes('phishing_detection')) {
        const isRisky =
          threatTier === GAME_THREAT_TIERS.HIGH || threatTier === GAME_THREAT_TIERS.SEVERE;
        if (isRisky && outcome === 'correct') {
          update.riskyApprovals = currentMetrics.riskyApprovals + 1;
        }

        if (event.eventType === 'game.decision.flagged' || outcome === 'correct') {
          const receiveTime = this.emailReceiveTimes.get(emailId || '');
          if (receiveTime) {
            const reportTime =
              new Date(event.timestamp).getTime() - new Date(receiveTime).getTime();
            const newReportTimes = [...currentMetrics.reportTimes, reportTime];
            update.reportTimes = newReportTimes;

            const meanTimeToReport =
              newReportTimes.reduce((a, b) => a + b, 0) / newReportTimes.length;
            update.meanTimeToReportMs = meanTimeToReport;

            this.emailReceiveTimes.delete(emailId || '');
          }
        }
      }

      if (competencyTags?.includes('data_handling')) {
        update.totalDataHandlingDecisions = currentMetrics.totalDataHandlingDecisions + 1;

        if (outcome === 'correct') {
          update.correctDataHandlingDecisions = currentMetrics.correctDataHandlingDecisions + 1;
        }
      }

      if (competencyTags?.includes('password_security')) {
        if (outcome === 'correct') {
          update.passwordHygieneScore = Math.min(100, currentMetrics.passwordHygieneScore + 2);
        } else if (outcome === 'incorrect') {
          update.passwordHygieneScore = Math.max(0, currentMetrics.passwordHygieneScore - 5);
        }
      }
    }

    if (event.eventType === 'game.verification.packet_opened') {
      update.verificationActions = currentMetrics.verificationActions + 1;
    }

    if (event.eventType === 'game.verification.result') {
      const outcome = getOutcome(payload);

      update.verificationActions = currentMetrics.verificationActions + 1;

      if (outcome === 'correct') {
        update.verificationActions = currentMetrics.verificationActions + 1;
      }
    }

    if (update.totalDecisions !== undefined) {
      const totalDecisions = update.totalDecisions;
      const verificationActions =
        (event.eventType.includes('verification') ? 1 : 0) + currentMetrics.verificationActions;
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
