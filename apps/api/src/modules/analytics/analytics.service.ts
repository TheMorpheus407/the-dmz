import { generateId } from '../../shared/utils/id.js';
import { analyticsEvents, deadLetterQueue } from '../../db/schema/analytics/index.js';

import { DEFAULT_ANALYTICS_CONFIG } from './analytics.types.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { validateIncomingEvent, isDuplicateEventError } from './event-validator.js';

import type { FastifyInstance } from 'fastify';
import type { DomainEvent, EventHandler } from '../../shared/events/event-types.js';
import type { DB } from '../../shared/database/connection.js';
import type { AnalyticsConfig, AnalyticsMetrics } from './analytics.types.js';

interface QueuedEventData {
  eventId: string;
  correlationId: string;
  userId: string;
  tenantId: string;
  sessionId: string | null;
  eventName: string;
  eventVersion: number;
  eventTime: Date;
  source: string;
  environment: string;
  eventProperties: Record<string, unknown>;
  deviceInfo: Record<string, unknown> | null;
  geoInfo: Record<string, unknown> | null;
  createdAt: Date;
}

interface QueuedEvent {
  event: QueuedEventData;
  attempts: number;
  lastAttempt: Date;
  error?: string;
}

function getPayloadField(payload: Record<string, unknown>, field: string): unknown {
  return payload[field];
}

export class AnalyticsService {
  private readonly config: AnalyticsConfig;
  private readonly fastify: FastifyInstance;
  private readonly db: DB;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly eventQueue: QueuedEvent[] = [];
  private readonly metrics: AnalyticsMetrics;
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private subscribed = false;

