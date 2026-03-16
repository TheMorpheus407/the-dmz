import { createHash } from 'crypto';

import { and, eq, gte, lte, lt, desc, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { auditLogs, auditRetentionConfig, type AuditLog } from '../../db/schema/audit/index.js';

const SEED_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface CreateAuditLogInput {
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | undefined;
  ipAddress?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface AuditLogQueryParams {
  tenantId: string;
  startDate?: string | undefined;
  endDate?: string | undefined;
  action?: string | undefined;
  userId?: string | undefined;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface AuditChainVerificationResult {
  isValid: boolean;
  checkedEntries: number;
  firstInvalidEntry?: string;
  errorMessage?: string;
}

function computeHash(
  previousHash: string,
  tenantId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  timestamp: Date,
  metadata: Record<string, unknown> | null,
): string {
  const hashInput =
    previousHash +
    tenantId +
    userId +
    action +
    resourceType +
    (resourceId ?? '') +
    timestamp.toISOString() +
    (metadata ? JSON.stringify(metadata) : '');

  return createHash('sha256').update(hashInput).digest('hex');
}

function getPartitionMonth(timestamp: Date = new Date()): string {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function createAuditLog(
  input: CreateAuditLogInput,
  config: AppConfig = loadConfig(),
): Promise<AuditLog> {
  const db = getDatabaseClient(config);

  const timestamp = new Date();
  const partitionMonth = getPartitionMonth(timestamp);

  const lastEntry = await db
    .select({ hash: auditLogs.hash })
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, input.tenantId))
    .orderBy(desc(auditLogs.timestamp), desc(auditLogs.id))
    .limit(1);

  const previousHash = lastEntry.length > 0 ? lastEntry[0]!.hash : SEED_HASH;

  const hash = computeHash(
    previousHash,
    input.tenantId,
    input.userId,
    input.action,
    input.resourceType,
    input.resourceId ?? null,
    timestamp,
    input.metadata ?? null,
  );

  const [logEntry] = await db
    .insert(auditLogs)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      ipAddress: input.ipAddress ?? null,
      timestamp,
      metadata: input.metadata ?? null,
      previousHash,
      hash,
      partitionMonth,
    })
    .returning();

  if (!logEntry) {
    throw new Error('Failed to create audit log entry');
  }

  return logEntry;
}

export async function queryAuditLogs(
  params: AuditLogQueryParams,
  config: AppConfig = loadConfig(),
): Promise<{ logs: AuditLog[]; total: number }> {
  const db = getDatabaseClient(config);

  const conditions = [eq(auditLogs.tenantId, params.tenantId)];

  if (params.startDate) {
    conditions.push(gte(auditLogs.timestamp, new Date(params.startDate)));
  }

  if (params.endDate) {
    conditions.push(lte(auditLogs.timestamp, new Date(params.endDate)));
  }

  if (params.action) {
    conditions.push(eq(auditLogs.action, params.action));
  }

  if (params.userId) {
    conditions.push(eq(auditLogs.userId, params.userId));
  }

  if (params.resourceType) {
    conditions.push(eq(auditLogs.resourceType, params.resourceType));
  }

  if (params.resourceId) {
    conditions.push(eq(auditLogs.resourceId, params.resourceId));
  }

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.timestamp), desc(auditLogs.id))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  return { logs, total };
}

export async function verifyAuditChain(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  config: AppConfig = loadConfig(),
): Promise<AuditChainVerificationResult> {
  const db = getDatabaseClient(config);

  const startTime = startDate ? new Date(startDate) : new Date(0);
  const endTime = endDate ? new Date(endDate) : new Date();

  const entries = await db
    .select({
      id: auditLogs.id,
      previousHash: auditLogs.previousHash,
      hash: auditLogs.hash,
      timestamp: auditLogs.timestamp,
      userId: auditLogs.userId,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      metadata: auditLogs.metadata,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tenantId, tenantId),
        gte(auditLogs.timestamp, startTime),
        lte(auditLogs.timestamp, endTime),
      ),
    )
    .orderBy(auditLogs.timestamp, auditLogs.id);

  if (entries.length === 0) {
    return { isValid: true, checkedEntries: 0 };
  }

  let previousHash = SEED_HASH;
  let isFirstEntry = true;

  for (const entry of entries) {
    if (isFirstEntry) {
      if (entry.previousHash !== SEED_HASH) {
        const prevEntry = await db
          .select({ hash: auditLogs.hash })
          .from(auditLogs)
          .where(and(eq(auditLogs.tenantId, tenantId), lt(auditLogs.timestamp, startTime)))
          .orderBy(desc(auditLogs.timestamp))
          .limit(1);

        if (prevEntry.length > 0) {
          previousHash = prevEntry[0]!.hash;
        }
      }
      isFirstEntry = false;
    }

    if (entry.previousHash !== previousHash) {
      return {
        isValid: false,
        checkedEntries: entries.length,
        firstInvalidEntry: entry.id,
        errorMessage: `Previous hash mismatch at entry ${entry.id}`,
      };
    }

    const computedHash = computeHash(
      entry.previousHash,
      tenantId,
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.timestamp,
      entry.metadata as Record<string, unknown> | null,
    );

    if (entry.hash !== computedHash) {
      return {
        isValid: false,
        checkedEntries: entries.length,
        firstInvalidEntry: entry.id,
        errorMessage: `Hash mismatch at entry ${entry.id} - possible tampering detected`,
      };
    }

    previousHash = entry.hash;
  }

  return { isValid: true, checkedEntries: entries.length };
}

export async function getRetentionConfig(
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<{ retentionYears: number; framework: string | null } | null> {
  const db = getDatabaseClient(config);

  const [configEntry] = await db
    .select({
      retentionYears: auditRetentionConfig.retentionYears,
      framework: auditRetentionConfig.framework,
    })
    .from(auditRetentionConfig)
    .where(eq(auditRetentionConfig.tenantId, tenantId))
    .limit(1);

  if (!configEntry) {
    return null;
  }

  return {
    retentionYears: configEntry.retentionYears,
    framework: configEntry.framework,
  };
}

export async function updateRetentionConfig(
  tenantId: string,
  retentionYears: number,
  framework?: string,
  config: AppConfig = loadConfig(),
): Promise<void> {
  const db = getDatabaseClient(config);

  const clampedYears = Math.min(7, Math.max(1, retentionYears));

  await db
    .insert(auditRetentionConfig)
    .values({
      tenantId,
      retentionYears: clampedYears,
      framework: framework ?? null,
    })
    .onConflictDoUpdate({
      target: auditRetentionConfig.tenantId,
      set: {
        retentionYears: clampedYears,
        framework: framework ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function getAuditActions(
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<string[]> {
  const db = getDatabaseClient(config);

  const actions = await db
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(auditLogs.action);

  return actions.map((a) => a.action);
}

export async function getResourceTypes(
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<string[]> {
  const db = getDatabaseClient(config);

  const resourceTypes = await db
    .selectDistinct({ resourceType: auditLogs.resourceType })
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(auditLogs.resourceType);

  return resourceTypes.map((r) => r.resourceType);
}
