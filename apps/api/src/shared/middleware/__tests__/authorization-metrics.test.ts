import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  getAuthorizationMetrics,
  recordAuthorizationEvaluation,
  recordAuthorizationError,
  resetAuthorizationMetrics,
  ABAC_PERFORMANCE_TARGET_MS,
  ABAC_SLOW_PATH_THRESHOLD_MS,
} from '../authorization-metrics.js';

describe('authorization metrics', () => {
  beforeEach(() => {
    resetAuthorizationMetrics();
  });

  afterEach(() => {
    resetAuthorizationMetrics();
  });

  describe('recordAuthorizationEvaluation', () => {
    it('tracks total evaluations', () => {
      recordAuthorizationEvaluation(5, false);
      recordAuthorizationEvaluation(8, true);
      recordAuthorizationEvaluation(12, false);

      const metrics = getAuthorizationMetrics();
      expect(metrics.totalEvaluations).toBe(3);
    });

    it('tracks cache hits and misses separately', () => {
      recordAuthorizationEvaluation(5, true);
      recordAuthorizationEvaluation(8, true);
      recordAuthorizationEvaluation(12, false);

      const metrics = getAuthorizationMetrics();
      expect(metrics.cacheHits).toBe(2);
      expect(metrics.cacheMisses).toBe(1);
    });

    it('calculates p50 latency', () => {
      for (let i = 1; i <= 100; i++) {
        recordAuthorizationEvaluation(i, false);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.p50LatencyMs).toBe(50);
    });

    it('calculates p95 latency', () => {
      for (let i = 1; i <= 100; i++) {
        recordAuthorizationEvaluation(i, false);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.p95LatencyMs).toBe(95);
    });

    it('calculates p99 latency', () => {
      for (let i = 1; i <= 100; i++) {
        recordAuthorizationEvaluation(i, false);
      }

      const metrics = getAuthorizationMetrics();
      expect(metrics.p99LatencyMs).toBe(99);
    });

    it('returns zero percentiles for empty histogram', () => {
      const metrics = getAuthorizationMetrics();
      expect(metrics.p50LatencyMs).toBe(0);
      expect(metrics.p95LatencyMs).toBe(0);
      expect(metrics.p99LatencyMs).toBe(0);
    });
  });

  describe('recordAuthorizationError', () => {
    it('tracks error count', () => {
      recordAuthorizationError();
      recordAuthorizationError();

      const metrics = getAuthorizationMetrics();
      expect(metrics.errors).toBe(2);
    });
  });

  describe('resetAuthorizationMetrics', () => {
    it('clears all metrics', () => {
      recordAuthorizationEvaluation(5, true);
      recordAuthorizationEvaluation(8, false);
      recordAuthorizationError();

      resetAuthorizationMetrics();

      const metrics = getAuthorizationMetrics();
      expect(metrics.totalEvaluations).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.p50LatencyMs).toBe(0);
    });
  });

  describe('performance contract constants', () => {
    it('defines P99 target at 10ms', () => {
      expect(ABAC_PERFORMANCE_TARGET_MS).toBe(10);
    });

    it('defines slow-path threshold at 25ms', () => {
      expect(ABAC_SLOW_PATH_THRESHOLD_MS).toBe(25);
    });
  });
});
