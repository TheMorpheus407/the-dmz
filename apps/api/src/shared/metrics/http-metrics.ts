export const httpLatencyHistogram = {
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'endpoint', 'status_code', 'tenant_id'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5],
};

export const httpRequestsTotal = {
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status_code', 'tenant_id'] as const,
};

export const httpErrorsTotal = {
  name: 'http_errors_total',
  help: 'Total number of HTTP errors by endpoint and error type',
  labelNames: ['method', 'endpoint', 'error_type', 'status_code', 'tenant_id'] as const,
};
