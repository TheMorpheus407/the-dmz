import { getABACCacheMetrics, type ABACCacheMetrics } from './abac-cache.js';
import { getContentCacheMetrics, type ContentCacheMetrics } from './content-cache.js';
import { getAuthPolicyCacheMetrics, type AuthPolicyCacheMetrics } from './auth-policy-cache.js';
import { getGameStateCacheMetrics, type GameStateCacheMetrics } from './game-state-cache.js';

export interface CacheMetrics {
  abac: ABACCacheMetrics;
  content: ContentCacheMetrics;
  authPolicy: AuthPolicyCacheMetrics;
  gameState: GameStateCacheMetrics;
}

export const getAllCacheMetrics = (): CacheMetrics => {
  return {
    abac: getABACCacheMetrics(),
    content: getContentCacheMetrics(),
    authPolicy: getAuthPolicyCacheMetrics(),
    gameState: getGameStateCacheMetrics(),
  };
};

export interface CacheMetricsSummary {
  totalHits: number;
  totalMisses: number;
  totalWrites: number;
  totalInvalidations: number;
  totalErrors: number;
  totalLatencyMs: number;
  hitRate: number;
}

export const getCacheMetricsSummary = (): CacheMetricsSummary => {
  const metrics = getAllCacheMetrics();

  const totalHits =
    metrics.abac.hits + metrics.content.hits + metrics.authPolicy.hits + metrics.gameState.hits;

  const totalMisses =
    metrics.abac.misses +
    metrics.content.misses +
    metrics.authPolicy.misses +
    metrics.gameState.misses;

  const totalWrites = metrics.gameState.writes;

  const totalInvalidations =
    metrics.abac.invalidations +
    metrics.content.invalidations +
    metrics.authPolicy.invalidations +
    metrics.gameState.invalidations;

  const totalErrors =
    metrics.abac.errors +
    metrics.content.errors +
    metrics.authPolicy.errors +
    metrics.gameState.errors;

  const totalLatencyMs =
    metrics.abac.totalLatencyMs +
    metrics.content.totalLatencyMs +
    metrics.authPolicy.totalLatencyMs +
    metrics.gameState.totalLatencyMs;

  const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

  return {
    totalHits,
    totalMisses,
    totalWrites,
    totalInvalidations,
    totalErrors,
    totalLatencyMs,
    hitRate,
  };
};

export const formatCacheMetricsPrometheus = (): string => {
  const metrics = getAllCacheMetrics();
  const summary = getCacheMetricsSummary();

  const lines: string[] = [
    '# HELP cache_hits_total Total number of cache hits',
    '# TYPE cache_hits_total counter',
    `cache_hits_total{abac="true"} ${metrics.abac.hits}`,
    `cache_hits_total{content="true"} ${metrics.content.hits}`,
    `cache_hits_total{auth_policy="true"} ${metrics.authPolicy.hits}`,
    `cache_hits_total{game_state="true"} ${metrics.gameState.hits}`,
    '',
    '# HELP cache_misses_total Total number of cache misses',
    '# TYPE cache_misses_total counter',
    `cache_misses_total{abac="true"} ${metrics.abac.misses}`,
    `cache_misses_total{content="true"} ${metrics.content.misses}`,
    `cache_misses_total{auth_policy="true"} ${metrics.authPolicy.misses}`,
    `cache_misses_total{game_state="true"} ${metrics.gameState.misses}`,
    '',
    '# HELP cache_writes_total Total number of cache writes (write-through)',
    '# TYPE cache_writes_total counter',
    `cache_writes_total{game_state="true"} ${metrics.gameState.writes}`,
    '',
    '# HELP cache_invalidations_total Total number of cache invalidations',
    '# TYPE cache_invalidations_total counter',
    `cache_invalidations_total{abac="true"} ${metrics.abac.invalidations}`,
    `cache_invalidations_total{content="true"} ${metrics.content.invalidations}`,
    `cache_invalidations_total{auth_policy="true"} ${metrics.authPolicy.invalidations}`,
    `cache_invalidations_total{game_state="true"} ${metrics.gameState.invalidations}`,
    '',
    '# HELP cache_errors_total Total number of cache errors',
    '# TYPE cache_errors_total counter',
    `cache_errors_total{abac="true"} ${metrics.abac.errors}`,
    `cache_errors_total{content="true"} ${metrics.content.errors}`,
    `cache_errors_total{auth_policy="true"} ${metrics.authPolicy.errors}`,
    `cache_errors_total{game_state="true"} ${metrics.gameState.errors}`,
    '',
    '# HELP cache_latency_ms_total Total latency spent on cache operations',
    '# TYPE cache_latency_ms_total gauge',
    `cache_latency_ms_total{abac="true"} ${metrics.abac.totalLatencyMs.toFixed(2)}`,
    `cache_latency_ms_total{content="true"} ${metrics.content.totalLatencyMs.toFixed(2)}`,
    `cache_latency_ms_total{auth_policy="true"} ${metrics.authPolicy.totalLatencyMs.toFixed(2)}`,
    `cache_latency_ms_total{game_state="true"} ${metrics.gameState.totalLatencyMs.toFixed(2)}`,
    '',
    '# HELP cache_hit_rate Overall cache hit rate',
    '# TYPE cache_hit_rate gauge',
    `cache_hit_rate ${summary.hitRate.toFixed(4)}`,
  ];

  return lines.join('\n');
};
