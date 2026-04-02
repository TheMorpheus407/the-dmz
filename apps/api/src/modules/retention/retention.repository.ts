import { and, eq, desc } from 'drizzle-orm';

import {
  retentionPolicies,
  retentionJobLog,
  type RetentionPolicy,
  type RetentionJobLog,
  type DataCategory,
} from '../../db/schema/retention/index.js';

import type { DatabaseClient } from '../../shared/database/connection.js';

interface CreatePolicyParams {
  tenantId: string;
  dataCategory: DataCategory;
  retentionDays: number;
  actionOnExpiry: string;
  createdBy: string | null;
}

interface UpdatePolicyParams {
  retentionDays?: number;
  actionOnExpiry?: string;
  legalHold?: number;
  updatedAt: Date;
}

interface FindPolicyParams {
  tenantId: string;
  dataCategory: DataCategory;
}

interface ListPoliciesParams {
  tenantId: string;
}

interface LogJobParams {
  tenantId: string;
  dataCategory: DataCategory;
  jobType: string;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  recordsAnonymized: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

interface GetJobHistoryParams {
  tenantId: string;
  dataCategory?: DataCategory;
  limit: number;
}

export class RetentionRepository {
  private readonly db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.db = db;
  }

  public async createPolicy(params: CreatePolicyParams): Promise<RetentionPolicy | undefined> {
    const [policy] = await this.db
      .insert(retentionPolicies)
      .values({
        tenantId: params.tenantId,
        dataCategory: params.dataCategory,
        retentionDays: params.retentionDays,
        actionOnExpiry: params.actionOnExpiry,
        createdBy: params.createdBy,
      })
      .returning();
    return policy;
  }

  public async findPolicy(params: FindPolicyParams): Promise<RetentionPolicy | undefined> {
    const [policy] = await this.db
      .select()
      .from(retentionPolicies)
      .where(
        and(
          eq(retentionPolicies.tenantId, params.tenantId),
          eq(retentionPolicies.dataCategory, params.dataCategory),
        ),
      )
      .limit(1);
    return policy;
  }

  public async listPolicies(params: ListPoliciesParams): Promise<RetentionPolicy[]> {
    return this.db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.tenantId, params.tenantId));
  }

  public async updatePolicy(
    params: FindPolicyParams,
    updates: UpdatePolicyParams,
  ): Promise<RetentionPolicy | undefined> {
    const [updated] = await this.db
      .update(retentionPolicies)
      .set(updates)
      .where(
        and(
          eq(retentionPolicies.tenantId, params.tenantId),
          eq(retentionPolicies.dataCategory, params.dataCategory),
        ),
      )
      .returning();
    return updated;
  }

  public async upsertPolicy(params: {
    tenantId: string;
    dataCategory: DataCategory;
    retentionDays: number;
    actionOnExpiry: string;
    legalHold: number;
  }): Promise<RetentionPolicy | undefined> {
    const [policy] = await this.db
      .insert(retentionPolicies)
      .values({
        tenantId: params.tenantId,
        dataCategory: params.dataCategory,
        retentionDays: params.retentionDays,
        actionOnExpiry: params.actionOnExpiry,
        legalHold: params.legalHold,
      })
      .onConflictDoUpdate({
        target: [retentionPolicies.tenantId, retentionPolicies.dataCategory],
        set: {
          legalHold: params.legalHold,
          updatedAt: new Date(),
        },
      })
      .returning();
    return policy;
  }

  public async deletePolicy(params: FindPolicyParams): Promise<boolean> {
    const result = await this.db
      .delete(retentionPolicies)
      .where(
        and(
          eq(retentionPolicies.tenantId, params.tenantId),
          eq(retentionPolicies.dataCategory, params.dataCategory),
        ),
      )
      .returning({ id: retentionPolicies.id });
    return result.length > 0;
  }

  public async getLegalHoldStatus(params: FindPolicyParams): Promise<number | undefined> {
    const [policy] = await this.db
      .select({ legalHold: retentionPolicies.legalHold })
      .from(retentionPolicies)
      .where(
        and(
          eq(retentionPolicies.tenantId, params.tenantId),
          eq(retentionPolicies.dataCategory, params.dataCategory),
        ),
      )
      .limit(1);
    return policy?.legalHold;
  }

  public async logJob(params: LogJobParams): Promise<RetentionJobLog | undefined> {
    const [job] = await this.db
      .insert(retentionJobLog)
      .values({
        tenantId: params.tenantId,
        dataCategory: params.dataCategory,
        jobType: params.jobType,
        recordsProcessed: params.recordsProcessed,
        recordsArchived: params.recordsArchived,
        recordsDeleted: params.recordsDeleted,
        recordsAnonymized: params.recordsAnonymized,
        errors: params.errors,
        startedAt: params.startedAt,
        completedAt: params.completedAt,
        durationMs: params.durationMs,
      })
      .returning();
    return job;
  }

  public async getJobHistory(params: GetJobHistoryParams): Promise<RetentionJobLog[]> {
    const conditions = [eq(retentionJobLog.tenantId, params.tenantId)];
    if (params.dataCategory) {
      conditions.push(eq(retentionJobLog.dataCategory, params.dataCategory));
    }

    return this.db
      .select()
      .from(retentionJobLog)
      .where(and(...conditions))
      .orderBy(desc(retentionJobLog.startedAt))
      .limit(params.limit);
  }
}
