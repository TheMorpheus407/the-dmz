import { type RegulatoryFramework } from '@the-dmz/shared';

import type {
  ComplianceDashboardData,
  ComplianceStatus,
  ComplianceSummary,
} from './compliance.service.js';

export function determineStatus(completionPercentage: number): ComplianceStatus {
  if (completionPercentage >= 100) return 'compliant';
  if (completionPercentage > 0) return 'in_progress';
  return 'not_started';
}

export function calculateCompetencyCompletion(
  profiles: Array<{ competencyScores: Record<string, { score: number; evidenceCount: number }> }>,
  minScore: number,
): number {
  if (profiles.length === 0) return 0;

  const completedCount = profiles.filter((profile) => {
    const scores = profile.competencyScores as Record<
      string,
      { score: number; evidenceCount: number }
    >;
    for (const domain of Object.values(scores)) {
      if (domain.evidenceCount > 0 && domain.score >= minScore) {
        return true;
      }
    }
    return false;
  }).length;

  return (completedCount / profiles.length) * 100;
}

export function calculateCertificateCompletion(
  certs: Array<{ frameworkId: string }>,
  frameworkId: string,
): number {
  const frameworkCerts = certs.filter((c) => c.frameworkId === frameworkId);
  return frameworkCerts.length > 0 ? 100 : 0;
}

export function calculateFrameworkCompletion(
  requirements: Array<{ id: string; minCompetencyScore: number }>,
  profiles: Array<{ competencyScores: Record<string, { score: number; evidenceCount: number }> }>,
  certs: Array<{ frameworkId: string }>,
  frameworkId: string,
): { completionPercentage: number; requirementsCompleted: number; status: ComplianceStatus } {
  if (requirements.length === 0) {
    return { completionPercentage: 0, requirementsCompleted: 0, status: 'not_started' };
  }

  let totalCompletion = 0;
  let requirementsCompleted = 0;

  for (const req of requirements) {
    const profilesWithScores = profiles.map((p) => ({
      competencyScores: p.competencyScores as Record<
        string,
        { score: number; evidenceCount: number }
      >,
    }));
    const competencyCompletion = calculateCompetencyCompletion(
      profilesWithScores,
      req.minCompetencyScore,
    );
    const certificateCompletion = calculateCertificateCompletion(certs, frameworkId);

    const reqCompletion = Math.max(competencyCompletion, certificateCompletion);
    const reqStatus = determineStatus(reqCompletion);

    totalCompletion += reqCompletion;
    if (reqStatus === 'compliant') {
      requirementsCompleted++;
    }
  }

  const completionPercentage = totalCompletion / requirements.length;
  const status = determineStatus(completionPercentage);

  return { completionPercentage, requirementsCompleted, status };
}

export interface SnapshotForAggregation {
  id: string;
  tenantId: string;
  frameworkId: RegulatoryFramework;
  status: ComplianceStatus;
  completionPercentage: number;
  lastAssessedAt: Date | null;
  nextAssessmentDue: Date | null;
  requirements: unknown;
  metadata: unknown;
  snapshotDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function aggregateDashboardData(
  snapshots: SnapshotForAggregation[],
  totalFrameworks: number,
): ComplianceDashboardData {
  const summaries: ComplianceSummary[] = [];
  let compliantCount = 0;
  let inProgressCount = 0;
  let nonCompliantCount = 0;
  let notStartedCount = 0;

  for (const snapshot of snapshots) {
    const summary: ComplianceSummary = {
      frameworkId: snapshot.frameworkId,
      status: snapshot.status,
      completionPercentage: snapshot.completionPercentage,
      lastAssessedAt: snapshot.lastAssessedAt,
      nextAssessmentDue: snapshot.nextAssessmentDue,
      requirementsCount:
        ((snapshot.requirements as Record<string, unknown>)['total'] as number) || 0,
      requirementsCompleted:
        ((snapshot.requirements as Record<string, unknown>)['completed'] as number) || 0,
    };

    summaries.push(summary);

    switch (snapshot.status) {
      case 'compliant':
        compliantCount++;
        break;
      case 'in_progress':
        inProgressCount++;
        break;
      case 'non_compliant':
        nonCompliantCount++;
        break;
      case 'not_started':
        notStartedCount++;
        break;
    }
  }

  return {
    summaries,
    totalFrameworks,
    compliantCount,
    inProgressCount,
    nonCompliantCount,
    notStartedCount,
  };
}
