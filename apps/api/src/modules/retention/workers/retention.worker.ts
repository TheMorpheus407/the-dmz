import { Worker, Queue, type WorkerOptions, type Job } from 'bullmq';
import { lt, and, eq, isNull } from 'drizzle-orm';

import { recordQueueDepth } from '../../../shared/metrics/hooks.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { gameEvents } from '../../../db/schema/game/events.schema.js';
import { analyticsEvents } from '../../../db/schema/analytics/index.js';
import { auditLogs } from '../../../db/schema/audit/index.js';
import { users } from '../../../shared/database/schema/users.js';
import { archivedData, type DataCategory } from '../../../db/schema/retention/index.js';
import { chatChannel, chatMessage } from '../../../db/schema/social/index.js';
import { getExpiredSessions, deleteSessionsByIds } from '../../auth/index.js'; // eslint-disable-line import-x/no-restricted-paths
import {
  calculateExpiryDate,
  getEffectiveRetentionPolicy,
  isLegalHoldActive,
} from '../retention.service.js';
import { anonymizationService } from '../anonymization.service.js';
import { archiveService } from '../archive.service.js';

import {
  RETENTION_QUEUE_NAMES,
  RETENTION_JOB_TYPES,
  DEFAULT_JOB_OPTIONS,
  DEFAULT_CONCURRENCY,
  DEFAULT_BATCH_SIZE,
  type RetentionJobData,
  type ProcessTenantJobData,
  type ProcessCategoryJobData,
  type CleanupExpiredArchivesJobData,
  type AnonymizeUserJobData,
} from './queues.js';

export interface WorkerDependencies {
  archiveService: typeof archiveService;
  anonymizationService: typeof anonymizationService;
}

export interface WorkerConfig {
  redisUrl: string;
  concurrency?: number;
  maxAttempts?: number;
}

export interface WorkerHealth {
  isRunning: boolean;
  isPaused: boolean;
  currentJobCount: number;
  completedCount: number;
  failedCount: number;
}

export class RetentionWorker {
  private worker: Worker<RetentionJobData>;
  private queue: Queue<RetentionJobData>;
  public dependencies: WorkerDependencies;
  private health: WorkerHealth;

  constructor(config: WorkerConfig, dependencies: WorkerDependencies) {
    this.dependencies = dependencies;
    this.health = {
      isRunning: false,
      isPaused: false,
      currentJobCount: 0,
      completedCount: 0,
      failedCount: 0,
    };

    const connection = this.getConnectionFromUrl(config.redisUrl);

    this.queue = new Queue<RetentionJobData>(RETENTION_QUEUE_NAMES.RETENTION_PROCESSING, {
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
      connection,
    });

    const workerOptions: WorkerOptions = {
      connection,
      concurrency: config.concurrency ?? DEFAULT_CONCURRENCY,
    };

    this.worker = new Worker<RetentionJobData>(
      RETENTION_QUEUE_NAMES.RETENTION_PROCESSING,
      async (job) => this.processJob(job),
      workerOptions,
    );

    this.worker.on('completed', () => {
      this.health.completedCount++;
      this.health.currentJobCount = Math.max(0, this.health.currentJobCount - 1);
      this.updateQueueDepth().catch(() => {});
    });

    this.worker.on('failed', () => {
      this.health.failedCount++;
      this.health.currentJobCount = Math.max(0, this.health.currentJobCount - 1);
      this.updateQueueDepth().catch(() => {});
    });

    this.worker.on('active', () => {
      this.health.currentJobCount++;
    });
  }

