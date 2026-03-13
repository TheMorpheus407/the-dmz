export const activeWebSocketConnectionsGauge = {
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['tenant_id'] as const,
};

export const websocketMessagesTotal = {
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages sent/received',
  labelNames: ['direction', 'tenant_id'] as const,
};

export const websocketLatencyHistogram = {
  name: 'websocket_message_delivery_seconds',
  help: 'WebSocket message delivery latency in seconds',
  labelNames: ['message_type', 'tenant_id'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5],
};
