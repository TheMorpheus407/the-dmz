export const aiGenerationLatencyHistogram = {
  name: 'ai_generation_latency_seconds',
  help: 'AI content generation latency in seconds',
  labelNames: ['provider', 'content_type', 'tenant_id'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
};

export const aiGenerationTotal = {
  name: 'ai_generation_total',
  help: 'Total number of AI content generations',
  labelNames: ['provider', 'content_type', 'status', 'tenant_id'] as const,
};

export const aiGenerationErrorsTotal = {
  name: 'ai_generation_errors_total',
  help: 'Total number of AI generation errors by provider and error type',
  labelNames: ['provider', 'error_type', 'tenant_id'] as const,
};
