import type { FastifyInstance } from 'fastify';
import type { EventHandler } from '../../shared/events/event-types.js';
import type { AnalyticsEvent } from '../../db/schema/analytics/index.js';

export interface AnalyticsConfig {
  enabled: boolean;
  batchSize: number;
  batchIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  deadLetterQueueEnabled: boolean;
  circuitBreakerFailureThreshold: number;
  circuitBreakerResetTimeoutMs: number;
  localQueueMaxSize: number;
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: true,
  batchSize: 100,
  batchIntervalMs: 5000,
  maxRetries: 3,
  retryDelayMs: 1000,
  deadLetterQueueEnabled: true,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerResetTimeoutMs: 30000,
  localQueueMaxSize: 1000,
};

export interface QueuedEvent {
  event: AnalyticsEvent;
  attempts: number;
  lastAttempt: Date;
  error?: string;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
}

export interface AnalyticsMetrics {
  eventsIngested: number;
  eventsFailed: number;
  eventsRetried: number;
  queueDepth: number;
  processingLatencyMs: number;
  lastProcessedAt: Date | null;
}

export interface AnalyticsDependencies {
  fastify: FastifyInstance;
}

export type EventIngestionHandler = EventHandler<unknown>;

export interface AnalyticsEventPayload {
  event_name: string;
  event_version: number;
  user_id: string;
  tenant_id: string;
  session_id?: string;
  correlation_id: string;
  timestamp: string;
  source: string;
  environment?: string;
  payload?: Record<string, unknown>;
  device_info?: Record<string, unknown>;
  geo_info?: Record<string, unknown>;
}
