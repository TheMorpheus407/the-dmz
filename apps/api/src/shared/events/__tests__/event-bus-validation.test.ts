import { describe, expect, it, vi } from 'vitest';

import { GAME_EVENT_TYPES, isValidGameEventType } from '@the-dmz/shared';

import { DefaultEventBus, createDomainEvent } from '../event-bus.js';
import { GAME_ENGINE_EVENTS } from '../../../modules/game/engine/events/shared-types.js';

import type { DomainEvent } from '../event-types.js';

const createGameTestEvent = (
  eventType: string,
  payload: Record<string, unknown> = {},
): DomainEvent<Record<string, unknown>> =>
  createDomainEvent({
    eventType,
    correlationId: '0194d2e5-8af5-7eb6-8d2b-cf70a9f8f6de',
    tenantId: '0194d2e5-8af5-7f1d-8f7f-cf70a9f8f6dd',
    userId: '0194d2e5-8af5-7d22-8f7a-cf70a9f8f6dc',
    source: 'game',
    payload,
    version: 1,
  });

describe('EventBus event type validation', () => {
  describe('validateEventTypes option', () => {
    it('should reject publishing unknown event types when validation is enabled', () => {
      const logger = { error: vi.fn(), warn: vi.fn() };
      const bus = new DefaultEventBus({ logger, validateEventTypes: true });
      const unknownEvent = createGameTestEvent('unknown.event.type');

      expect(() => bus.publish(unknownEvent)).toThrow();
    });

    it('should allow publishing known game event types when validation is enabled', () => {
      const logger = { error: vi.fn(), warn: vi.fn() };
      const bus = new DefaultEventBus({ logger, validateEventTypes: true });
      const knownEvent = createGameTestEvent(GAME_EVENT_TYPES.SESSION_STARTED);

      expect(() => bus.publish(knownEvent)).not.toThrow();
    });

    it('should allow publishing any event type when validation is disabled (default)', () => {
      const bus = new DefaultEventBus();
      const unknownEvent = createGameTestEvent('unknown.event.type');

      expect(() => bus.publish(unknownEvent)).not.toThrow();
    });
  });

  describe('EventBus with validateKnownEventTypes', () => {
    it('should warn when publishing event types not in GAME_EVENT_TYPE_ARRAY', () => {
      const warnLogger = { error: vi.fn(), warn: vi.fn() };
      const bus = new DefaultEventBus({ logger: warnLogger, validateEventTypes: true });
      const handler = vi.fn();
      bus.subscribe('unknown.event.type', handler);

      const unknownEvent = createGameTestEvent('unknown.event.type');
      bus.publish(unknownEvent);

      expect(warnLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'unknown.event.type',
        }),
        expect.stringContaining('Unknown event type'),
      );
    });

    it('should not warn when publishing known event types', () => {
      const warnLogger = { error: vi.fn(), warn: vi.fn() };
      const bus = new DefaultEventBus({ logger: warnLogger, validateEventTypes: true });
      const handler = vi.fn();
      bus.subscribe(GAME_EVENT_TYPES.SESSION_STARTED, handler);

      const knownEvent = createGameTestEvent(GAME_EVENT_TYPES.SESSION_STARTED);
      bus.publish(knownEvent);

      expect(warnLogger.warn).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('isValidGameEventType integration with EventBus', () => {
  it('should correctly identify all GAME_ENGINE_EVENTS as valid game event types after unification', () => {
    const engineEventValues = Object.values(GAME_ENGINE_EVENTS) as readonly string[];

    const invalidEvents = engineEventValues.filter(
      (eventValue) => !isValidGameEventType(eventValue),
    );

    expect(invalidEvents).toHaveLength(0);
  });

  it('should handle logger without warn method gracefully', () => {
    const loggerWithoutWarn = { error: vi.fn() };
    const bus = new DefaultEventBus({ logger: loggerWithoutWarn, validateEventTypes: true });
    const unknownEvent = createGameTestEvent('unknown.event.type');

    expect(() => bus.publish(unknownEvent)).toThrow();
    expect(loggerWithoutWarn.error).toHaveBeenCalled();
  });
});
