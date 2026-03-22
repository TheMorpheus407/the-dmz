import {
  getAllCacheMetrics,
  getCacheMetricsSummary,
  formatCacheMetricsPrometheus,
} from '../../shared/cache/metrics.js';
import { getRedisClient, checkRedisHealth } from '../../shared/database/redis.js';
import { invalidateContentCache, isContentCacheHealthy } from '../../shared/cache/content-cache.js';
import {
  isAuthPolicyCacheHealthy,
  invalidateTenantPolicyCache,
  invalidateFeatureFlagsCache,
  invalidateUserPermissionsCache,
  invalidateAllUserPermissionsCache,
} from '../../shared/cache/auth-policy-cache.js';
import {
  isGameStateCacheHealthy,
  invalidateUserGameState,
  invalidateTenantGameState,
} from '../../shared/cache/game-state-cache.js';
import { isABACCacheHealthy, invalidateABACCache } from '../../shared/cache/abac-cache.js';
import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { createAuditLog } from '../audit/audit.service.js'; // eslint-disable-line import-x/no-restricted-paths

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

export interface CacheHealthStatus {
  redis: boolean;
  abac: boolean;
  content: boolean;
  authPolicy: boolean;
  gameState: boolean;
}

export interface CacheInvalidationRequest {
  type:
    | 'content'
    | 'auth-policy'
    | 'feature-flags'
    | 'user-permissions'
    | 'all-permissions'
    | 'abac'
    | 'game-state-user'
    | 'game-state-tenant';
  tenantId: string;
  userId?: string;
  contentType?: 'email-template' | 'scenario' | 'document-template';
  contentId?: string;
}

export const registerCacheRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/metrics/cache',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: false,
      },
    },
    async (_request, reply) => {
      const metrics = getAllCacheMetrics();
      const summary = getCacheMetricsSummary();

      reply.header('Content-Type', 'application/json');
      return {
        metrics,
        summary,
      };
    },
  );

  fastify.get(
    '/metrics/cache/prometheus',
    {
      preHandler: [authGuard],
      config: {
        rateLimit: false,
      },
    },
    async (_request, reply) => {
      const prometheusMetrics = formatCacheMetricsPrometheus();

      reply.header('Content-Type', 'text/plain; version=0.0.4');
      return prometheusMetrics;
    },
  );

  fastify.get(
    '/health/cache',
    {
      config: {
        rateLimit: false,
      },
    },
    async (_request, reply) => {
      const config = fastify.config as unknown as AppConfig;
      const redis = await checkRedisHealth(config);

      const [abacHealthy, contentHealthy, authPolicyHealthy, gameStateHealthy] = await Promise.all([
        isABACCacheHealthy(config),
        isContentCacheHealthy(config),
        isAuthPolicyCacheHealthy(config),
        isGameStateCacheHealthy(config),
      ]);

      const health: CacheHealthStatus = {
        redis: redis.ok,
        abac: abacHealthy,
        content: contentHealthy,
        authPolicy: authPolicyHealthy,
        gameState: gameStateHealthy,
      };

      const isHealthy = health.redis;

      if (!isHealthy) {
        reply.code(503);
      }

      return {
        status: isHealthy ? 'ok' : 'unhealthy',
        ...health,
      };
    },
  );

  fastify.post<{ Body: CacheInvalidationRequest }>(
    '/cache/invalidate',
    {
      preHandler: [authGuard, tenantContext, requirePermission('cache', 'invalidate')],
      config: {
        rateLimit: false,
      },
    },
    async (request, reply) => {
      const { type, tenantId, userId, contentType, contentId } = request.body;

      if (!tenantId) {
        reply.code(400);
        return { error: 'tenantId is required' };
      }

      const requestTenantId = request.tenantContext!.tenantId;
      const isSuperAdmin = request.tenantContext!.isSuperAdmin;

      if (!isSuperAdmin && requestTenantId !== tenantId) {
        reply.code(403);
        return { error: 'Cannot invalidate cache for another tenant' };
      }

      const config = fastify.config as unknown as AppConfig;
      const redis = getRedisClient(config);

      try {
        switch (type) {
          case 'content':
            await invalidateContentCache(
              config,
              tenantId,
              contentType,
              contentId ?? undefined,
              redis ?? undefined,
            );
            break;
          case 'auth-policy':
            await invalidateTenantPolicyCache(config, tenantId, redis ?? undefined);
            break;
          case 'feature-flags':
            await invalidateFeatureFlagsCache(config, tenantId, userId, redis ?? undefined);
            break;
          case 'user-permissions':
            if (!userId) {
              reply.code(400);
              return { error: 'userId is required for user-permissions invalidation' };
            }
            await invalidateUserPermissionsCache(config, tenantId, userId, redis ?? undefined);
            break;
          case 'all-permissions':
            await invalidateAllUserPermissionsCache(config, tenantId, redis ?? undefined);
            break;
          case 'abac':
            await invalidateABACCache(config, tenantId, userId, redis ?? undefined);
            break;
          case 'game-state-user':
            if (!userId) {
              reply.code(400);
              return { error: 'userId is required for game-state-user invalidation' };
            }
            await invalidateUserGameState(config, tenantId, userId, redis ?? undefined);
            break;
          case 'game-state-tenant':
            await invalidateTenantGameState(config, tenantId, redis ?? undefined);
            break;
          default:
            reply.code(400);
            return { error: `Invalid invalidation type: ${type as string}` };
        }

        await createAuditLog({
          tenantId: requestTenantId,
          userId: request.user?.userId ?? request.tenantContext?.tenantId ?? 'unknown',
          action: 'cache.invalidate',
          resourceType: 'cache',
          resourceId: tenantId,
          metadata: {
            cacheType: type,
            targetTenantId: tenantId,
            userId: userId,
            contentType: contentType,
            contentId: contentId,
          },
        });

        return { success: true, type, tenantId };
      } catch (error) {
        reply.code(500);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  );
};