  public constructor(fastify: FastifyInstance, config: Partial<AnalyticsConfig> = {}) {
    this.fastify = fastify;
    this.db = fastify.db;
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreakerFailureThreshold,
      this.config.circuitBreakerResetTimeoutMs,
    );
    this.metrics = {
      eventsIngested: 0,
      eventsFailed: 0,
      eventsRetried: 0,
      queueDepth: 0,
      processingLatencyMs: 0,
      lastProcessedAt: null,
    };
  }

  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.fastify.log.info('Analytics module is disabled');
      return;
    }

    this.startBatchProcessor();
    this.fastify.log.info(
      { batchSize: this.config.batchSize, batchIntervalMs: this.config.batchIntervalMs },
      'Analytics service initialized',
    );
  }

  public async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.eventQueue.length > 0) {
      this.fastify.log.info(
        { eventCount: this.eventQueue.length },
        'Flushing events before shutdown',
      );
      await this.processBatch();
    }
  }

  public subscribeToEvents(eventBus: {
    subscribe: (eventType: string, handler: EventHandler) => void;
  }): void {
    if (this.subscribed || !this.config.enabled) {
      return;
    }

    const handler: EventHandler = async (event: DomainEvent) => {
      await this.handleIncomingEvent(event);
    };

    const eventTypes = [
      'game.session.started',
      'game.session.ended',
      'game.session.paused',
      'game.session.resumed',
      'game.email.received',
      'game.email.opened',
      'game.email.indicator.marked',
      'game.email.header.viewed',
      'game.email.url.hovered',
      'game.email.attachment.previewed',
      'game.decision.approved',
      'game.decision.denied',
      'game.decision.flagged',
      'game.verification.packet_opened',
      'game.verification.result',
      'threat.attack.launched',
      'threat.attack.mitigated',
      'threat.attack.succeeded',
      'threat.breach.occurred',
      'threat.level.changed',
      'incident.response.action_taken',
    ];

    eventTypes.forEach((eventType) => {
      eventBus.subscribe(eventType, handler);
    });

    this.subscribed = true;
    this.fastify.log.info({ patterns: eventTypes }, 'Analytics subscribed to event bus');
  }

  private async handleIncomingEvent(event: DomainEvent): Promise<void> {
    if (!this.circuitBreaker.isAvailable()) {
      this.queueEventLocally(event);
      return;
    }

    const analyticsEvent = this.transformToAnalyticsEvent(event);

    if (!analyticsEvent.valid) {
      this.fastify.log.warn(
        { errors: analyticsEvent.errors, eventId: analyticsEvent.eventId },
        'Invalid analytics event received',
      );
      this.metrics.eventsFailed++;
      return;
    }

    this.queueEventLocally(event);
  }

  private transformToAnalyticsEvent(
    domainEvent: DomainEvent,
  ): ReturnType<typeof validateIncomingEvent> {
    const payload = domainEvent.payload as Record<string, unknown> | undefined;
    const envelope = {
      event_id: domainEvent.eventId,
      event_name: domainEvent.eventType,
      event_version: domainEvent.version,
      user_id: domainEvent.userId,
      tenant_id: domainEvent.tenantId,
      session_id: payload
        ? (getPayloadField(payload, 'sessionId') as string | undefined)
        : undefined,
      correlation_id: domainEvent.correlationId,
      timestamp: domainEvent.timestamp,
      source: domainEvent.source,
      environment: 'development',
      payload: domainEvent.payload,
    };

    return validateIncomingEvent(envelope);
  }

  private queueEventLocally(domainEvent: DomainEvent): void {
    if (this.eventQueue.length >= this.config.localQueueMaxSize) {
      this.fastify.log.warn('Analytics local queue full, dropping event');
      this.metrics.eventsFailed++;
      return;
    }

    const analyticsEvent = this.transformToAnalyticsEvent(domainEvent);

    const payload = domainEvent.payload as Record<string, unknown> | undefined;
    const payloadSessionId = payload
      ? (getPayloadField(payload, 'sessionId') as string | undefined)
      : undefined;

    const event: QueuedEventData = {
      eventId: analyticsEvent.eventId || generateId(),
      correlationId: analyticsEvent.correlationId || domainEvent.correlationId,
      userId: analyticsEvent.userId || domainEvent.userId,
      tenantId: analyticsEvent.tenantId || domainEvent.tenantId,
      sessionId: analyticsEvent.sessionId || payloadSessionId || null,
      eventName: analyticsEvent.eventName || domainEvent.eventType,
      eventVersion: analyticsEvent.eventVersion || domainEvent.version,
      eventTime: new Date(analyticsEvent.timestamp || domainEvent.timestamp),
      source: analyticsEvent.source || domainEvent.source,
      environment: 'development',
      eventProperties: analyticsEvent.eventProperties || {},
      deviceInfo: analyticsEvent.deviceInfo || null,
      geoInfo: analyticsEvent.geoInfo || null,
      createdAt: new Date(),
    };

    this.eventQueue.push({
      event,
      attempts: 0,
      lastAttempt: new Date(),
    });

    this.metrics.queueDepth = this.eventQueue.length;

    if (this.eventQueue.length >= this.config.batchSize) {
      this.processBatch().catch((err) => {
        this.fastify.log.error(err, 'Error processing analytics batch');
      });
    }
  }

  private startBatchProcessor(): void {
    const runBatch = () => {
      this.processBatch().catch((err) => {
        this.fastify.log.error(err, 'Error in batch processor');
      });
      this.batchTimer = setTimeout(runBatch, this.config.batchIntervalMs);
    };

    this.batchTimer = setTimeout(runBatch, this.config.batchIntervalMs);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      const batch = this.eventQueue.splice(0, this.config.batchSize);
      this.metrics.queueDepth = this.eventQueue.length;

      for (const queuedEvent of batch) {
        await this.persistEvent(queuedEvent);
      }

      this.metrics.processingLatencyMs = Date.now() - startTime;
      this.metrics.lastProcessedAt = new Date();
    } catch (error) {
      this.fastify.log.error(error, 'Error processing analytics batch');
      this.circuitBreaker.recordFailure();
    } finally {
      this.isProcessing = false;
    }
  }

  private async persistEvent(queuedEvent: QueuedEvent): Promise<void> {
    const { event, attempts } = queuedEvent;
    const maxRetries = this.config.maxRetries;

    try {
      this.fastify.log.debug(
        { eventId: event.eventId, eventName: event.eventName, attempt: attempts + 1 },
        'Persisting analytics event',
      );

      await this.db
        .insert(analyticsEvents)
        .values({
          eventId: event.eventId as never,
          correlationId: event.correlationId as never,
          userId: event.userId as never,
          tenantId: event.tenantId as never,
          sessionId: event.sessionId as never,
          eventName: event.eventName,
          eventVersion: event.eventVersion,
          eventTime: event.eventTime,
          source: event.source,
          environment: event.environment,
          eventProperties: event.eventProperties,
          deviceInfo: event.deviceInfo,
          geoInfo: event.geoInfo,
          createdAt: event.createdAt,
        })
        .onConflictDoNothing()
        .execute();

      this.metrics.eventsIngested++;
      this.circuitBreaker.recordSuccess();

      if (attempts > 0) {
        this.metrics.eventsRetried++;
      }
    } catch (error) {
      queuedEvent.attempts++;
      queuedEvent.lastAttempt = new Date();
      queuedEvent.error = error instanceof Error ? error.message : String(error);

      if (isDuplicateEventError(error)) {
        this.fastify.log.debug({ eventId: event.eventId }, 'Duplicate event, skipping');
        return;
      }

      if (queuedEvent.attempts >= maxRetries) {
        this.fastify.log.error(
          { eventId: event.eventId, error: queuedEvent.error },
          'Event failed after max retries',
        );
        this.metrics.eventsFailed++;
        await this.sendToDeadLetterQueue(event, queuedEvent.error);
      } else {
        this.eventQueue.push(queuedEvent);
        await this.delay(this.config.retryDelayMs * Math.pow(2, attempts));
      }
    }
  }

  private async sendToDeadLetterQueue(event: QueuedEventData, errorMessage: string): Promise<void> {
    if (!this.config.deadLetterQueueEnabled) {
      return;
    }

    this.fastify.log.warn(
      { eventId: event.eventId, error: errorMessage },
      'Sending event to dead-letter queue',
    );

    try {
      await this.db
        .insert(deadLetterQueue)
        .values({
          originalEvent: event as never,
          errorMessage: errorMessage,
          tenantId: event.tenantId as never,
        })
        .execute();
    } catch (dbError) {
      this.fastify.log.error(
        { eventId: event.eventId, error: dbError },
        'Failed to insert into dead-letter queue',
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getMetrics(): AnalyticsMetrics {
    return { ...this.metrics, queueDepth: this.eventQueue.length };
  }

  public getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  } {
    const circuitState = this.circuitBreaker.getState();
    const queueFull = this.eventQueue.length >= this.config.localQueueMaxSize * 0.9;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!this.circuitBreaker.isAvailable() || queueFull) {
      status = 'degraded';
    }

    if (
      circuitState.isOpen &&
      circuitState.failures >= this.config.circuitBreakerFailureThreshold * 2
    ) {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        circuitBreaker: circuitState,
        queueDepth: this.eventQueue.length,
        queueMaxSize: this.config.localQueueMaxSize,
        eventsIngested: this.metrics.eventsIngested,
        eventsFailed: this.metrics.eventsFailed,
        lastProcessedAt: this.metrics.lastProcessedAt,
      },
    };
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }
}
