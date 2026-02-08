import { describe, expect, it, vi } from 'vitest';

import { EventBus, createDomainEvent } from '../event-bus.js';

import type { DomainEvent } from '../event-types.js';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createTestEvent = (): DomainEvent<{ email: string }> => ({
  eventId: '0194d2e5-8af5-7b87-8d9b-cf70a9f8f6df',
  eventType: 'auth.user.created',
  timestamp: '2026-02-08T03:00:00.000Z',
  correlationId: '0194d2e5-8af5-7eb6-8d2b-cf70a9f8f6de',
  tenantId: '0194d2e5-8af5-7f1d-8f7f-cf70a9f8f6dd',
  userId: '0194d2e5-8af5-7d22-8f7a-cf70a9f8f6dc',
  source: 'auth',
  payload: {
    email: 'operator@example.invalid',
  },
  version: 1,
});

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('EventBus', () => {
  it('does not throw when publishing with no subscribers', () => {
    const bus = new EventBus();
    const event = createTestEvent();

    expect(() => bus.publish(event)).not.toThrow();
  });

  it('invokes subscribed handlers for matching event type', () => {
    const bus = new EventBus();
    const event = createTestEvent();
    const handler = vi.fn();

    bus.subscribe(event.eventType, handler);
    bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('invokes multiple handlers for the same event type', () => {
    const bus = new EventBus();
    const event = createTestEvent();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    bus.subscribe(event.eventType, firstHandler);
    bus.subscribe(event.eventType, secondHandler);
    bus.publish(event);

    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes only the targeted handler', () => {
    const bus = new EventBus();
    const event = createTestEvent();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    bus.subscribe(event.eventType, firstHandler);
    bus.subscribe(event.eventType, secondHandler);
    bus.unsubscribe(event.eventType, firstHandler);
    bus.publish(event);

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('catches and logs synchronous handler failures without blocking other handlers', () => {
    const logger = { error: vi.fn() };
    const bus = new EventBus({ logger });
    const event = createTestEvent();
    const failingHandler = vi.fn(() => {
      throw new Error('sync failure');
    });
    const successfulHandler = vi.fn();

    bus.subscribe(event.eventType, failingHandler);
    bus.subscribe(event.eventType, successfulHandler);
    bus.publish(event);

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(successfulHandler).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: event.eventId,
        eventType: event.eventType,
        source: event.source,
      }),
      'Event handler failed',
    );
  });

  it('catches and logs asynchronous handler failures without blocking other handlers', async () => {
    const logger = { error: vi.fn() };
    const bus = new EventBus({ logger });
    const event = createTestEvent();
    const failingHandler = vi.fn(async () => {
      throw new Error('async failure');
    });
    const successfulHandler = vi.fn();

    bus.subscribe(event.eventType, failingHandler);
    bus.subscribe(event.eventType, successfulHandler);
    bus.publish(event);
    await flushPromises();

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(successfulHandler).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: event.eventId,
        eventType: event.eventType,
        source: event.source,
      }),
      'Event handler failed',
    );
  });
});

describe('createDomainEvent', () => {
  it('auto-generates eventId and timestamp while preserving provided fields', () => {
    const event = createDomainEvent({
      eventType: 'analytics.training.module.completed',
      correlationId: '0194d2e5-8af5-7eb6-8d2b-cf70a9f8f6de',
      tenantId: '0194d2e5-8af5-7f1d-8f7f-cf70a9f8f6dd',
      userId: '0194d2e5-8af5-7d22-8f7a-cf70a9f8f6dc',
      source: 'analytics',
      payload: {
        moduleId: 'mod-42',
      },
      version: 1,
    });

    expect(event.eventId).toMatch(UUID_V7_REGEX);
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    expect(event).toMatchObject({
      eventType: 'analytics.training.module.completed',
      correlationId: '0194d2e5-8af5-7eb6-8d2b-cf70a9f8f6de',
      tenantId: '0194d2e5-8af5-7f1d-8f7f-cf70a9f8f6dd',
      userId: '0194d2e5-8af5-7d22-8f7a-cf70a9f8f6dc',
      source: 'analytics',
      payload: {
        moduleId: 'mod-42',
      },
      version: 1,
    });
  });
});
