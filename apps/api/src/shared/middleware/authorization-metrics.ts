export interface AuthorizationMetrics {
  totalEvaluations: number;
  cacheHits: number;
  cacheMisses: number;
  slowEvaluations: number;
  errors: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

const LATENCY_HISTOGRAM: number[] = [];

let AUTHORIZATION_METRICS: AuthorizationMetrics = {
  totalEvaluations: 0,
  cacheHits: 0,
  cacheMisses: 0,
  slowEvaluations: 0,
  errors: 0,
  p50LatencyMs: 0,
  p95LatencyMs: 0,
  p99LatencyMs: 0,
};

const calculatePercentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  const value = sorted[Math.max(0, index)];
  return value ?? 0;
};

const updatePercentiles = (): void => {
  if (LATENCY_HISTOGRAM.length === 0) {
    AUTHORIZATION_METRICS.p50LatencyMs = 0;
    AUTHORIZATION_METRICS.p95LatencyMs = 0;
    AUTHORIZATION_METRICS.p99LatencyMs = 0;
    return;
  }

  const sorted = [...LATENCY_HISTOGRAM].sort((a, b) => a - b);
  AUTHORIZATION_METRICS.p50LatencyMs = calculatePercentile(sorted, 50);
  AUTHORIZATION_METRICS.p95LatencyMs = calculatePercentile(sorted, 95);
  AUTHORIZATION_METRICS.p99LatencyMs = calculatePercentile(sorted, 99);
};

export const getAuthorizationMetrics = (): Readonly<AuthorizationMetrics> => {
  updatePercentiles();
  return Object.freeze({ ...AUTHORIZATION_METRICS });
};

export const recordAuthorizationEvaluation = (latencyMs: number, isCacheHit: boolean): void => {
  LATENCY_HISTOGRAM.push(latencyMs);

  if (LATENCY_HISTOGRAM.length > 10000) {
    LATENCY_HISTOGRAM.shift();
  }

  AUTHORIZATION_METRICS.totalEvaluations++;
  if (isCacheHit) {
    AUTHORIZATION_METRICS.cacheHits++;
  } else {
    AUTHORIZATION_METRICS.cacheMisses++;
  }

  updatePercentiles();
};

export const recordSlowAuthorizationEvaluation = (_latencyMs: number): void => {
  AUTHORIZATION_METRICS.slowEvaluations++;
};

export const recordAuthorizationError = (): void => {
  AUTHORIZATION_METRICS.errors++;
};

export const resetAuthorizationMetrics = (): void => {
  LATENCY_HISTOGRAM.length = 0;
  AUTHORIZATION_METRICS = {
    totalEvaluations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    slowEvaluations: 0,
    errors: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
  };
};

export const ABAC_PERFORMANCE_TARGET_MS = 10;
export const ABAC_SLOW_PATH_THRESHOLD_MS = 25;
