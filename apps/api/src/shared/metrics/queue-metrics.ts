export const queueDepthGauge = {
  name: 'queue_depth',
  help: 'Current depth of message queues',
  labelNames: ['queue_name', 'tenant_id'] as const,
};
