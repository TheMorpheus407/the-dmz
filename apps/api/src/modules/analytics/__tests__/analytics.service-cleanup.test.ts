import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from './analytics.service.js';

import type { FastifyInstance } from 'fastify';
import type { DomainEvent } from '../../../shared/events/event-types.js';

const ANALYTICS_EVENT_TYPES = [
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
] as const;

describe('AnalyticsService event cleanup', () => {
  let mockFastify: FastifyInstance;
  let analyticsService: AnalyticsService;
  let subscribedEvents: Array<{ eventType: string; handler: (event: DomainEvent) => void }>;

  beforeEach(() => {
    subscribedEvents = [];

    const mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
    };

    mockFastify = {
      db: mockDb as never,
      eventBus: {
        subscribe: vi.fn((eventType: string, handler: (event: DomainEvent) => void) => {
          subscribedEvents.push({ eventType, handler });
        }),
        unsubscribe: vi.fn((eventType: string, handler: (event: DomainEvent) => void) => {
          subscribedEvents = subscribedEvents.filter(
            (sub) => !(sub.eventType === eventType && sub.handler === handler),
          );
        }),
      },
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    } as never;

    analyticsService = new AnalyticsService(mockFastify, { enabled: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('subscribeToEvents', () => {
    it('should subscribe to all analytics event types', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);

      expect(mockFastify.eventBus.subscribe).toHaveBeenCalledTimes(ANALYTICS_EVENT_TYPES.length);

      for (const eventType of ANALYTICS_EVENT_TYPES) {
        expect(mockFastify.eventBus.subscribe).toHaveBeenCalledWith(
          eventType,
          expect.any(Function),
        );
      }
    });

    it('should set subscribed flag to true after subscribing', () => {
      expect(analyticsService.isSubscribed()).toBe(false);

      analyticsService.subscribeToEvents(mockFastify.eventBus);

      expect(analyticsService.isSubscribed()).toBe(true);
    });

    it('should not subscribe again if already subscribed', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      mockFastify.eventBus.subscribe.mockClear();

      analyticsService.subscribeToEvents(mockFastify.eventBus);

      expect(mockFastify.eventBus.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeFromEvents', () => {
    it('should exist as a method on AnalyticsService', () => {
      expect(typeof analyticsService.unsubscribeFromEvents).toBe('function');
    });

    it('should call unsubscribe for each subscribed event', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      const subscribeCallCount = (mockFastify.eventBus.subscribe as ReturnType<typeof vi.fn>).mock
        .calls.length;

      analyticsService.unsubscribeFromEvents();

      expect(mockFastify.eventBus.unsubscribe).toHaveBeenCalledTimes(subscribeCallCount);
    });

    it('should unsubscribe from all event types that were subscribed', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      mockFastify.eventBus.unsubscribe.mockClear();

      analyticsService.unsubscribeFromEvents();

      for (const eventType of ANALYTICS_EVENT_TYPES) {
        expect(mockFastify.eventBus.unsubscribe).toHaveBeenCalledWith(
          eventType,
          expect.any(Function),
        );
      }
    });

    it('should reset the subscribed flag to false', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      expect(analyticsService.isSubscribed()).toBe(true);

      analyticsService.unsubscribeFromEvents();

      expect(analyticsService.isSubscribed()).toBe(false);
    });

    it('should be idempotent - calling twice should not error', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);

      expect(() => analyticsService.unsubscribeFromEvents()).not.toThrow();
      expect(() => analyticsService.unsubscribeFromEvents()).not.toThrow();
    });

    it('should only unsubscribe events once even when called twice', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      const _subscribeCallCount = (mockFastify.eventBus.subscribe as ReturnType<typeof vi.fn>).mock
        .calls.length;

      analyticsService.unsubscribeFromEvents();
      (mockFastify.eventBus.unsubscribe as ReturnType<typeof vi.fn>).mockClear();

      analyticsService.unsubscribeFromEvents();

      expect(mockFastify.eventBus.unsubscribe).not.toHaveBeenCalled();
    });

    it('should allow re-subscribing after unsubscribing', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      analyticsService.unsubscribeFromEvents();
      (mockFastify.eventBus.subscribe as ReturnType<typeof vi.fn>).mockClear();

      analyticsService.subscribeToEvents(mockFastify.eventBus);

      expect(mockFastify.eventBus.subscribe).toHaveBeenCalledTimes(ANALYTICS_EVENT_TYPES.length);
    });
  });

  describe('isSubscribed', () => {
    it('should return false initially', () => {
      expect(analyticsService.isSubscribed()).toBe(false);
    });

    it('should return true after subscribeToEvents', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      expect(analyticsService.isSubscribed()).toBe(true);
    });

    it('should return false after unsubscribeFromEvents', () => {
      analyticsService.subscribeToEvents(mockFastify.eventBus);
      analyticsService.unsubscribeFromEvents();
      expect(analyticsService.isSubscribed()).toBe(false);
    });
  });
});
