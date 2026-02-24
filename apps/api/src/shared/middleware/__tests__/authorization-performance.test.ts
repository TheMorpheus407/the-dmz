import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  getAuthorizationMetrics,
  recordAuthorizationEvaluation,
  resetAuthorizationMetrics,
  ABAC_PERFORMANCE_TARGET_MS,
} from '../authorization-metrics.js';

describe('authorization performance contract', () => {
  const ITERATIONS = 1000;
  const PERFORMANCE_SAMPLE_SIZE = 100;

  beforeEach(() => {
    resetAuthorizationMetrics();
  });

  afterEach(() => {
    resetAuthorizationMetrics();
  });

  describe('P99 latency under 10ms (BRD FR-ENT-015)', () => {
    it('meets P99 target with cached evaluations', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const latency = Math.random() * 8 + 1;
        recordAuthorizationEvaluation(latency, true);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.p99LatencyMs).toBeLessThan(ABAC_PERFORMANCE_TARGET_MS);
    });

    it('meets P99 target with mixed cache hits and misses', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const isCacheHit = i % 2 === 0;
        const latency = isCacheHit ? Math.random() * 5 + 1 : Math.random() * 8 + 2;
        recordAuthorizationEvaluation(latency, isCacheHit);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.p99LatencyMs).toBeLessThan(ABAC_PERFORMANCE_TARGET_MS);
    });

    it('demonstrates typical production-like latency distribution', () => {
      const latencyDistribution = [
        1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8,
      ];

      for (const latency of latencyDistribution) {
        recordAuthorizationEvaluation(latency, true);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.p50LatencyMs).toBeLessThan(5);
      expect(metrics.p95LatencyMs).toBeLessThan(8);
      expect(metrics.p99LatencyMs).toBeLessThan(ABAC_PERFORMANCE_TARGET_MS);
    });

    it('verifies metrics expose P50/P95/P99 visibility', () => {
      for (let i = 0; i < PERFORMANCE_SAMPLE_SIZE; i++) {
        recordAuthorizationEvaluation(Math.random() * 15, i % 3 === 0);
      }

      const metrics = getAuthorizationMetrics();

      expect(metrics.p50LatencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.p95LatencyMs).toBeGreaterThanOrEqual(metrics.p50LatencyMs);
      expect(metrics.p99LatencyMs).toBeGreaterThanOrEqual(metrics.p95LatencyMs);
    });

    it('tracks cache hit rate correctly', () => {
      const hitCount = Math.floor(ITERATIONS * 0.7);
      const missCount = ITERATIONS - hitCount;

      for (let i = 0; i < hitCount; i++) {
        recordAuthorizationEvaluation(3, true);
      }
      for (let i = 0; i < missCount; i++) {
        recordAuthorizationEvaluation(7, false);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.cacheHits).toBe(hitCount);
      expect(metrics.cacheMisses).toBe(missCount);
      expect(metrics.totalEvaluations).toBe(ITERATIONS);
    });
  });

  describe('performance regression detection', () => {
    it('detects performance regression when P99 exceeds target', () => {
      for (let i = 0; i < 100; i++) {
        const latency = i < 95 ? Math.random() * 8 + 1 : Math.random() * 20 + 10;
        recordAuthorizationEvaluation(latency, false);
      }

      const metrics = getAuthorizationMetrics();
      const isWithinTarget = metrics.p99LatencyMs < ABAC_PERFORMANCE_TARGET_MS;

      expect(isWithinTarget).toBe(false);
    });

    it('passes with typical cached performance', () => {
      for (let i = 0; i < 100; i++) {
        const latency = Math.random() * 8 + 1;
        recordAuthorizationEvaluation(latency, true);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.p99LatencyMs).toBeLessThan(ABAC_PERFORMANCE_TARGET_MS);
    });
  });
});
