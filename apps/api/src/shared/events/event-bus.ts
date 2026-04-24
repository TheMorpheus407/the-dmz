import { EventEmitter } from 'node:events';

import { isValidGameEventType } from '@the-dmz/shared';

import { toIsoString } from '../utils/date.js';
import { generateId } from '../utils/id.js';

import type { DomainEvent, EventHandler, EventBus } from './event-types.js';

interface EventBusLogger {
  error: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
}

interface EventBusOptions {
  logger?: EventBusLogger;
  maxListeners?: number;
  validateEventTypes?: boolean;
}

type AnyDomainEvent = DomainEvent<unknown>;
type AnyEventHandler = EventHandler<unknown>;
type WrappedEventHandler = (event: AnyDomainEvent) => void;

const NOOP_LOGGER: EventBusLogger = {
  error: () => undefined,
  warn: () => undefined,
};

export class DefaultEventBus implements EventBus {
  private readonly emitter = new EventEmitter();
  private readonly logger: EventBusLogger;
  private readonly wrappedHandlers = new Map<string, Map<AnyEventHandler, WrappedEventHandler>>();
  private readonly validateEventTypes: boolean;

  public constructor(options: EventBusOptions = {}) {
    this.logger = { ...NOOP_LOGGER, ...options.logger };
    this.emitter.setMaxListeners(options.maxListeners ?? 100);
    this.validateEventTypes = options.validateEventTypes ?? false;

    // Ensure reserved "error" events never throw when no subscribers are present.
    this.emitter.on('error', () => undefined);
  }

  public publish<T>(event: DomainEvent<T>): void {
    if (this.validateEventTypes) {
      if (!isValidGameEventType(event.eventType)) {
        const error = new Error(`Unknown event type: ${event.eventType}`);
        this.logger.warn?.(
          {
            eventType: event.eventType,
            message: 'Unknown event type',
          },
          error.message,
        );
        throw error;
      }
    }
    this.emitter.emit(event.eventType, event as AnyDomainEvent);
  }

  public subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    const typedHandler = handler as AnyEventHandler;
    const eventHandlers =
      this.wrappedHandlers.get(eventType) ?? new Map<AnyEventHandler, WrappedEventHandler>();

    if (!this.wrappedHandlers.has(eventType)) {
      this.wrappedHandlers.set(eventType, eventHandlers);
    }

    if (eventHandlers.has(typedHandler)) {
      return;
    }

    const wrappedHandler = this.wrapHandler(typedHandler);
    eventHandlers.set(typedHandler, wrappedHandler);
    this.emitter.on(eventType, wrappedHandler);
  }

  public unsubscribe<T>(eventType: string, handler: EventHandler<T>): void {
    const eventHandlers = this.wrappedHandlers.get(eventType);
    if (!eventHandlers) {
      return;
    }

    const typedHandler = handler as AnyEventHandler;
    const wrappedHandler = eventHandlers.get(typedHandler);
    if (!wrappedHandler) {
      return;
    }

    this.emitter.off(eventType, wrappedHandler);
    eventHandlers.delete(typedHandler);

    if (eventHandlers.size === 0) {
      this.wrappedHandlers.delete(eventType);
    }
  }

  private wrapHandler(handler: AnyEventHandler): WrappedEventHandler {
    return (event) => {
      try {
        const result = handler(event);
        if (result && typeof result.then === 'function') {
          void Promise.resolve(result).catch((error: unknown) => {
            this.logHandlerError(error, event);
          });
        }
      } catch (error) {
        this.logHandlerError(error, event);
      }
    };
  }

  private logHandlerError(error: unknown, event: AnyDomainEvent): void {
    this.logger.error(
      {
        err: error,
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        correlationId: event.correlationId,
        tenantId: event.tenantId,
        userId: event.userId,
        source: event.source,
        version: event.version,
      },
      'Event handler failed',
    );
  }
}

export const createDomainEvent = <T>(
  params: Omit<DomainEvent<T>, 'eventId' | 'timestamp'>,
): DomainEvent<T> => ({
  ...params,
  eventId: generateId(),
  timestamp: toIsoString(),
});