  private getConnectionFromUrl(redisUrl: string) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
    };
  }

  private async updateQueueDepth(): Promise<void> {
    try {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed');
      const waiting = counts['waiting'] ?? 0;
      const active = counts['active'] ?? 0;
      const delayed = counts['delayed'] ?? 0;
      const totalDepth = waiting + active + delayed;
      recordQueueDepth(RETENTION_QUEUE_NAMES.RETENTION_PROCESSING, totalDepth);
    } catch {
      // Queue might be closed
    }
  }

  private async processJob(job: Job<RetentionJobData>): Promise<unknown> {
    const { type } = job.data;

    switch (type) {
      case RETENTION_JOB_TYPES.PROCESS_TENANT: {
        return this.processTenant(job as Job<ProcessTenantJobData>);
      }
      case RETENTION_JOB_TYPES.PROCESS_CATEGORY: {
        return this.processCategory(job as Job<ProcessCategoryJobData>);
      }
      case RETENTION_JOB_TYPES.CLEANUP_EXPIRED_ARCHIVES: {
        return this.cleanupExpiredArchives(job as Job<CleanupExpiredArchivesJobData>);
      }
      case RETENTION_JOB_TYPES.ANONYMIZE_USER: {
        return this.anonymizeUser(job as Job<AnonymizeUserJobData>);
      }
      default:
        throw new Error(`Unknown job type: ${type as string}`);
    }
  }

  private async processTenant(job: Job<ProcessTenantJobData>): Promise<unknown> {
    const { tenantId, categories } = job.data;
    const results: Array<{
      category: string;
      processed: number;
      archived: number;
      deleted: number;
      anonymized: number;
    }> = [];

    const targetCategories = categories || [
      'events',
      'sessions',
      'analytics',
      'audit_logs',
      'user_data',
      'chat_messages',
    ];

    for (const category of targetCategories) {
      const result = await this.processCategoryForTenant(tenantId, category as DataCategory);
      results.push({
        category,
        ...result,
      });
    }

    return { tenantId, results };
  }

  private async processCategory(job: Job<ProcessCategoryJobData>): Promise<unknown> {
    const { tenantId, dataCategory, cursor, batchSize } = job.data;
    return this.processCategoryForTenant(tenantId, dataCategory as DataCategory, cursor, batchSize);
  }

  private async processCategoryForTenant(
    tenantId: string,
    dataCategory: DataCategory,
    _cursor?: string,
    batchSize: number = DEFAULT_BATCH_SIZE,
  ): Promise<{ processed: number; archived: number; deleted: number; anonymized: number }> {
    let processed = 0;
    let archived = 0;
    let deleted = 0;
    let anonymized = 0;

    const legalHold = await isLegalHoldActive(tenantId, dataCategory);
    if (legalHold) {
      return { processed: 0, archived: 0, deleted: 0, anonymized: 0 };
    }

    const policy = await getEffectiveRetentionPolicy(tenantId, dataCategory);
    if (policy.effectiveRetentionDays === -1) {
      return { processed: 0, archived: 0, deleted: 0, anonymized: 0 };
    }

    const expiryDate = calculateExpiryDate(policy.effectiveRetentionDays);
    if (!expiryDate) {
      return { processed: 0, archived: 0, deleted: 0, anonymized: 0 };
    }

    switch (dataCategory) {
      case 'events':
        ({ processed, archived, deleted } = await this.processGameEvents(
          tenantId,
          expiryDate,
          policy.effectiveAction,
          batchSize,
        ));
        break;
      case 'sessions':
        ({ processed, archived, deleted } = await this.processSessions(
          tenantId,
          expiryDate,
          policy.effectiveAction,
          batchSize,
        ));
        break;
      case 'analytics':
        ({ processed, archived, deleted } = await this.processAnalyticsEvents(
          tenantId,
          expiryDate,
          policy.effectiveAction,
          batchSize,
        ));
        break;
      case 'audit_logs':
        ({ processed, archived, deleted } = await this.processAuditLogs(
          tenantId,
          expiryDate,
          policy.effectiveAction,
          batchSize,
        ));
        break;
      case 'user_data':
        ({ processed, anonymized } = await this.processUserData(tenantId, expiryDate, batchSize));
        break;
      case 'chat_messages':
        ({ processed, archived, deleted } = await this.processChatMessages(
          tenantId,
          expiryDate,
          policy.effectiveAction,
          batchSize,
        ));
        break;
    }

    return { processed, archived, deleted, anonymized };
  }

  private async processGameEvents(
    tenantId: string,
    expiryDate: Date,
    action: string,
    batchSize: number,
  ): Promise<{ processed: number; archived: number; deleted: number }> {
    const db = getDatabaseClient();
    let processed = 0;
    let archived = 0;
    let deleted = 0;

    while (true) {
      const expiredEvents = await db
        .select({ eventId: gameEvents.eventId })
        .from(gameEvents)
        .where(and(eq(gameEvents.tenantId, tenantId), lt(gameEvents.serverTime, expiryDate)))
        .limit(batchSize);

      if (expiredEvents.length === 0) {
        break;
      }

      for (const event of expiredEvents) {
        if (action === 'archive') {
          const eventData = await db
            .select()
            .from(gameEvents)
            .where(eq(gameEvents.eventId, event.eventId))
            .limit(1);

          if (eventData.length > 0) {
            await archiveService.archive({
              tenantId,
              dataCategory: 'events',
              originalId: event.eventId,
              data: eventData[0] as unknown as Record<string, unknown>,
            });
            archived++;
          }
        }

        await db.delete(gameEvents).where(eq(gameEvents.eventId, event.eventId));
        deleted++;
        processed++;
      }
    }

    return { processed, archived, deleted };
  }

  private async processSessions(
    tenantId: string,
    expiryDate: Date,
    action: string,
    batchSize: number,
  ): Promise<{ processed: number; archived: number; deleted: number }> {
    const db = getDatabaseClient();
    let processed = 0;
    let archived = 0;
    let deleted = 0;

    while (true) {
      const expiredSessions = await getExpiredSessions(db, {
        tenantId,
        expiryDate,
        limit: batchSize,
      });

      if (expiredSessions.length === 0) {
        break;
      }

      for (const session of expiredSessions) {
        if (action === 'archive') {
          await archiveService.archive({
            tenantId,
            dataCategory: 'sessions',
            originalId: session.id,
            data: session as unknown as Record<string, unknown>,
          });
          archived++;
        }
        processed++;
      }

      const deletedCount = await deleteSessionsByIds(
        db,
        tenantId,
        expiredSessions.map((s) => s.id),
      );
      deleted += deletedCount;
    }

    return { processed, archived, deleted };
  }

  private async processAnalyticsEvents(
    tenantId: string,
    expiryDate: Date,
    action: string,
    batchSize: number,
  ): Promise<{ processed: number; archived: number; deleted: number }> {
    const db = getDatabaseClient();
    let processed = 0;
    let archived = 0;
    let deleted = 0;

    while (true) {
      const expiredEvents = await db
        .select({ eventId: analyticsEvents.eventId })
        .from(analyticsEvents)
        .where(
          and(eq(analyticsEvents.tenantId, tenantId), lt(analyticsEvents.eventTime, expiryDate)),
        )
        .limit(batchSize);

      if (expiredEvents.length === 0) {
        break;
      }

      for (const event of expiredEvents) {
        if (action === 'archive') {
          const eventData = await db
            .select()
            .from(analyticsEvents)
            .where(eq(analyticsEvents.eventId, event.eventId))
            .limit(1);

          if (eventData.length > 0) {
            await archiveService.archive({
              tenantId,
              dataCategory: 'analytics',
              originalId: event.eventId,
              data: eventData[0] as unknown as Record<string, unknown>,
            });
            archived++;
          }
        }

        await db.delete(analyticsEvents).where(eq(analyticsEvents.eventId, event.eventId));
        deleted++;
        processed++;
      }
    }

    return { processed, archived, deleted };
  }

  private async processAuditLogs(
    tenantId: string,
    expiryDate: Date,
    action: string,
    batchSize: number,
  ): Promise<{ processed: number; archived: number; deleted: number }> {
    const db = getDatabaseClient();
    let processed = 0;
    let archived = 0;
    let deleted = 0;

    while (true) {
      const expiredLogs = await db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(and(eq(auditLogs.tenantId, tenantId), lt(auditLogs.timestamp, expiryDate)))
        .limit(batchSize);

      if (expiredLogs.length === 0) {
        break;
      }

      for (const log of expiredLogs) {
        if (action === 'archive') {
          const logData = await db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.id, log.id))
            .limit(1);

          if (logData.length > 0) {
            await archiveService.archive({
              tenantId,
              dataCategory: 'audit_logs',
              originalId: log.id,
              data: logData[0] as unknown as Record<string, unknown>,
            });
            archived++;
          }
        }

        await db.delete(auditLogs).where(eq(auditLogs.id, log.id));
        deleted++;
        processed++;
      }
    }

    return { processed, archived, deleted };
  }

  private async processUserData(
    tenantId: string,
    expiryDate: Date,
    batchSize: number,
  ): Promise<{ processed: number; anonymized: number }> {
    const db = getDatabaseClient();
    let processed = 0;
    let anonymized = 0;

    const usersToAnonymize = await db
      .select({ userId: users.userId })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), lt(users.createdAt, expiryDate)))
      .limit(batchSize);

    for (const user of usersToAnonymize) {
      const anonymizedData = anonymizationService.anonymize({
        email: user.userId,
        name: 'User',
      } as Record<string, unknown>);

      const anonymizedEmail = anonymizedData.anonymized['email'] as string;

      await db
        .update(users)
        .set({
          email: `${anonymizedEmail}@deleted`,
        })
        .where(eq(users.userId, user.userId));

      anonymized++;
      processed++;
    }

    return { processed, anonymized };
  }

  private async processChatMessages(
    tenantId: string,
    expiryDate: Date,
    action: string,
    batchSize: number,
  ): Promise<{ processed: number; archived: number; deleted: number }> {
    const db = getDatabaseClient();
    let processed = 0;
    let archived = 0;
    let deleted = 0;

    while (true) {
      const expiredMessages = await db
        .select({ messageId: chatMessage.messageId })
        .from(chatMessage)
        .innerJoin(chatChannel, eq(chatMessage.channelId, chatChannel.channelId))
        .where(and(eq(chatChannel.tenantId, tenantId), lt(chatMessage.createdAt, expiryDate)))
        .limit(batchSize);

      if (expiredMessages.length === 0) {
        break;
      }

      for (const message of expiredMessages) {
        if (action === 'archive') {
          const messageData = await db
            .select()
            .from(chatMessage)
            .where(eq(chatMessage.messageId, message.messageId))
            .limit(1);

          if (messageData.length > 0) {
            await archiveService.archive({
              tenantId,
              dataCategory: 'chat_messages',
              originalId: message.messageId,
              data: messageData[0] as unknown as Record<string, unknown>,
            });
            archived++;
          }
        }

        await db.delete(chatMessage).where(eq(chatMessage.messageId, message.messageId));
        deleted++;
        processed++;
      }
    }

    return { processed, archived, deleted };
  }

  private async cleanupExpiredArchives(job: Job<CleanupExpiredArchivesJobData>): Promise<unknown> {
    const { tenantId } = job.data;

    if (tenantId) {
      const result = await archiveService.deleteExpiredArchives();
      return result;
    }

    const db = getDatabaseClient();
    const now = new Date();

    const expiredArchives = await db
      .select()
      .from(archivedData)
      .where(and(lt(archivedData.expiresAt, now), isNull(archivedData.expiresAt)))
      .limit(1000);

    let deleted = 0;
    const errors: string[] = [];

    for (const archive of expiredArchives) {
      if (archive.expiresAt && archive.expiresAt < now) {
        try {
          const result = await db
            .delete(archivedData)
            .where(eq(archivedData.id, archive.id))
            .returning({ id: archivedData.id });

          if (result.length > 0) {
            deleted++;
          }
        } catch (error) {
          errors.push(
            `Failed to delete archive ${archive.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    return { deleted, errors };
  }

  private async anonymizeUser(job: Job<AnonymizeUserJobData>): Promise<unknown> {
    const { tenantId, userId } = job.data;
    const db = getDatabaseClient();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const { anonymized, fieldsAnonymized } = anonymizationService.anonymize({
      email: user.email,
      name: user.userId,
    } as Record<string, unknown>);

    const anonymizedEmail = anonymized['email'] as string;

    await db
      .update(users)
      .set({
        email: `${anonymizedEmail}@anonymized`,
      })
      .where(eq(users.userId, userId));

    return {
      success: true,
      originalId: userId,
      fieldsAnonymized,
    };
  }

  async start(): Promise<void> {
    this.health.isRunning = true;
    this.health.isPaused = false;
    await this.worker.run();
  }

  async stop(): Promise<void> {
    this.health.isRunning = false;
    await this.worker.close();
  }

  async pause(): Promise<void> {
    this.health.isPaused = true;
    await this.worker.pause();
  }

  async resume(): Promise<void> {
    this.health.isPaused = false;
    this.worker.resume();
  }

  getHealth(): WorkerHealth {
    return { ...this.health };
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }

  async addJob(
    data: RetentionJobData,
    options?: { priority?: number; delay?: number },
  ): Promise<string | undefined> {
    const job = await this.queue.add(data.type, data, {
      ...options,
      jobId: `${data.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    });
    return job.id;
  }

  async scheduleDaily(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    const delay = tomorrow.getTime() - now.getTime();

    await this.queue.add(
      RETENTION_JOB_TYPES.PROCESS_TENANT,
      { type: RETENTION_JOB_TYPES.PROCESS_TENANT, tenantId: 'all' },
      { delay },
    );
  }
}

export function createRetentionWorker(
  config: WorkerConfig,
  dependencies: WorkerDependencies,
): RetentionWorker {
  return new RetentionWorker(config, dependencies);
}
