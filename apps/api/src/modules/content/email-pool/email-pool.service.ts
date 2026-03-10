import { randomUUID } from 'crypto';

import { getRedisClient, type RedisRateLimitClient } from '../../../shared/database/redis.js';

import {
  POOL_KEYS,
  POOL_CONFIG,
  DIFFICULTY_TIERS,
  type PooledEmail,
  type PoolMetadata,
  type PoolHealth,
  type PoolMetrics,
  type AddEmailOptions,
  type PopEmailResult,
  type DifficultyTier,
} from './email-pool.types.js';

import type { AppConfig } from '../../../config.js';
import type { DomainEvent } from '../../../shared/events/event-types.js';

type PoolEventHandler = (event: DomainEvent) => void | Promise<void>;

export class EmailPoolService {
  private redisClient: RedisRateLimitClient | null = null;
  private eventHandlers: PoolEventHandler[] = [];

  constructor(private config: AppConfig) {}

  private async getRedis(): Promise<RedisRateLimitClient> {
    if (!this.redisClient) {
      this.redisClient = getRedisClient(this.config);
      if (this.redisClient) {
        await this.redisClient.connect();
      }
    }

    if (!this.redisClient) {
      throw new Error('Redis client not available');
    }

    return this.redisClient;
  }

  subscribe(handler: PoolEventHandler): void {
    this.eventHandlers.push(handler);
  }

  unsubscribe(handler: PoolEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private async emitPoolEvent(
    eventType: string,
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event: DomainEvent = {
      eventId: randomUUID(),
      eventType,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      tenantId,
      userId: 'system',
      source: 'email-pool',
      payload,
      version: 1,
    };

    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch {
        // Log but don't fail
      }
    }
  }

  async addEmail(tenantId: string, options: AddEmailOptions): Promise<void> {
    const redis = await this.getRedis();
    const poolKey = POOL_KEYS.pool(options.difficulty, tenantId);
    const qualityKey = POOL_KEYS.qualitySet(options.difficulty, tenantId);

    const pooledEmail: PooledEmail = {
      emailId: options.emailId,
      templateId: options.templateId,
      difficulty: options.difficulty,
      quality: options.quality,
      intent: options.intent,
      ...(options.attackType && { attackType: options.attackType }),
      ...(options.faction && { faction: options.faction }),
      ...(options.season && { season: options.season }),
      createdAt: new Date().toISOString(),
      ...(options.metadata && { metadata: options.metadata }),
    };

    const emailJson = JSON.stringify(pooledEmail);

    await redis.lpush(poolKey, emailJson);

    await redis.zadd(qualityKey, options.quality, options.emailId);

    await this.updateMetadata(tenantId, options.difficulty);

    await redis.lpush(POOL_KEYS.totalCount(tenantId), emailJson);
  }

  async popEmail(tenantId: string, difficulty?: number): Promise<PopEmailResult | null> {
    const redis = await this.getRedis();

    if (difficulty !== undefined) {
      return this.popFromTier(redis, tenantId, difficulty);
    }

    for (const tier of DIFFICULTY_TIERS) {
      const result = await this.popFromTier(redis, tenantId, tier);
      if (result) {
        return result;
      }
    }

    return null;
  }

  private async popFromTier(
    redis: RedisRateLimitClient,
    tenantId: string,
    difficulty: number,
  ): Promise<PopEmailResult | null> {
    const poolKey = POOL_KEYS.pool(difficulty, tenantId);
    const qualityKey = POOL_KEYS.qualitySet(difficulty, tenantId);

    const count = await redis.llen(poolKey);
    if (count === 0) {
      return null;
    }

    const popResult = await this.qualityWeightedPop(redis, poolKey, qualityKey);

    if (!popResult) {
      return null;
    }

    const { emailJson, quality } = popResult;

    try {
      const email: PooledEmail = JSON.parse(emailJson) as PooledEmail;

      await redis.zrem(qualityKey, email.emailId);

      await this.updateMetadata(tenantId, difficulty);

      await this.emitPoolEvent('email.pool.emailSelected', tenantId, {
        emailId: email.emailId,
        difficulty: email.difficulty,
        quality,
        selectionMethod: 'weighted',
      });

      return {
        email,
        quality,
        selectionMethod: 'weighted',
      };
    } catch {
      return null;
    }
  }

  private async qualityWeightedPop(
    redis: RedisRateLimitClient,
    poolKey: string,
    qualityKey: string,
  ): Promise<{ emailJson: string; quality: number } | null> {
    const maxResult = await redis.zpopmax(qualityKey);

    if (!maxResult) {
      return null;
    }

    const emailJson = await redis.rpop(poolKey);

    if (!emailJson) {
      await redis.zadd(qualityKey, maxResult.score, maxResult.member);
      return null;
    }

    return {
      emailJson,
      quality: maxResult.score,
    };
  }

