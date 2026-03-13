import { describe, it, expect, beforeEach } from 'vitest';

import {
  getAllCacheMetrics,
  getCacheMetricsSummary,
  formatCacheMetricsPrometheus,
} from '../metrics.js';
import { resetABACCacheMetrics } from '../abac-cache.js';
import { resetContentCacheMetrics } from '../content-cache.js';
import { resetAuthPolicyCacheMetrics } from '../auth-policy-cache.js';
import { resetGameStateCacheMetrics } from '../game-state-cache.js';

describe('metrics', () => {
  beforeEach(() => {
    resetABACCacheMetrics();
    resetContentCacheMetrics();
    resetAuthPolicyCacheMetrics();
    resetGameStateCacheMetrics();
  });

  describe('getAllCacheMetrics', () => {
    it('should return metrics for all cache types', () => {
      const metrics = getAllCacheMetrics();

      expect(metrics).toHaveProperty('abac');
      expect(metrics).toHaveProperty('content');
      expect(metrics).toHaveProperty('authPolicy');
      expect(metrics).toHaveProperty('gameState');
    });

    it('should return frozen objects', () => {
      const metrics = getAllCacheMetrics();

      expect(Object.isFrozen(metrics.abac)).toBe(true);
      expect(Object.isFrozen(metrics.content)).toBe(true);
      expect(Object.isFrozen(metrics.authPolicy)).toBe(true);
      expect(Object.isFrozen(metrics.gameState)).toBe(true);
    });
  });

  describe('getCacheMetricsSummary', () => {
    it('should return zero summary when all metrics are zero', () => {
      const summary = getCacheMetricsSummary();

      expect(summary.totalHits).toBe(0);
      expect(summary.totalMisses).toBe(0);
      expect(summary.totalWrites).toBe(0);
      expect(summary.totalInvalidations).toBe(0);
      expect(summary.totalErrors).toBe(0);
      expect(summary.totalLatencyMs).toBe(0);
      expect(summary.hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      resetABACCacheMetrics();
      resetContentCacheMetrics();
      resetAuthPolicyCacheMetrics();
      resetGameStateCacheMetrics();

      const metrics = getAllCacheMetrics();
      expect(metrics.abac.hits).toBe(0);

      const summary = getCacheMetricsSummary();
      expect(summary.hitRate).toBe(0);
    });
  });

  describe('formatCacheMetricsPrometheus', () => {
    it('should return valid Prometheus format', () => {
      const prometheusMetrics = formatCacheMetricsPrometheus();

      expect(prometheusMetrics).toContain('# HELP');
      expect(prometheusMetrics).toContain('# TYPE');
      expect(prometheusMetrics).toContain('cache_hits_total');
      expect(prometheusMetrics).toContain('cache_misses_total');
      expect(prometheusMetrics).toContain('cache_writes_total');
      expect(prometheusMetrics).toContain('cache_invalidations_total');
      expect(prometheusMetrics).toContain('cache_errors_total');
      expect(prometheusMetrics).toContain('cache_latency_ms_total');
      expect(prometheusMetrics).toContain('cache_hit_rate');
    });

    it('should include all cache type labels', () => {
      const prometheusMetrics = formatCacheMetricsPrometheus();

      expect(prometheusMetrics).toContain('abac="true"');
      expect(prometheusMetrics).toContain('content="true"');
      expect(prometheusMetrics).toContain('auth_policy="true"');
      expect(prometheusMetrics).toContain('game_state="true"');
    });
  });
});
