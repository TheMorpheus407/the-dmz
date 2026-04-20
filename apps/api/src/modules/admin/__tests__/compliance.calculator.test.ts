import { describe, expect, it } from 'vitest';

import {
  determineStatus,
  calculateCompetencyCompletion,
  calculateCertificateCompletion,
  calculateFrameworkCompletion,
  aggregateDashboardData,
} from '../compliance.calculator.js';

import type { SnapshotForAggregation } from '../compliance.calculator.js';

describe('compliance.calculator', () => {
  describe('determineStatus', () => {
    it('returns compliant when completion is 100', () => {
      expect(determineStatus(100)).toBe('compliant');
    });

    it('returns compliant when completion is greater than 100', () => {
      expect(determineStatus(150)).toBe('compliant');
    });

    it('returns in_progress when completion is between 0 and 100', () => {
      expect(determineStatus(1)).toBe('in_progress');
      expect(determineStatus(50)).toBe('in_progress');
      expect(determineStatus(99)).toBe('in_progress');
    });

    it('returns not_started when completion is 0', () => {
      expect(determineStatus(0)).toBe('not_started');
    });

    it('returns not_started when completion is negative', () => {
      expect(determineStatus(-10)).toBe('not_started');
    });
  });

  describe('calculateCompetencyCompletion', () => {
    it('returns 0 when profiles array is empty', () => {
      const profiles: Array<{
        competencyScores: Record<string, { score: number; evidenceCount: number }>;
      }> = [];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(0);
    });

    it('returns 0 when no profile has evidence', () => {
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 90, evidenceCount: 0 },
          },
        },
      ];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(0);
    });

    it('returns 0 when no profile meets minimum score', () => {
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 60, evidenceCount: 5 },
          },
        },
      ];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(0);
    });

    it('returns 100 when all profiles meet minimum score with evidence', () => {
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 90, evidenceCount: 5 },
          },
        },
      ];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(100);
    });

    it('returns 50 when half of profiles meet minimum score', () => {
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 90, evidenceCount: 5 },
          },
        },
        {
          competencyScores: {
            phishing_detection: { score: 60, evidenceCount: 5 },
          },
        },
      ];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(50);
    });

    it('returns 100 when any domain in profile meets minimum score with evidence', () => {
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 60, evidenceCount: 5 },
            incident_reporting: { score: 90, evidenceCount: 3 },
          },
        },
      ];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(100);
    });

    it('handles multiple profiles with multiple domains', () => {
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 90, evidenceCount: 5 },
            incident_reporting: { score: 80, evidenceCount: 3 },
          },
        },
        {
          competencyScores: {
            phishing_detection: { score: 60, evidenceCount: 5 },
            incident_reporting: { score: 90, evidenceCount: 3 },
          },
        },
      ];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(100);
    });

    it('uses exact minimum score as threshold', () => {
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 70, evidenceCount: 5 },
          },
        },
      ];
      expect(calculateCompetencyCompletion(profiles, 70)).toBe(100);
    });
  });

  describe('calculateCertificateCompletion', () => {
    it('returns 0 when certificates array is empty', () => {
      const certs: Array<{ frameworkId: string }> = [];
      expect(calculateCertificateCompletion(certs, 'nist_800_50')).toBe(0);
    });

    it('returns 0 when no certificate matches framework', () => {
      const certs = [{ frameworkId: 'iso_27001' }];
      expect(calculateCertificateCompletion(certs, 'nist_800_50')).toBe(0);
    });

    it('returns 100 when at least one certificate matches framework', () => {
      const certs = [{ frameworkId: 'nist_800_50' }];
      expect(calculateCertificateCompletion(certs, 'nist_800_50')).toBe(100);
    });

    it('returns 100 when multiple certificates match framework', () => {
      const certs = [{ frameworkId: 'nist_800_50' }, { frameworkId: 'nist_800_50' }];
      expect(calculateCertificateCompletion(certs, 'nist_800_50')).toBe(100);
    });

    it('returns 100 when certificate matches and others do not', () => {
      const certs = [
        { frameworkId: 'iso_27001' },
        { frameworkId: 'nist_800_50' },
        { frameworkId: 'pci_dss' },
      ];
      expect(calculateCertificateCompletion(certs, 'nist_800_50')).toBe(100);
    });
  });

  describe('calculateFrameworkCompletion', () => {
    interface TestRequirement {
      id: string;
      minCompetencyScore: number;
    }

    it('returns 0 when requirements array is empty', () => {
      const requirements: TestRequirement[] = [];
      const profiles: Array<{
        competencyScores: Record<string, { score: number; evidenceCount: number }>;
      }> = [];
      const certs: Array<{ frameworkId: string }> = [];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.completionPercentage).toBe(0);
      expect(result.requirementsCompleted).toBe(0);
    });

    it('calculates completion based on competency when no certificates exist', () => {
      const requirements: TestRequirement[] = [{ id: 'req-1', minCompetencyScore: 70 }];
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 90, evidenceCount: 5 },
          },
        },
      ];
      const certs: Array<{ frameworkId: string }> = [];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.completionPercentage).toBe(100);
      expect(result.requirementsCompleted).toBe(1);
    });

    it('calculates completion based on certificates when competency is insufficient', () => {
      const requirements: TestRequirement[] = [{ id: 'req-1', minCompetencyScore: 90 }];
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 70, evidenceCount: 5 },
          },
        },
      ];
      const certs = [{ frameworkId: 'nist_800_50' }];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.completionPercentage).toBe(100);
      expect(result.requirementsCompleted).toBe(1);
    });

    it('takes maximum of competency and certificate completion', () => {
      const requirements: TestRequirement[] = [{ id: 'req-1', minCompetencyScore: 70 }];
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 80, evidenceCount: 5 },
          },
        },
      ];
      const certs = [{ frameworkId: 'nist_800_50' }];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.completionPercentage).toBe(100);
      expect(result.requirementsCompleted).toBe(1);
    });

    it('calculates partial completion correctly', () => {
      const requirements: TestRequirement[] = [
        { id: 'req-1', minCompetencyScore: 70 },
        { id: 'req-2', minCompetencyScore: 90 },
      ];
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 80, evidenceCount: 5 },
          },
        },
      ];
      const certs: Array<{ frameworkId: string }> = [];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.completionPercentage).toBe(50);
      expect(result.requirementsCompleted).toBe(1);
    });

    it('returns not_started status when all requirements have 0 completion', () => {
      const requirements: TestRequirement[] = [{ id: 'req-1', minCompetencyScore: 70 }];
      const profiles: Array<{
        competencyScores: Record<string, { score: number; evidenceCount: number }>;
      }> = [];
      const certs: Array<{ frameworkId: string }> = [];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.status).toBe('not_started');
    });

    it('returns in_progress status when partial completion', () => {
      const requirements: TestRequirement[] = [
        { id: 'req-1', minCompetencyScore: 70 },
        { id: 'req-2', minCompetencyScore: 90 },
      ];
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 80, evidenceCount: 5 },
          },
        },
      ];
      const certs: Array<{ frameworkId: string }> = [];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.status).toBe('in_progress');
    });

    it('returns compliant status when 100% completion', () => {
      const requirements: TestRequirement[] = [{ id: 'req-1', minCompetencyScore: 70 }];
      const profiles = [
        {
          competencyScores: {
            phishing_detection: { score: 90, evidenceCount: 5 },
          },
        },
      ];
      const certs = [{ frameworkId: 'nist_800_50' }];

      const result = calculateFrameworkCompletion(requirements, profiles, certs, 'nist_800_50');
      expect(result.status).toBe('compliant');
    });
  });

  describe('aggregateDashboardData', () => {
    it('returns empty summary when snapshots array is empty', () => {
      const snapshots: SnapshotForAggregation[] = [];
      const totalFrameworks = 8;

      const result = aggregateDashboardData(snapshots, totalFrameworks);

      expect(result.summaries).toHaveLength(0);
      expect(result.totalFrameworks).toBe(8);
      expect(result.compliantCount).toBe(0);
      expect(result.inProgressCount).toBe(0);
      expect(result.nonCompliantCount).toBe(0);
      expect(result.notStartedCount).toBe(0);
    });

    it('aggregates single snapshot correctly', () => {
      const now = new Date();
      const snapshots: SnapshotForAggregation[] = [
        {
          id: 'snap-1',
          tenantId: 'tenant-1',
          frameworkId: 'nist_800_50',
          status: 'compliant',
          completionPercentage: 100,
          lastAssessedAt: now,
          nextAssessmentDue: now,
          requirements: { total: 3, completed: 3 },
          metadata: {},
          snapshotDate: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = aggregateDashboardData(snapshots, 8);

      expect(result.summaries).toHaveLength(1);
      expect(result.totalFrameworks).toBe(8);
      expect(result.compliantCount).toBe(1);
      expect(result.inProgressCount).toBe(0);
      expect(result.nonCompliantCount).toBe(0);
      expect(result.notStartedCount).toBe(0);
    });

    it('counts all framework statuses correctly', () => {
      const now = new Date();
      const snapshots: SnapshotForAggregation[] = [
        {
          id: 'snap-1',
          tenantId: 'tenant-1',
          frameworkId: 'nist_800_50',
          status: 'compliant',
          completionPercentage: 100,
          lastAssessedAt: now,
          nextAssessmentDue: now,
          requirements: {},
          metadata: {},
          snapshotDate: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'snap-2',
          tenantId: 'tenant-1',
          frameworkId: 'iso_27001',
          status: 'in_progress',
          completionPercentage: 50,
          lastAssessedAt: now,
          nextAssessmentDue: now,
          requirements: {},
          metadata: {},
          snapshotDate: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'snap-3',
          tenantId: 'tenant-1',
          frameworkId: 'pci_dss',
          status: 'non_compliant',
          completionPercentage: 20,
          lastAssessedAt: now,
          nextAssessmentDue: now,
          requirements: {},
          metadata: {},
          snapshotDate: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'snap-4',
          tenantId: 'tenant-1',
          frameworkId: 'hipaa',
          status: 'not_started',
          completionPercentage: 0,
          lastAssessedAt: now,
          nextAssessmentDue: now,
          requirements: {},
          metadata: {},
          snapshotDate: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = aggregateDashboardData(snapshots, 8);

      expect(result.summaries).toHaveLength(4);
      expect(result.compliantCount).toBe(1);
      expect(result.inProgressCount).toBe(1);
      expect(result.nonCompliantCount).toBe(1);
      expect(result.notStartedCount).toBe(1);
    });

    it('maps snapshot to ComplianceSummary correctly', () => {
      const now = new Date();
      const nextDue = new Date(now);
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      const snapshots: SnapshotForAggregation[] = [
        {
          id: 'snap-1',
          tenantId: 'tenant-1',
          frameworkId: 'nist_800_50',
          status: 'compliant',
          completionPercentage: 100,
          lastAssessedAt: now,
          nextAssessmentDue: nextDue,
          requirements: { total: 3, completed: 3 },
          metadata: {},
          snapshotDate: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = aggregateDashboardData(snapshots, 8);

      expect(result.summaries[0]).toEqual({
        frameworkId: 'nist_800_50',
        status: 'compliant',
        completionPercentage: 100,
        lastAssessedAt: now,
        nextAssessmentDue: nextDue,
        requirementsCount: 3,
        requirementsCompleted: 3,
      });
    });
  });
});