  private async updateMetadata(tenantId: string, difficulty: number): Promise<void> {
    const redis = await this.getRedis();
    const poolKey = POOL_KEYS.pool(difficulty, tenantId);
    const metadataKey = POOL_KEYS.metadata(difficulty, tenantId);

    const count = await redis.llen(poolKey);
    const targetSize = POOL_CONFIG.TARGET_PER_TIER;
    const lowWatermark = Math.floor(targetSize * POOL_CONFIG.LOW_WATERMARK_PERCENT);
    const highWatermark = Math.floor(targetSize * POOL_CONFIG.HIGH_WATERMARK_PERCENT);

    const metadata: PoolMetadata = {
      difficulty,
      count,
      targetSize,
      lowWatermark,
      highWatermark,
    };

    await redis.setValue(metadataKey, JSON.stringify(metadata), POOL_CONFIG.TARGET_PER_TIER * 60);
  }

  async getPoolHealth(tenantId: string): Promise<PoolHealth[]> {
    const redis = await this.getRedis();
    const healthResults: PoolHealth[] = [];

    for (const difficulty of DIFFICULTY_TIERS) {
      const poolKey = POOL_KEYS.pool(difficulty, tenantId);
      const count = await redis.llen(poolKey);
      const targetSize = POOL_CONFIG.TARGET_PER_TIER;
      const lowWatermark = Math.floor(targetSize * POOL_CONFIG.LOW_WATERMARK_PERCENT);
      const highWatermark = Math.floor(targetSize * POOL_CONFIG.HIGH_WATERMARK_PERCENT);

      const percentage = targetSize > 0 ? (count / targetSize) * 100 : 0;

      const health: PoolHealth = {
        difficulty,
        currentCount: count,
        targetSize,
        percentage,
        isLow: count <= lowWatermark,
        isHigh: count >= highWatermark,
        needsRefill: count <= lowWatermark,
      };

      healthResults.push(health);

      if (health.needsRefill) {
        await this.emitPoolEvent('email.pool.lowWatermark', tenantId, {
          difficulty,
          currentCount: count,
          lowWatermark,
          targetSize,
        });
      }
    }

    return healthResults;
  }

  async getPoolMetrics(tenantId: string): Promise<PoolMetrics> {
    const healthResults = await this.getPoolHealth(tenantId);

    const totalPoolSize = healthResults.reduce((sum, h) => sum + h.currentCount, 0);

    return {
      totalPoolSize,
      tierMetrics: healthResults,
    };
  }

  async getTierCount(tenantId: string, difficulty: number): Promise<number> {
    const redis = await this.getRedis();
    const poolKey = POOL_KEYS.pool(difficulty, tenantId);
    return redis.llen(poolKey);
  }

  async getTotalCount(tenantId: string): Promise<number> {
    const redis = await this.getRedis();
    const totalKey = POOL_KEYS.totalCount(tenantId);
    return redis.llen(totalKey);
  }

  async checkLowWatermark(tenantId: string): Promise<Map<DifficultyTier, boolean>> {
    const healthResults = await this.getPoolHealth(tenantId);
    const lowWatermarks = new Map<DifficultyTier, boolean>();

    for (const health of healthResults) {
      lowWatermarks.set(health.difficulty as DifficultyTier, health.isLow);
    }

    return lowWatermarks;
  }

  async clearPool(tenantId: string): Promise<void> {
    const redis = await this.getRedis();

    for (const difficulty of DIFFICULTY_TIERS) {
      const poolKey = POOL_KEYS.pool(difficulty, tenantId);
      const qualityKey = POOL_KEYS.qualitySet(difficulty, tenantId);
      const metadataKey = POOL_KEYS.metadata(difficulty, tenantId);

      await redis.deleteKey(poolKey);
      await redis.deleteKey(qualityKey);
      await redis.deleteKey(metadataKey);
    }

    const totalKey = POOL_KEYS.totalCount(tenantId);
    await redis.deleteKey(totalKey);

    await this.emitPoolEvent('email.pool.cleared', tenantId, {});
  }

  async initializePool(
    tenantId: string,
    emails: AddEmailOptions[],
  ): Promise<{ added: number; failed: number }> {
    let added = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        await this.addEmail(tenantId, email);
        added++;
      } catch {
        failed++;
      }
    }

    await this.emitPoolEvent('email.pool.initialized', tenantId, {
      added,
      failed,
      total: emails.length,
    });

    return { added, failed };
  }
}

export const createEmailPoolService = (config: AppConfig): EmailPoolService => {
  return new EmailPoolService(config);
};
