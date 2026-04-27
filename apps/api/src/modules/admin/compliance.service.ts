import {
  REGULATORY_FRAMEWORKS,
  type RegulatoryFramework,
  getFrameworkValidityYears,
} from '@the-dmz/shared';

import { loadConfig, type AppConfig } from '../../config.js';
import { createAuditLog } from '../audit/index.js';

import {
  determineStatus,
  calculateCompetencyCompletion,
  calculateCertificateCompletion,
  calculateFrameworkCompletion,
  aggregateDashboardData,
  type SnapshotForAggregation,
} from './compliance.calculator.js';
import { ComplianceRepository } from './compliance.repository.js';

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

export const initializeFrameworkRequirements = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const repository = ComplianceRepository.create(config);

  for (const frameworkId of REGULATORY_FRAMEWORKS) {
    const existing = await repository.findRequirements(tenantId, frameworkId);
    if (existing.length > 0) continue;

    const defaultReqs = DEFAULT_REQUIREMENTS[frameworkId];
    if (!defaultReqs) continue;

    await repository.insertRequirements(tenantId, frameworkId, defaultReqs);
  }
};

interface RequirementCompletionResult {
  completionPercentage: number;
  status: ComplianceStatus;
}

export function calculateRequirementCompletion(
  profiles: Array<{ competencyScores: Record<string, { score: number; evidenceCount: number }> }>,
  requirement: { id: string; minCompetencyScore: number },
  certs: Array<{ frameworkId: string }>,
  frameworkId: RegulatoryFramework,
): RequirementCompletionResult {
  const reqProfiles = profiles.map((p) => ({
    competencyScores: p.competencyScores,
  }));
  const competencyCompletion = calculateCompetencyCompletion(
    reqProfiles,
    requirement.minCompetencyScore,
  );
  const certificateCompletion = calculateCertificateCompletion(certs, frameworkId);
  const completionPercentage = Math.max(competencyCompletion, certificateCompletion);
  const status = determineStatus(completionPercentage);

  return { completionPercentage, status };
}

export async function updateRequirementStatus(
  repository: ComplianceRepository,
  requirementId: string,
  status: ComplianceStatus,
  completionPercentage: number,
): Promise<void> {
  await repository.updateRequirements(requirementId, status, completionPercentage, new Date());
}

export const calculateComplianceSnapshot = async (
  tenantId: string,
  frameworkId: RegulatoryFramework,
  userId: string = 'system',
  config: AppConfig = loadConfig(),
): Promise<ComplianceSnapshotData> => {
  const repository = ComplianceRepository.create(config);

  const profiles = await repository.findProfiles(tenantId);

  const certs = await repository.findCertificates(tenantId);

  const requirements = await repository.findRequirements(tenantId, frameworkId);

  const requirementsInput = requirements.map((r) => ({
    id: r.id,
    minCompetencyScore: r.minCompetencyScore,
  }));

  const profilesWithScores = profiles.map((p) => ({
    competencyScores: p.competencyScores,
  }));

  const certsInput = certs.map((c) => ({ frameworkId: c.frameworkId }));

  const { completionPercentage, requirementsCompleted, status } = calculateFrameworkCompletion(
    requirementsInput,
    profilesWithScores,
    certsInput,
    frameworkId,
  );

  for (const req of requirements) {
    const { completionPercentage: reqCompletion, status: reqStatus } =
      calculateRequirementCompletion(profiles, req, certsInput, frameworkId);
    await updateRequirementStatus(repository, req.id, reqStatus, reqCompletion);
  }

  const validityYears = getFrameworkValidityYears(frameworkId);
  const now = new Date();
  const nextAssessmentDue = new Date(now);
  nextAssessmentDue.setFullYear(nextAssessmentDue.getFullYear() + validityYears);

  const snapshot = await repository.upsertSnapshot({
    tenantId,
    frameworkId,
    status,
    completionPercentage,
    lastAssessedAt: now,
    nextAssessmentDue,
    requirements: { total: requirements.length, completed: requirementsCompleted },
    metadata: {},
    snapshotDate: now,
  });

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
  const repository = ComplianceRepository.create(config);

  const snapshots = await repository.findSnapshots(tenantId);

  const dashboardData = aggregateDashboardData(
    snapshots as SnapshotForAggregation[],
    REGULATORY_FRAMEWORKS.length,
  );

  return dashboardData;
};

export const getComplianceDetail = async (
  tenantId: string,
  frameworkId: RegulatoryFramework,
  config: AppConfig = loadConfig(),
): Promise<ComplianceDetail | null> => {
  const repository = ComplianceRepository.create(config);

  const snapshot = await repository.findSnapshotByFramework(tenantId, frameworkId);
  if (!snapshot) return null;

  const requirementsCount = await repository.countRequirements(tenantId, frameworkId);
  const requirementsCompleted = await repository.countCompliantRequirements(tenantId, frameworkId);
  const requirements = await repository.findRequirements(tenantId, frameworkId);

  return {
    frameworkId: snapshot.frameworkId as RegulatoryFramework,
    status: snapshot.status as ComplianceStatus,
    completionPercentage: snapshot.completionPercentage,
    lastAssessedAt: snapshot.lastAssessedAt ? new Date(snapshot.lastAssessedAt) : null,
    nextAssessmentDue: snapshot.nextAssessmentDue ? new Date(snapshot.nextAssessmentDue) : null,
    requirementsCount,
    requirementsCompleted,
    requirements: requirements.map((r) => ComplianceRepository.mapRequirementRowToDto(r)),
    metadata: snapshot.metadata as Record<string, unknown>,
  };
};

export const getFrameworkRequirements = async (
  tenantId: string,
  frameworkId: RegulatoryFramework,
  config: AppConfig = loadConfig(),
): Promise<FrameworkRequirementData[]> => {
  const repository = ComplianceRepository.create(config);

  const requirements = await repository.findRequirements(tenantId, frameworkId);

  return requirements.map((r) => ComplianceRepository.mapRequirementRowToDto(r));
};
