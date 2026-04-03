import { eq, and, desc } from 'drizzle-orm';

import {
  REGULATORY_FRAMEWORKS,
  type RegulatoryFramework,
  getFrameworkValidityYears,
} from '@the-dmz/shared';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { complianceSnapshots, frameworkRequirements } from '../../db/schema/compliance/index.js';
import { playerProfiles } from '../../db/schema/analytics/index.js';
import { certificates } from '../../shared/database/schema/training/index.js';
import { createAuditLog } from '../audit/index.js';

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'in_progress' | 'not_started';

export interface ComplianceSnapshotData {
  id: string;
  tenantId: string;
  frameworkId: RegulatoryFramework;
  status: ComplianceStatus;
  completionPercentage: number;
  lastAssessedAt: Date | null;
  nextAssessmentDue: Date | null;
  requirements: Record<string, unknown>;
  metadata: Record<string, unknown>;
  snapshotDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrameworkRequirementData {
  id: string;
  tenantId: string;
  frameworkId: RegulatoryFramework;
  requirementId: string;
  requirementName: string;
  description: string | null;
  category: string | null;
  isRequired: boolean;
  minCompetencyScore: number;
  requiredTrainingModules: string[];
  status: ComplianceStatus;
  completionPercentage: number;
  lastAssessedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceSummary {
  frameworkId: RegulatoryFramework;
  status: ComplianceStatus;
  completionPercentage: number;
  lastAssessedAt: Date | null;
  nextAssessmentDue: Date | null;
  requirementsCount: number;
  requirementsCompleted: number;
}

export interface ComplianceDetail extends ComplianceSummary {
  requirements: FrameworkRequirementData[];
  metadata: Record<string, unknown>;
}

export interface ComplianceDashboardData {
  summaries: ComplianceSummary[];
  totalFrameworks: number;
  compliantCount: number;
  inProgressCount: number;
  nonCompliantCount: number;
  notStartedCount: number;
}

const DEFAULT_REQUIREMENTS: Record<
  RegulatoryFramework,
  Array<{
    requirementId: string;
    requirementName: string;
    description: string;
    category: string;
    minCompetencyScore: number;
  }>
> = {
  nist_800_50: [
    {
      requirementId: 'nist-1',
      requirementName: 'Security Awareness Training',
      description: 'All employees must complete security awareness training',
      category: 'Training',
      minCompetencyScore: 70,
    },
    {
      requirementId: 'nist-2',
      requirementName: 'Phishing Recognition',
      description: 'Employees must demonstrate ability to identify phishing attempts',
      category: 'Skills',
      minCompetencyScore: 75,
    },
    {
      requirementId: 'nist-3',
      requirementName: 'Incident Reporting',
      description: 'Staff must know how to report security incidents',
      category: 'Procedures',
      minCompetencyScore: 60,
    },
  ],
  iso_27001: [
    {
      requirementId: 'iso-1',
      requirementName: 'Information Security Awareness',
      description: 'Organization must conduct security awareness training',
      category: 'Training',
      minCompetencyScore: 70,
    },
    {
      requirementId: 'iso-2',
      requirementName: 'Competency Management',
      description: 'Personnel must be competent in information security',
      category: 'Competency',
      minCompetencyScore: 75,
    },
  ],
  pci_dss: [
    {
      requirementId: 'pci-1',
      requirementName: 'Security Awareness Program',
      description: 'Annual security awareness training required',
      category: 'Training',
      minCompetencyScore: 70,
    },
    {
      requirementId: 'pci-2',
      requirementName: 'Payment Security',
      description: 'Staff handling payments must be trained',
      category: 'Training',
      minCompetencyScore: 80,
    },
  ],
  hipaa: [
    {
      requirementId: 'hipaa-1',
      requirementName: 'Privacy Training',
      description: 'All workforce members must complete privacy training',
      category: 'Training',
      minCompetencyScore: 70,
    },
    {
      requirementId: 'hipaa-2',
      requirementName: 'Security Training',
      description: 'Security awareness training for all employees',
      category: 'Training',
      minCompetencyScore: 75,
    },
  ],
  gdpr: [
    {
      requirementId: 'gdpr-1',
      requirementName: 'Data Protection Awareness',
      description: 'Staff must understand data protection requirements',
      category: 'Training',
      minCompetencyScore: 70,
    },
    {
      requirementId: 'gdpr-2',
      requirementName: 'Privacy by Design',
      description: ' personnel must be trained on privacy principles',
      category: 'Training',
      minCompetencyScore: 75,
    },
  ],
  soc_2: [
    {
      requirementId: 'soc2-1',
      requirementName: 'Security Awareness',
      description: 'Annual security awareness training',
      category: 'Training',
      minCompetencyScore: 70,
    },
    {
      requirementId: 'soc2-2',
      requirementName: 'Competent Personnel',
      description: 'Personnel must have necessary security competencies',
      category: 'Competency',
      minCompetencyScore: 75,
    },
  ],
  nis2_article_20: [
    {
      requirementId: 'nis2-1',
      requirementName: 'Cybersecurity Training',
      description: 'Personnel must receive cybersecurity risk management training',
      category: 'Training',
      minCompetencyScore: 75,
    },
    {
      requirementId: 'nis2-2',
      requirementName: 'Incident Management',
      description: 'Staff must be trained on incident handling',
      category: 'Skills',
      minCompetencyScore: 70,
    },
  ],
  dora_article_5: [
    {
      requirementId: 'dora-1',
      requirementName: 'ICT Risk Management Training',
      description: 'Personnel must understand ICT risk management',
      category: 'Training',
      minCompetencyScore: 75,
    },
    {
      requirementId: 'dora-2',
      requirementName: 'Digital Operational Resilience',
      description: 'Staff must be trained on operational resilience',
      category: 'Training',
      minCompetencyScore: 70,
    },
  ],
};

function determineStatus(completionPercentage: number): ComplianceStatus {
  if (completionPercentage >= 100) return 'compliant';
  if (completionPercentage > 0) return 'in_progress';
  return 'not_started';
}

function calculateCompetencyCompletion(
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

function calculateCertificateCompletion(
  certs: Array<{ frameworkId: string }>,
  frameworkId: string,
): number {
  const frameworkCerts = certs.filter((c) => c.frameworkId === frameworkId);
  return frameworkCerts.length > 0 ? 100 : 0;
}

export const initializeFrameworkRequirements = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  for (const frameworkId of REGULATORY_FRAMEWORKS) {
    const existing = await db
      .select()
      .from(frameworkRequirements)
      .where(
        and(
          eq(frameworkRequirements.tenantId, tenantId),
          eq(frameworkRequirements.frameworkId, frameworkId),
        ),
      )
      .limit(1)
      .execute();

    if (existing.length > 0) continue;

    const defaultReqs = DEFAULT_REQUIREMENTS[frameworkId];
    if (!defaultReqs) continue;

    for (const req of defaultReqs) {
      await db
        .insert(frameworkRequirements)
        .values({
          tenantId,
          frameworkId,
          requirementId: req.requirementId,
          requirementName: req.requirementName,
          description: req.description,
          category: req.category,
          isRequired: 1,
          minCompetencyScore: req.minCompetencyScore,
          requiredTrainingModules: [],
          status: 'not_started',
          completionPercentage: 0,
          metadata: {},
        })
        .onConflictDoNothing({
          target: [
            frameworkRequirements.tenantId,
            frameworkRequirements.frameworkId,
            frameworkRequirements.requirementId,
          ],
        })
        .execute();
    }
  }
};

export const calculateComplianceSnapshot = async (
  tenantId: string,
  frameworkId: RegulatoryFramework,
  userId: string = 'system',
  config: AppConfig = loadConfig(),
): Promise<ComplianceSnapshotData> => {
  const db = getDatabaseClient(config);

  const profiles = await db
    .select({ competencyScores: playerProfiles.competencyScores })
    .from(playerProfiles)
    .where(eq(playerProfiles.tenantId, tenantId))
    .execute();

  const certs = await db
    .select({ frameworkId: certificates.frameworkId })
    .from(certificates)
    .where(eq(certificates.tenantId, tenantId))
    .execute();

  const requirements = await db
    .select()
    .from(frameworkRequirements)
    .where(
      and(
        eq(frameworkRequirements.tenantId, tenantId),
        eq(frameworkRequirements.frameworkId, frameworkId),
      ),
    )
    .execute();

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

    await db
      .update(frameworkRequirements)
      .set({
        status: reqStatus,
        completionPercentage: reqCompletion,
        lastAssessedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(frameworkRequirements.id, req.id))
      .execute();

    totalCompletion += reqCompletion;
    if (reqStatus === 'compliant') {
      requirementsCompleted++;
    }
  }

  const completionPercentage = requirements.length > 0 ? totalCompletion / requirements.length : 0;
  const status = determineStatus(completionPercentage);

  const validityYears = getFrameworkValidityYears(frameworkId);
  const now = new Date();
  const nextAssessmentDue = new Date(now);
  nextAssessmentDue.setFullYear(nextAssessmentDue.getFullYear() + validityYears);

  const [snapshot] = await db
    .insert(complianceSnapshots)
    .values({
      tenantId,
      frameworkId,
      status,
      completionPercentage,
      lastAssessedAt: now,
      nextAssessmentDue,
      requirements: { total: requirements.length, completed: requirementsCompleted },
      metadata: {},
      snapshotDate: now,
    })
    .onConflictDoUpdate({
      target: [complianceSnapshots.tenantId, complianceSnapshots.frameworkId],
      set: {
        status,
        completionPercentage,
        lastAssessedAt: now,
        nextAssessmentDue,
        requirements: { total: requirements.length, completed: requirementsCompleted },
        snapshotDate: now,
        updatedAt: new Date(),
      },
    })
    .returning()
    .execute();

  if (!snapshot) {
    throw new Error('Failed to create or update compliance snapshot');
  }

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'compliance_snapshot_calculated',
      resourceType: 'compliance_snapshot',
      resourceId: snapshot.id,
      metadata: {
        frameworkId,
        status,
        completionPercentage,
        requirementsTotal: requirements.length,
        requirementsCompleted,
      },
    },
    config,
  );

