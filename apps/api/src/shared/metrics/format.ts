import type { MetricStorage } from './plugin.js';

export const formatAllMetricsPrometheus = (storage: MetricStorage): string => {
  const lines: string[] = [
    '# HELP http_request_duration_seconds HTTP request latency in seconds',
    '# TYPE http_request_duration_seconds histogram',
    '# HELP http_requests_total Total number of HTTP requests',
    '# TYPE http_requests_total counter',
    '# HELP http_errors_total Total number of HTTP errors by endpoint and error type',
    '# TYPE http_errors_total counter',
    '# HELP queue_depth Current depth of message queues',
    '# TYPE queue_depth gauge',
    '# HELP websocket_active_connections Number of active WebSocket connections',
    '# TYPE websocket_active_connections gauge',
    '# HELP websocket_messages_total Total number of WebSocket messages sent/received',
    '# TYPE websocket_messages_total counter',
    '# HELP websocket_message_delivery_seconds WebSocket message delivery latency in seconds',
    '# TYPE websocket_message_delivery_seconds histogram',
    '# HELP game_active_sessions Number of active game sessions',
    '# TYPE game_active_sessions gauge',
    '# HELP game_sessions_total Total number of game sessions started',
    '# TYPE game_sessions_total counter',
    '# HELP game_phase_transitions_total Total number of game phase transitions',
    '# TYPE game_phase_transitions_total counter',
    '# HELP ai_generation_latency_seconds AI content generation latency in seconds',
    '# TYPE ai_generation_latency_seconds histogram',
    '# HELP ai_generation_total Total number of AI content generations',
    '# TYPE ai_generation_total counter',
    '# HELP ai_generation_errors_total Total number of AI generation errors by provider and error type',
    '# TYPE ai_generation_errors_total counter',
  ];

  for (const [key, value] of storage.counters) {
    lines.push(`${key} ${value}`);
  }

  for (const [key, value] of storage.gauges) {
    lines.push(`${key} ${value}`);
  }

  for (const [key, hist] of storage.histograms) {
    const labels = key.match(/\{([^}]+)\}/)?.[1] ?? '';
    const bucketLines: string[] = [];
    for (const [bucket, count] of hist.buckets) {
      bucketLines.push(`${key.replace(/\{[^}]+\}/, '')}_bucket{${labels},le="${bucket}"} ${count}`);
    }
    const sum = hist.values.reduce((a: number, b: number) => a + b, 0);
    bucketLines.push(`${key.replace(/\{[^}]+\}/, '')}_sum{${labels}} ${sum.toFixed(6)}`);
    bucketLines.push(`${key.replace(/\{[^}]+\}/, '')}_count{${labels}} ${hist.values.length}`);
    lines.push(...bucketLines);
  }

  return lines.join('\n');
};
