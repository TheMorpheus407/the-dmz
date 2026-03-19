import { and, eq, isNull, lt, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  archivedData,
  type ArchivedData,
  type DataCategory,
} from '../../db/schema/retention/index.js';

import type { ArchiveResult, ArchivedDataRetrieval } from './retention.types.js';

export interface ArchiveDataInput {
  tenantId: string;
  dataCategory: DataCategory;
  originalId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  expiresAt?: Date | null;
}

export interface ArchiveRetrievalResult {
  success: boolean;
  data?: ArchivedDataRetrieval;
  error?: string;
}

export interface ExpiredArchiveResult {
  archiveId: string;
  originalId: string;
  dataCategory: DataCategory;
  expiredAt: Date;
}

export class ArchiveService {
  private compressionLevel: number;

  constructor(compressionLevel: number = 6) {
    this.compressionLevel = compressionLevel;
  }

  public async archive(
    input: ArchiveDataInput,
    config: AppConfig = loadConfig(),
  ): Promise<ArchiveResult> {
    try {
      const db = getDatabaseClient(config);

      const compressedData = await this.compress(input.data);
      const metadata = input.metadata || {};

      const [record] = await db
        .insert(archivedData)
        .values({
          tenantId: input.tenantId,
          dataCategory: input.dataCategory,
          originalId: input.originalId,
          archiveData: compressedData,
          metadata: {
            ...metadata,
            compressionLevel: this.compressionLevel,
            originalSize: JSON.stringify(input.data).length,
          } as Record<string, unknown>,
          compressed: 1,
          expiresAt: input.expiresAt ?? null,
        })
        .returning({ id: archivedData.id });

      if (!record) {
        return {
          success: false,
          originalId: input.originalId,
          dataCategory: input.dataCategory,
          error: 'Failed to create archive record',
        };
      }

      return {
        success: true,
        archiveId: record.id,
        originalId: input.originalId,
        dataCategory: input.dataCategory,
        compressedSize: JSON.stringify(compressedData).length,
      };
    } catch (error) {
      return {
        success: false,
        originalId: input.originalId,
        dataCategory: input.dataCategory,
        error: error instanceof Error ? error.message : 'Unknown error archiving data',
      };
    }
  }

  public async retrieve(
    tenantId: string,
    archiveId: string,
    config: AppConfig = loadConfig(),
  ): Promise<ArchiveRetrievalResult> {
    try {
      const db = getDatabaseClient(config);

      const [record] = await db
        .select()
        .from(archivedData)
        .where(and(eq(archivedData.tenantId, tenantId), eq(archivedData.id, archiveId)))
        .limit(1);

      if (!record) {
        return {
          success: false,
          error: 'Archive not found',
        };
      }

      await db
        .update(archivedData)
        .set({
          retrievedAt: new Date(),
          retrievalCount: record.retrievalCount + 1,
        })
        .where(eq(archivedData.id, archiveId));

      const decompressed = this.decompress(record.archiveData as Record<string, unknown>);

      return {
        success: true,
        data: {
          id: record.id,
          tenantId: record.tenantId,
          dataCategory: record.dataCategory as DataCategory,
          originalId: record.originalId,
          archiveData: decompressed,
          metadata: record.metadata as Record<string, unknown>,
          archivedAt: record.archivedAt,
          expiresAt: record.expiresAt,
          retrievalCount: record.retrievalCount + 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error retrieving archive',
      };
    }
  }

  public async retrieveByOriginalId(
    tenantId: string,
    originalId: string,
    config: AppConfig = loadConfig(),
  ): Promise<ArchiveRetrievalResult> {
    try {
      const db = getDatabaseClient(config);

      const [record] = await db
        .select()
        .from(archivedData)
        .where(and(eq(archivedData.tenantId, tenantId), eq(archivedData.originalId, originalId)))
        .orderBy(sql`${archivedData.archivedAt} DESC`)
        .limit(1);

      if (!record) {
        return {
          success: false,
          error: 'Archive not found',
        };
      }

      return this.retrieve(tenantId, record.id, config);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error retrieving archive',
      };
    }
  }

  public async listArchives(
    tenantId: string,
    dataCategory?: DataCategory,
    limit: number = 100,
    offset: number = 0,
    config: AppConfig = loadConfig(),
  ): Promise<{ archives: ArchivedData[]; total: number }> {
    const db = getDatabaseClient(config);

    const conditions = [eq(archivedData.tenantId, tenantId)];
    if (dataCategory) {
      conditions.push(eq(archivedData.dataCategory, dataCategory));
    }

    const archives = await db
      .select()
      .from(archivedData)
      .where(and(...conditions))
      .orderBy(sql`${archivedData.archivedAt} DESC`)
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(archivedData)
      .where(and(...conditions));

    return {
      archives,
      total: countResult[0]?.count ?? 0,
    };
  }

