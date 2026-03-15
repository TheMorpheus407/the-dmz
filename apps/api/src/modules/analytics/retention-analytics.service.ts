import type { RetentionCohort } from '../../db/schema/analytics/index.js';

export class RetentionAnalyticsService {
  private readonly SEASON_LEVEL_THRESHOLDS = [1, 5, 10, 20, 30, 50];

  public initializeCohort(
    userId: string,
    tenantId: string,
    sessionAt: Date,
    seasonLevel: number = 0,
  ): Omit<RetentionCohort, 'id' | 'createdAt' | 'updatedAt'> & {
    createdAt: Date;
    updatedAt: Date;
  } {
    const cohortDate = new Date(sessionAt);
    cohortDate.setHours(0, 0, 0, 0);

    return {
      userId,
      tenantId,
      cohortDate,
      firstSessionAt: sessionAt,
      lastSessionAt: sessionAt,
      totalSessions: 1,
      totalMinutesPlayed: 0,
      sessionDates: [sessionAt.toISOString().split('T')[0]!],
      d1Retained: 0,
      d7Retained: 0,
      d30Retained: 0,
      d60Retained: 0,
      d90Retained: 0,
      churnedAt: null,
      churnRiskScore: null,
      contentDropOffPoints: [],
      seasonProgressionLevel: seasonLevel,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  public updateCohortFromSession(
    currentCohort: RetentionCohort,
    sessionAt: Date,
    sessionDurationMinutes: number,
    seasonLevel: number,
    contentId?: string,
  ): Partial<RetentionCohort> {
    const update: Partial<RetentionCohort> = {};
    const sessionDateStr = sessionAt.toISOString().split('T')[0]!;
    const sessionDates = currentCohort.sessionDates as string[];

    if (!sessionDates.includes(sessionDateStr)) {
      update.sessionDates = [...sessionDates, sessionDateStr];
      update.totalSessions = currentCohort.totalSessions + 1;
    } else {
      update.totalSessions = currentCohort.totalSessions + 1;
    }

    update.totalMinutesPlayed = currentCohort.totalMinutesPlayed + sessionDurationMinutes;
    update.lastSessionAt = sessionAt;
    update.seasonProgressionLevel = seasonLevel;

    if (contentId) {
      const currentDropOffs = currentCohort.contentDropOffPoints as string[];
      if (!currentDropOffs.includes(contentId)) {
        update.contentDropOffPoints = [...currentDropOffs, contentId];
      }
    }

    const daysSinceCohort = this.calculateDaysBetween(currentCohort.cohortDate, sessionAt);

    update.d1Retained = daysSinceCohort >= 1 ? 1 : 0;
    update.d7Retained = daysSinceCohort >= 7 ? 1 : 0;
    update.d30Retained = daysSinceCohort >= 30 ? 1 : 0;
    update.d60Retained = daysSinceCohort >= 60 ? 1 : 0;
    update.d90Retained = daysSinceCohort >= 90 ? 1 : 0;

    const churnRisk = this.calculateChurnRisk(
      update.totalSessions ?? currentCohort.totalSessions,
      update.totalMinutesPlayed ?? currentCohort.totalMinutesPlayed,
      daysSinceCohort,
      sessionAt,
      currentCohort.lastSessionAt,
    );
    update.churnRiskScore = churnRisk;

    if (churnRisk >= 80) {
      update.churnedAt = sessionAt;
    }

    update.updatedAt = new Date();

    return update;
  }

  public calculateRetentionRate(retained: number, cohortSize: number): number {
    if (cohortSize === 0) return 0;
    return retained / cohortSize;
  }

  public calculateD1Retention(cohort: RetentionCohort): number {
    return this.calculateRetentionRate(cohort.d1Retained, 1);
  }

  public calculateD7Retention(cohort: RetentionCohort): number {
    return this.calculateRetentionRate(cohort.d7Retained, 1);
  }

  public calculateD30Retention(cohort: RetentionCohort): number {
    return this.calculateRetentionRate(cohort.d30Retained, 1);
  }

  public calculateD60Retention(cohort: RetentionCohort): number {
    return this.calculateRetentionRate(cohort.d60Retained, 1);
  }

  public calculateD90Retention(cohort: RetentionCohort): number {
    return this.calculateRetentionRate(cohort.d90Retained, 1);
  }

  public getRetentionCurve(cohort: RetentionCohort): {
    d1: number;
    d7: number;
    d30: number;
    d60: number;
    d90: number;
  } {
    return {
      d1: this.calculateD1Retention(cohort),
      d7: this.calculateD7Retention(cohort),
      d30: this.calculateD30Retention(cohort),
      d60: this.calculateD60Retention(cohort),
      d90: this.calculateD90Retention(cohort),
    };
  }

  public calculateChurnRisk(
    totalSessions: number,
    totalMinutesPlayed: number,
    daysSinceCohort: number,
    currentSessionAt: Date,
    lastSessionAt: Date,
  ): number {
    let riskScore = 0;

    if (totalSessions < 3) {
      riskScore += 40;
    } else if (totalSessions < 7) {
      riskScore += 20;
    }

    if (totalMinutesPlayed < 30) {
      riskScore += 30;
    } else if (totalMinutesPlayed < 60) {
      riskScore += 15;
    }

    const daysSinceLastSession = this.calculateDaysBetween(lastSessionAt, currentSessionAt);
    if (daysSinceLastSession > 7) {
      riskScore += 30;
    }

    const recentSessionFrequency = totalSessions / Math.max(1, daysSinceCohort);
    if (recentSessionFrequency < 0.1) {
      riskScore += 20;
    }

    return Math.min(100, riskScore);
  }

  public predict14DayChurn(churnRiskScore: number): number {
    return churnRiskScore / 100;
  }

  public getSeasonProgressionPercentage(level: number): number {
    const maxLevel = this.SEASON_LEVEL_THRESHOLDS[this.SEASON_LEVEL_THRESHOLDS.length - 1] ?? 50;
    return Math.min(100, (level / maxLevel) * 100);
  }

  public getNextSeasonMilestone(currentLevel: number): number | null {
    for (const threshold of this.SEASON_LEVEL_THRESHOLDS) {
      if (threshold > currentLevel) {
        return threshold;
      }
    }
    return null;
  }

  public calculateAverageSessionDuration(totalMinutes: number, totalSessions: number): number {
    if (totalSessions === 0) return 0;
    return totalMinutes / totalSessions;
  }

  public calculateSessionFrequency(totalSessions: number, daysSinceFirstSession: number): number {
    if (daysSinceFirstSession === 0) return 0;
    return totalSessions / daysSinceFirstSession;
  }

  private calculateDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getContentDropOffRate(dropOffPoints: string[], totalContentItems: number): number {
    if (totalContentItems === 0) return 0;
    return dropOffPoints.length / totalContentItems;
  }
}
