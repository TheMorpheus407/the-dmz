import { eq, and, desc } from 'drizzle-orm';

import type { RegulatoryFramework } from '@the-dmz/shared';

import { type AppConfig } from '../../config.js';
import { getDatabaseClient, type DatabaseClient } from '../../shared/database/connection.js';
import { complianceSnapshots, frameworkRequirements } from '../../db/schema/compliance/index.js';
import { playerProfiles } from '../../db/schema/analytics/index.js';
import { certificates } from '../../shared/database/schema/training/index.js';

import type { ComplianceStatus, FrameworkRequirementData } from './compliance.service.js';

export interface ComplianceSnapshotRow {
  id: string;
  tenantId: string;
  frameworkId: string;
  status: string;
  completionPercentage: number;
  lastAssessedAt: Date | null;
  nextAssessmentDue: Date | null;
  requirements: unknown;
  metadata: unknown;
  snapshotDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrameworkRequirementRow {
  id: string;
  tenantId: string;
  frameworkId: string;
  requirementId: string;
  requirementName: string;
  description: string | null;
  category: string | null;
  isRequired: number;
  minCompetencyScore: number;
  requiredTrainingModules: unknown;
  status: string;
  completionPercentage: number;
  lastAssessedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefaultRequirement {
  requirementId: string;
  requirementName: string;
  description: string;
  category: string;
  minCompetencyScore: number;
}

export interface UpsertSnapshotInput {
  tenantId: string;
  frameworkId: string;
  status: string;
  completionPercentage: number;
  lastAssessedAt: Date;
  nextAssessmentDue: Date;
  requirements: Record<string, unknown>;
  metadata: Record<string, unknown>;
  snapshotDate: Date;
}

export class ComplianceRepository {
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  static create(config: AppConfig): ComplianceRepository {
    if (!config) {
      throw new TypeError('config is required');
    }
    return new ComplianceRepository(getDatabaseClient(config));
  }

  async findSnapshots(tenantId: string): Promise<ComplianceSnapshotRow[]> {
    return await this.db
      .select()
      .from(complianceSnapshots)
      .where(eq(complianceSnapshots.tenantId, tenantId))
      .orderBy(desc(complianceSnapshots.frameworkId))
      .execute();
  }

  async findSnapshotByFramework(
    tenantId: string,
    frameworkId: string,
  ): Promise<ComplianceSnapshotRow | undefined> {
    const [snapshot] = await this.db
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
    return snapshot;
  }

  async findRequirements(
    tenantId: string,
    frameworkId: string,
  ): Promise<FrameworkRequirementRow[]> {
    return await this.db
      .select()
      .from(frameworkRequirements)
      .where(
        and(
          eq(frameworkRequirements.tenantId, tenantId),
          eq(frameworkRequirements.frameworkId, frameworkId),
        ),
      )
      .execute();
  }

  async findProfiles(
    tenantId: string,
  ): Promise<
    Array<{ competencyScores: Record<string, { score: number; evidenceCount: number }> }>
  > {
    const rows = await this.db
      .select({ competencyScores: playerProfiles.competencyScores })
      .from(playerProfiles)
      .where(eq(playerProfiles.tenantId, tenantId))
      .execute();
    return rows as Array<{
      competencyScores: Record<string, { score: number; evidenceCount: number }>;
    }>;
  }

  async findCertificates(tenantId: string): Promise<Array<{ frameworkId: string }>> {
    const rows = await this.db
      .select({ frameworkId: certificates.frameworkId })
      .from(certificates)
      .where(eq(certificates.tenantId, tenantId))
      .execute();
    return rows;
  }

  async upsertSnapshot(input: UpsertSnapshotInput): Promise<ComplianceSnapshotRow> {
    const [snapshot] = await this.db
      .insert(complianceSnapshots)
      .values({
        tenantId: input.tenantId,
        frameworkId: input.frameworkId,
        status: input.status,
        completionPercentage: input.completionPercentage,
        lastAssessedAt: input.lastAssessedAt,
        nextAssessmentDue: input.nextAssessmentDue,
        requirements: input.requirements,
        metadata: input.metadata,
        snapshotDate: input.snapshotDate,
      })
      .onConflictDoUpdate({
        target: [complianceSnapshots.tenantId, complianceSnapshots.frameworkId],
        set: {
          status: input.status,
          completionPercentage: input.completionPercentage,
          lastAssessedAt: input.lastAssessedAt,
          nextAssessmentDue: input.nextAssessmentDue,
          requirements: input.requirements,
          snapshotDate: input.snapshotDate,
          updatedAt: new Date(),
        },
      })
      .returning()
      .execute();

    if (!snapshot) {
      throw new Error('Failed to create or update compliance snapshot');
    }

    return snapshot;
  }

  async updateRequirements(
    reqId: string,
    status: string,
    completionPercentage: number,
    lastAssessedAt: Date,
  ): Promise<void> {
    await this.db
      .update(frameworkRequirements)
      .set({
        status,
        completionPercentage,
        lastAssessedAt,
        updatedAt: new Date(),
      })
      .where(eq(frameworkRequirements.id, reqId))
      .execute();
  }

  async insertRequirements(
    tenantId: string,
    frameworkId: string,
    defaultRequirements: DefaultRequirement[],
  ): Promise<void> {
    if (defaultRequirements.length === 0) return;

    await this.db
      .insert(frameworkRequirements)
      .values(
        defaultRequirements.map((req) => ({
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
        })),
      )
      .onConflictDoNothing({
        target: [
          frameworkRequirements.tenantId,
          frameworkRequirements.frameworkId,
          frameworkRequirements.requirementId,
        ],
      })
      .execute();
  }

  async countRequirements(tenantId: string, frameworkId: string): Promise<number> {
    const result = await this.db
      .select({ id: frameworkRequirements.id })
      .from(frameworkRequirements)
      .where(
        and(
          eq(frameworkRequirements.tenantId, tenantId),
          eq(frameworkRequirements.frameworkId, frameworkId),
        ),
      )
      .execute();
    return result.length;
  }

  async countCompliantRequirements(tenantId: string, frameworkId: string): Promise<number> {
    const result = await this.db
      .select({ id: frameworkRequirements.id })
      .from(frameworkRequirements)
      .where(
        and(
          eq(frameworkRequirements.tenantId, tenantId),
          eq(frameworkRequirements.frameworkId, frameworkId),
          eq(frameworkRequirements.status, 'compliant'),
        ),
      )
      .execute();
    return result.length;
  }

  static mapRequirementRowToDto(row: FrameworkRequirementRow): FrameworkRequirementData {
    return {
      id: row.id,
      tenantId: row.tenantId,
      frameworkId: row.frameworkId as RegulatoryFramework,
      requirementId: row.requirementId,
      requirementName: row.requirementName,
      description: row.description,
      category: row.category,
      isRequired: row.isRequired === 1,
      minCompetencyScore: row.minCompetencyScore,
      requiredTrainingModules: row.requiredTrainingModules as string[],
      status: row.status as ComplianceStatus,
      completionPercentage: row.completionPercentage,
      lastAssessedAt: row.lastAssessedAt ? new Date(row.lastAssessedAt) : null,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