  return {
    id: snapshot.id,
    tenantId: snapshot.tenantId,
    frameworkId: snapshot.frameworkId as RegulatoryFramework,
    status: snapshot.status as ComplianceStatus,
    completionPercentage: snapshot.completionPercentage,
    lastAssessedAt: snapshot.lastAssessedAt ? new Date(snapshot.lastAssessedAt) : null,
    nextAssessmentDue: snapshot.nextAssessmentDue ? new Date(snapshot.nextAssessmentDue) : null,
    requirements: snapshot.requirements as Record<string, unknown>,
    metadata: snapshot.metadata as Record<string, unknown>,
    snapshotDate: new Date(snapshot.snapshotDate),
    createdAt: new Date(snapshot.createdAt),
    updatedAt: new Date(snapshot.updatedAt),
  };
};

export const calculateAllComplianceSnapshots = async (
  tenantId: string,
  userId: string = 'system',
  config: AppConfig = loadConfig(),
): Promise<ComplianceSnapshotData[]> => {
  await initializeFrameworkRequirements(tenantId, config);

  const results: ComplianceSnapshotData[] = [];
  for (const frameworkId of REGULATORY_FRAMEWORKS) {
    const snapshot = await calculateComplianceSnapshot(tenantId, frameworkId, userId, config);
    results.push(snapshot);
  }
  return results;
};

