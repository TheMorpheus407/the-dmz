import fp from 'fastify-plugin';

import { formatAllMetricsPrometheus } from './format.js';

import type { FastifyInstance } from 'fastify';

export interface MetricStorage {
  counters: Map<string, number>;
  histograms: Map<string, { values: number[]; buckets: Map<number, number> }>;
  gauges: Map<string, number>;
}

const storage: MetricStorage = {
  counters: new Map(),
  histograms: new Map(),
  gauges: new Map(),
};

const makeKey = (name: string, labels: Record<string, string>): string => {
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  return `${name}{${labelStr}}`;
};

export const incrementCounter = (name: string, labels: Record<string, string> = {}): void => {
  const key = makeKey(name, labels);
  storage.counters.set(key, (storage.counters.get(key) ?? 0) + 1);
};

const DEFAULT_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5];

export const observeHistogram = (
  name: string,
  value: number,
  labels: Record<string, string> = {},
): void => {
  const key = makeKey(name, labels);
  if (!storage.histograms.has(key)) {
    const buckets = new Map<number, number>();
    for (const b of DEFAULT_BUCKETS) {
      buckets.set(b, 0);
    }
    storage.histograms.set(key, { values: [], buckets });
  }
  const hist = storage.histograms.get(key)!;
  hist.values.push(value);
  for (const [bucket, count] of hist.buckets) {
    if (value <= bucket) {
      hist.buckets.set(bucket, count + 1);
    }
  }
};

export const setGauge = (
  name: string,
  value: number,
  labels: Record<string, string> = {},
): void => {
  const key = makeKey(name, labels);
  storage.gauges.set(key, value);
};

export const getAllMetrics = (): MetricStorage => storage;

export const resetMetrics = (): void => {
  storage.counters.clear();
  storage.histograms.clear();
  storage.gauges.clear();
};

async function metricsPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.get('/metrics', async (_request, reply) => {
    const output = formatAllMetricsPrometheus(storage);
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return output;
  });

  fastify.get('/metrics/http', async (_request, reply) => {
    const output = formatHttpMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return output;
  });

  fastify.get('/metrics/queue', async (_request, reply) => {
    const output = formatQueueMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return output;
  });

  fastify.get('/metrics/websocket', async (_request, reply) => {
    const output = formatWebSocketMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return output;
  });

  fastify.get('/metrics/game', async (_request, reply) => {
    const output = formatGameMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return output;
  });

  fastify.get('/metrics/ai', async (_request, reply) => {
    const output = formatAiMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return output;
  });

  fastify.get('/health/metrics', async (_request, _reply) => {
    return { status: 'ok', metrics: 'exposed' };
  });
}

export const createMetricsPlugin = fp(metricsPlugin, {
  name: 'metrics',
});

function formatHttpMetrics(): string {
  const lines: string[] = [
    '# HELP http_request_duration_seconds HTTP request latency in seconds',
    '# TYPE http_request_duration_seconds histogram',
    '# HELP http_requests_total Total number of HTTP requests',
    '# TYPE http_requests_total counter',
    '# HELP http_errors_total Total number of HTTP errors',
    '# TYPE http_errors_total counter',
  ];

  for (const [key, value] of storage.counters) {
    if (key.startsWith('http_requests_total') || key.startsWith('http_errors_total')) {
      lines.push(`${key} ${value}`);
    }
  }

  for (const [key, hist] of storage.histograms) {
    if (key.startsWith('http_request_duration_seconds')) {
      const bucketLines: string[] = [];
      const labels = key.match(/\{([^}]+)\}/)?.[1] ?? '';
      for (const [bucket, count] of hist.buckets) {
        bucketLines.push(`http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${count}`);
      }
      const sum = hist.values.reduce((a, b) => a + b, 0);
      bucketLines.push(`http_request_duration_seconds_sum{${labels}} ${sum.toFixed(6)}`);
      bucketLines.push(`http_request_duration_seconds_count{${labels}} ${hist.values.length}`);
      lines.push(...bucketLines);
    }
  }

  return lines.join('\n');
}

