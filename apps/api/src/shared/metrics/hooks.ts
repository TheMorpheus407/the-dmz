import { incrementCounter, observeHistogram, setGauge, getAllMetrics } from './plugin.js';

import type { FastifyRequest, FastifyReply } from 'fastify';

const normalizeEndpoint = (url: string): string => {
  return url
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
    .replace(/\?.*$/, '');
};

export const recordHttpMetrics = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const startTime = (reply as unknown as { startTime?: number }).startTime;
  if (!startTime) return;

  const duration = (Date.now() - startTime) / 1000;
  const method = request.method;
  const endpoint = normalizeEndpoint(request.url);
  const statusCode = reply.statusCode.toString();
  const tenantId = request.tenantContext?.tenantId ?? 'none';

  observeHistogram('http_request_duration_seconds', duration, {
    method,
    endpoint,
    status_code: statusCode,
    tenant_id: tenantId,
  });

  incrementCounter('http_requests_total', {
    method,
    endpoint,
    status_code: statusCode,
    tenant_id: tenantId,
  });

  if (statusCode.startsWith('5') || statusCode.startsWith('4')) {
    incrementCounter('http_errors_total', {
      method,
      endpoint,
      error_type: statusCode.startsWith('5') ? '5xx' : '4xx',
      status_code: statusCode,
      tenant_id: tenantId,
    });
  }
};

export const recordQueueDepth = (queueName: string, depth: number, tenantId?: string): void => {
  setGauge('queue_depth', depth, {
    queue_name: queueName,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordWebSocketConnection = (
  action: 'connect' | 'disconnect',
  tenantId?: string,
): void => {
  const label = { tenant_id: tenantId ?? 'none' };
  const key = `websocket_active_connections{${Object.entries(label)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',')}}`;
  const storage = getAllMetrics();
  const current = storage.gauges.get(key) ?? 0;

  if (action === 'connect') {
    setGauge('websocket_active_connections', current + 1, label);
  } else {
    setGauge('websocket_active_connections', Math.max(0, current - 1), label);
  }
};

export const recordWebSocketMessage = (direction: 'sent' | 'received', tenantId?: string): void => {
  incrementCounter('websocket_messages_total', {
    direction,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordWebSocketLatency = (
  latencyMs: number,
  messageType: string,
  tenantId?: string,
): void => {
  observeHistogram('websocket_message_delivery_seconds', latencyMs / 1000, {
    message_type: messageType,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordGameSession = (
  action: 'start' | 'end',
  tenantId?: string,
  gameMode?: string,
): void => {
  if (action === 'start') {
    incrementCounter('game_sessions_total', {
      tenant_id: tenantId ?? 'none',
      game_mode: gameMode ?? 'default',
    });
  }
};

export const recordGamePhaseTransition = (
  fromPhase: string,
  toPhase: string,
  tenantId?: string,
): void => {
  incrementCounter('game_phase_transitions_total', {
    from_phase: fromPhase,
    to_phase: toPhase,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordActiveGameSessions = (
  count: number,
  gamePhase: string,
  tenantId?: string,
): void => {
  setGauge('game_active_sessions', count, {
    game_phase: gamePhase,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordAiGeneration = (
  provider: string,
  contentType: string,
  status: 'success' | 'error',
  tenantId?: string,
): void => {
  incrementCounter('ai_generation_total', {
    provider,
    content_type: contentType,
    status,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordAiGenerationLatency = (
  latencyMs: number,
  provider: string,
  contentType: string,
  tenantId?: string,
): void => {
  observeHistogram('ai_generation_latency_seconds', latencyMs / 1000, {
    provider,
    content_type: contentType,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordAiGenerationError = (
  provider: string,
  errorType: string,
  tenantId?: string,
): void => {
  incrementCounter('ai_generation_errors_total', {
    provider,
    error_type: errorType,
    tenant_id: tenantId ?? 'none',
  });
};

export const recordPoolSize = (difficulty: number, size: number, tenantId?: string): void => {
  setGauge('email_pool_size', size, {
    difficulty: difficulty.toString(),
    tenant_id: tenantId ?? 'none',
  });
};

export const recordPoolDepletionRate = (
  difficulty: number,
  depletionRate: number,
  tenantId?: string,
): void => {
  setGauge('email_pool_depletion_rate', depletionRate, {
    difficulty: difficulty.toString(),
    tenant_id: tenantId ?? 'none',
  });
};

export const recordPoolReplenishmentLatency = (
  latencyMs: number,
  difficulty: number,
  tenantId?: string,
): void => {
  observeHistogram('email_pool_replenishment_latency_seconds', latencyMs / 1000, {
    difficulty: difficulty.toString(),
    tenant_id: tenantId ?? 'none',
  });
};

export const recordPoolLowWatermark = (
  difficulty: number,
  isLow: boolean,
  durationMinutes: number,
  tenantId?: string,
): void => {
  if (isLow) {
    incrementCounter('email_pool_low_watermark_alerts_total', {
      difficulty: difficulty.toString(),
      tenant_id: tenantId ?? 'none',
    });
  }
  setGauge('email_pool_low_watermark_duration_minutes', durationMinutes, {
    difficulty: difficulty.toString(),
    tenant_id: tenantId ?? 'none',
  });
};
