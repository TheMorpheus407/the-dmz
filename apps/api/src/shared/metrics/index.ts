export { createMetricsPlugin } from './plugin.js';
export type { MetricStorage } from './plugin.js';
export { httpLatencyHistogram, httpRequestsTotal, httpErrorsTotal } from './http-metrics.js';
export { queueDepthGauge } from './queue-metrics.js';
export { activeWebSocketConnectionsGauge } from './websocket-metrics.js';
export { activeGameSessionsGauge } from './game-metrics.js';
export { aiGenerationLatencyHistogram } from './ai-metrics.js';
export { formatAllMetricsPrometheus } from './format.js';
export {
  recordHttpMetrics,
  recordPoolSize,
  recordPoolDepletionRate,
  recordPoolReplenishmentLatency,
  recordPoolLowWatermark,
} from './hooks.js';
export {
  incrementCounter,
  observeHistogram,
  setGauge,
  getAllMetrics,
  resetMetrics,
} from './plugin.js';