  public async deleteArchive(
    tenantId: string,
    archiveId: string,
    config: AppConfig = loadConfig(),
  ): Promise<boolean> {
    const db = getDatabaseClient(config);

    const result = await db
      .delete(archivedData)
      .where(and(eq(archivedData.tenantId, tenantId), eq(archivedData.id, archiveId)))
      .returning({ id: archivedData.id });

    return result.length > 0;
  }

  public async deleteExpiredArchives(
    config: AppConfig = loadConfig(),
  ): Promise<{ deleted: number; errors: string[] }> {
    const db = getDatabaseClient(config);
    const errors: string[] = [];
    let deleted = 0;

    const now = new Date();

    const expiredRecords = await db
      .select()
      .from(archivedData)
      .where(isNull(archivedData.expiresAt))
      .limit(1000);

    for (const record of expiredRecords) {
      if (record.expiresAt && record.expiresAt < now) {
        try {
          const result = await db
            .delete(archivedData)
            .where(eq(archivedData.id, record.id))
            .returning({ id: archivedData.id });

          if (result.length > 0) {
            deleted++;
          }
        } catch (error) {
          errors.push(
            `Failed to delete archive ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    return { deleted, errors };
  }

  public async findExpiredArchives(
    tenantId: string,
    dataCategory: DataCategory,
    batchSize: number = 1000,
    config: AppConfig = loadConfig(),
  ): Promise<ExpiredArchiveResult[]> {
    const db = getDatabaseClient(config);
    const now = new Date();

    const expiredRecords = await db
      .select({
        id: archivedData.id,
        originalId: archivedData.originalId,
        dataCategory: archivedData.dataCategory,
        expiresAt: archivedData.expiresAt,
      })
      .from(archivedData)
      .where(
        and(
          eq(archivedData.tenantId, tenantId),
          eq(archivedData.dataCategory, dataCategory),
          lt(archivedData.expiresAt, now),
        ),
      )
      .limit(batchSize);

    return expiredRecords.map((record) => ({
      archiveId: record.id,
      originalId: record.originalId,
      dataCategory: record.dataCategory as DataCategory,
      expiredAt: record.expiresAt as Date,
    }));
  }

  public async getArchiveStats(
    tenantId: string,
    config: AppConfig = loadConfig(),
  ): Promise<{
    totalArchives: number;
    byCategory: Record<DataCategory, number>;
    totalRetrievals: number;
    oldestArchive: Date | null;
    newestArchive: Date | null;
  }> {
    const db = getDatabaseClient(config);

    const stats = await db
      .select({
        dataCategory: archivedData.dataCategory,
        count: sql<number>`count(*)`,
        totalRetrievals: sql<number>`sum(${archivedData.retrievalCount})`,
        oldest: sql<Date>`min(${archivedData.archivedAt})`,
        newest: sql<Date>`max(${archivedData.archivedAt})`,
      })
      .from(archivedData)
      .where(eq(archivedData.tenantId, tenantId))
      .groupBy(archivedData.dataCategory);

    const totalResult = await db
      .select({
        count: sql<number>`count(*)`,
        totalRetrievals: sql<number>`sum(${archivedData.retrievalCount})`,
      })
      .from(archivedData)
      .where(eq(archivedData.tenantId, tenantId));

    const byCategory: Record<DataCategory, number> = {
      events: 0,
      sessions: 0,
      analytics: 0,
      audit_logs: 0,
      user_data: 0,
    };

    let oldestArchive: Date | null = null;
    let newestArchive: Date | null = null;

    for (const stat of stats) {
      const category = stat.dataCategory as DataCategory;
      byCategory[category] = Number(stat.count);
      if (stat.oldest && (!oldestArchive || stat.oldest < oldestArchive)) {
        oldestArchive = stat.oldest;
      }
      if (stat.newest && (!newestArchive || stat.newest > newestArchive)) {
        newestArchive = stat.newest;
      }
    }

    return {
      totalArchives: Number(totalResult[0]?.count ?? 0),
      byCategory,
      totalRetrievals: Number(totalResult[0]?.totalRetrievals ?? 0),
      oldestArchive,
      newestArchive,
    };
  }

  private async compress(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      _compressed: false,
      _data: data,
    };
  }

  private decompress(data: Record<string, unknown>): Record<string, unknown> {
    const compressed = data['_compressed'] as boolean | undefined;
    const dataField = data['_data'] as Record<string, unknown> | string | undefined;

    if (!compressed) {
      return dataField as Record<string, unknown>;
    }

    try {
      if (typeof dataField === 'string') {
        const buffer = Buffer.from(dataField, 'base64');
        const jsonString = buffer.toString('utf-8');
        const parsed: unknown = JSON.parse(jsonString);
        return typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};
      }
      return dataField as Record<string, unknown>;
    } catch {
      return dataField as Record<string, unknown>;
    }
  }
}

export const archiveService = new ArchiveService();