export const getComplianceSummary = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<ComplianceDashboardData> => {
  const db = getDatabaseClient(config);

  const snapshots = await db
    .select()
    .from(complianceSnapshots)
    .where(eq(complianceSnapshots.tenantId, tenantId))
    .orderBy(desc(complianceSnapshots.frameworkId))
    .execute();

  const summaries: ComplianceSummary[] = [];
  let compliantCount = 0;
  let inProgressCount = 0;
  let nonCompliantCount = 0;
  let notStartedCount = 0;

  for (const snapshot of snapshots) {
    const requirements = await db
      .select({ id: frameworkRequirements.id })
      .from(frameworkRequirements)
      .where(
        and(
          eq(frameworkRequirements.tenantId, tenantId),
          eq(frameworkRequirements.frameworkId, snapshot.frameworkId),
        ),
      )
      .execute();

    const completedReqs = await db
      .select({ id: frameworkRequirements.id })
      .from(frameworkRequirements)
      .where(
        and(
          eq(frameworkRequirements.tenantId, tenantId),
          eq(frameworkRequirements.frameworkId, snapshot.frameworkId),
          eq(frameworkRequirements.status, 'compliant'),
        ),
      )
      .execute();

    const summary: ComplianceSummary = {
      frameworkId: snapshot.frameworkId as RegulatoryFramework,
      status: snapshot.status as ComplianceStatus,
      completionPercentage: snapshot.completionPercentage,
      lastAssessedAt: snapshot.lastAssessedAt ? new Date(snapshot.lastAssessedAt) : null,
      nextAssessmentDue: snapshot.nextAssessmentDue ? new Date(snapshot.nextAssessmentDue) : null,
      requirementsCount: requirements.length,
      requirementsCompleted: completedReqs.length,
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
    totalFrameworks: REGULATORY_FRAMEWORKS.length,
    compliantCount,
    inProgressCount,
    nonCompliantCount,
    notStartedCount,
  };
};

export const getComplianceDetail = async (
  tenantId: string,
  frameworkId: RegulatoryFramework,
  config: AppConfig = loadConfig(),
): Promise<ComplianceDetail | null> => {
  const db = getDatabaseClient(config);

  const [snapshot] = await db
    .select()
    .from(complianceSnapshots)
    .where(
      and(
        eq(complianceSnapshots.tenantId, tenantId),
        eq(complianceSnapshots.frameworkId, frameworkId),
      ),
    )
    .limit(1)
    .execute();

  if (!snapshot) return null;

  const requirements = await db
    .select()
    .from(frameworkRequirements)
    .where(
      and(
        eq(frameworkRequirements.tenantId, tenantId),
        eq(frameworkRequirements.frameworkId, frameworkId),
      ),
    )
    .execute();

  const completedReqs = requirements.filter((r) => r.status === 'compliant');

  return {
    frameworkId: snapshot.frameworkId as RegulatoryFramework,
    status: snapshot.status as ComplianceStatus,
    completionPercentage: snapshot.completionPercentage,
    lastAssessedAt: snapshot.lastAssessedAt ? new Date(snapshot.lastAssessedAt) : null,
    nextAssessmentDue: snapshot.nextAssessmentDue ? new Date(snapshot.nextAssessmentDue) : null,
    requirementsCount: requirements.length,
    requirementsCompleted: completedReqs.length,
    requirements: requirements.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      frameworkId: r.frameworkId as RegulatoryFramework,
      requirementId: r.requirementId,
      requirementName: r.requirementName,
      description: r.description,
      category: r.category,
      isRequired: r.isRequired === 1,
      minCompetencyScore: r.minCompetencyScore,
      requiredTrainingModules: r.requiredTrainingModules as string[],
      status: r.status as ComplianceStatus,
      completionPercentage: r.completionPercentage,
      lastAssessedAt: r.lastAssessedAt ? new Date(r.lastAssessedAt) : null,
      metadata: r.metadata as Record<string, unknown>,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    })),
    metadata: snapshot.metadata as Record<string, unknown>,
  };
};

export const getFrameworkRequirements = async (
  tenantId: string,
  frameworkId: RegulatoryFramework,
  config: AppConfig = loadConfig(),
): Promise<FrameworkRequirementData[]> => {
  const db = getDatabaseClient(config);

  const requirements = await db
    .select()
    .from(frameworkRequirements)
    .where(
      and(
        eq(frameworkRequirements.tenantId, tenantId),
        eq(frameworkRequirements.frameworkId, frameworkId),
      ),
    )
    .execute();

  return requirements.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    frameworkId: r.frameworkId as RegulatoryFramework,
    requirementId: r.requirementId,
    requirementName: r.requirementName,
    description: r.description,
    category: r.category,
    isRequired: r.isRequired === 1,
    minCompetencyScore: r.minCompetencyScore,
    requiredTrainingModules: r.requiredTrainingModules as string[],
    status: r.status as ComplianceStatus,
    completionPercentage: r.completionPercentage,
    lastAssessedAt: r.lastAssessedAt ? new Date(r.lastAssessedAt) : null,
    metadata: r.metadata as Record<string, unknown>,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
};