function formatQueueMetrics(): string {
  const lines: string[] = [
    '# HELP queue_depth Current depth of message queues',
    '# TYPE queue_depth gauge',
  ];

  for (const [key, value] of storage.gauges) {
    if (key.startsWith('queue_depth')) {
      lines.push(`${key} ${value}`);
    }
  }

  return lines.join('\n');
}

function formatWebSocketMetrics(): string {
  const lines: string[] = [
    '# HELP websocket_active_connections Number of active WebSocket connections',
    '# TYPE websocket_active_connections gauge',
    '# HELP websocket_messages_total Total number of WebSocket messages',
    '# TYPE websocket_messages_total counter',
    '# HELP websocket_message_delivery_seconds WebSocket message delivery latency',
    '# TYPE websocket_message_delivery_seconds histogram',
  ];

  for (const [key, value] of storage.gauges) {
    if (key.startsWith('websocket_active_connections')) {
      lines.push(`${key} ${value}`);
    }
  }

  for (const [key, value] of storage.counters) {
    if (key.startsWith('websocket_messages_total')) {
      lines.push(`${key} ${value}`);
    }
  }

  for (const [key, hist] of storage.histograms) {
    if (key.startsWith('websocket_message_delivery_seconds')) {
      const bucketLines: string[] = [];
      const labels = key.match(/\{([^}]+)\}/)?.[1] ?? '';
      for (const [bucket, count] of hist.buckets) {
        bucketLines.push(
          `websocket_message_delivery_seconds_bucket{${labels},le="${bucket}"} ${count}`,
        );
      }
      const sum = hist.values.reduce((a, b) => a + b, 0);
      bucketLines.push(`websocket_message_delivery_seconds_sum{${labels}} ${sum.toFixed(6)}`);
      bucketLines.push(`websocket_message_delivery_seconds_count{${labels}} ${hist.values.length}`);
      lines.push(...bucketLines);
    }
  }

  return lines.join('\n');
}

function formatGameMetrics(): string {
  const lines: string[] = [
    '# HELP game_active_sessions Number of active game sessions',
    '# TYPE game_active_sessions gauge',
    '# HELP game_sessions_total Total number of game sessions started',
    '# TYPE game_sessions_total counter',
    '# HELP game_phase_transitions_total Total number of game phase transitions',
    '# TYPE game_phase_transitions_total counter',
  ];

  for (const [key, value] of storage.gauges) {
    if (key.startsWith('game_active_sessions')) {
      lines.push(`${key} ${value}`);
    }
  }

  for (const [key, value] of storage.counters) {
    if (key.startsWith('game_sessions_total') || key.startsWith('game_phase_transitions_total')) {
      lines.push(`${key} ${value}`);
    }
  }

  return lines.join('\n');
}

function formatAiMetrics(): string {
  const lines: string[] = [
    '# HELP ai_generation_latency_seconds AI content generation latency in seconds',
    '# TYPE ai_generation_latency_seconds histogram',
    '# HELP ai_generation_total Total number of AI content generations',
    '# TYPE ai_generation_total counter',
    '# HELP ai_generation_errors_total Total number of AI generation errors',
    '# TYPE ai_generation_errors_total counter',
  ];

  for (const [key, value] of storage.counters) {
    if (key.startsWith('ai_generation_total') || key.startsWith('ai_generation_errors_total')) {
      lines.push(`${key} ${value}`);
    }
  }

  for (const [key, hist] of storage.histograms) {
    if (key.startsWith('ai_generation_latency_seconds')) {
      const bucketLines: string[] = [];
      const labels = key.match(/\{([^}]+)\}/)?.[1] ?? '';
      for (const [bucket, count] of hist.buckets) {
        bucketLines.push(`ai_generation_latency_seconds_bucket{${labels},le="${bucket}"} ${count}`);
      }
      const sum = hist.values.reduce((a, b) => a + b, 0);
      bucketLines.push(`ai_generation_latency_seconds_sum{${labels}} ${sum.toFixed(6)}`);
      bucketLines.push(`ai_generation_latency_seconds_count{${labels}} ${hist.values.length}`);
      lines.push(...bucketLines);
    }
  }

  return lines.join('\n');
}
