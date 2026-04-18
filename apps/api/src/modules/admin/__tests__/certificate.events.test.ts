import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDomainEvent } from '../../../shared/events/event-bus.js';
import {
  registerCertificateEventHandlers,
  unregisterCertificateEventHandlers,
} from '../certificate.events.js';

import type { DomainEvent } from '../../../shared/events/event-types.js';
import type { IEventBus } from '../../../shared/events/event-types.js';

const SESSION_COMPLETED_EVENT = 'game.session.completed';

describe('certificate.events cleanup', () => {
  let mockEventBus: IEventBus;
  let subscriptions: Map<string, Set<(event: DomainEvent) => void>>;

  beforeEach(() => {
    subscriptions = new Map<string, Set<(event: DomainEvent) => void>>();

    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn((eventType: string, h: (event: DomainEvent) => void) => {
        if (!subscriptions.has(eventType)) {
          subscriptions.set(eventType, new Set());
        }
        subscriptions.get(eventType)!.add(h);
      }),
      unsubscribe: vi.fn((eventType: string, h: (event: DomainEvent) => void) => {
        subscriptions.get(eventType)?.delete(h);
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerCertificateEventHandlers', () => {
    it('should return the handler function for later cleanup', () => {
      const returnedHandler = registerCertificateEventHandlers(mockEventBus);

      expect(returnedHandler).toBeDefined();
      expect(typeof returnedHandler).toBe('function');
    });

    it('should subscribe to game.session.completed event', () => {
      registerCertificateEventHandlers(mockEventBus);

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(1);
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        SESSION_COMPLETED_EVENT,
        expect.any(Function),
      );
    });
  });

  describe('unregisterCertificateEventHandlers', () => {
    it('should exist and be callable', () => {
      expect(typeof unregisterCertificateEventHandlers).toBe('function');
    });

    it('should accept a handler parameter and call eventBus.unsubscribe with the same handler', () => {
      const handlerFn = registerCertificateEventHandlers(mockEventBus);
      unregisterCertificateEventHandlers(mockEventBus, handlerFn);

      expect(mockEventBus.unsubscribe).toHaveBeenCalledTimes(1);
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith(SESSION_COMPLETED_EVENT, handlerFn);
    });

    it('should use the EXACT same handler instance returned from register', () => {
      const handlerFn = registerCertificateEventHandlers(mockEventBus);

      unregisterCertificateEventHandlers(mockEventBus, handlerFn);

      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith(SESSION_COMPLETED_EVENT, handlerFn);
    });

    it('should remove the handler such that subsequent events do not trigger the original handler', () => {
      let subscribedHandler: ((event: DomainEvent) => void) | undefined;

      mockEventBus.subscribe = vi.fn((eventType: string, h: (event: DomainEvent) => void) => {
        subscribedHandler = h;
        if (!subscriptions.has(eventType)) {
          subscriptions.set(eventType, new Set());
        }
        subscriptions.get(eventType)!.add(h);
      });

      const handlerFn = registerCertificateEventHandlers(mockEventBus);

      const testEvent = createDomainEvent({
        eventType: SESSION_COMPLETED_EVENT,
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant',
        userId: 'test-user',
        source: 'test-source',
        payload: {
          sessionId: 'test-session',
          userId: 'test-user',
          reason: 'completed',
        },
        version: 1,
      });

      subscribedHandler?.(testEvent);
      expect(handlerFn).toHaveBeenCalledTimes(1);

      handlerFn.mockClear();

      unregisterCertificateEventHandlers(mockEventBus, handlerFn);

      const unsubscribeCalls = (mockEventBus.unsubscribe as ReturnType<typeof vi.fn>).mock.calls;
      const unsubscribedHandler = unsubscribeCalls[0]?.[1];

      subscriptions
        .get(SESSION_COMPLETED_EVENT)
        ?.delete(unsubscribedHandler as (event: DomainEvent) => void);

      const eventAfterCleanup = createDomainEvent({
        eventType: SESSION_COMPLETED_EVENT,
        correlationId: 'test-correlation-id-2',
        tenantId: 'test-tenant',
        userId: 'test-user',
        source: 'test-source',
        payload: {
          sessionId: 'test-session-2',
          userId: 'test-user',
          reason: 'completed',
        },
        version: 1,
      });

      subscribedHandler?.(eventAfterCleanup);
      expect(handlerFn).not.toHaveBeenCalled();
    });
  });

  describe('register -> unregister cycle', () => {
    it('should allow multiple register/unregister cycles', () => {
      const handler1 = registerCertificateEventHandlers(mockEventBus);
      unregisterCertificateEventHandlers(mockEventBus, handler1);

      const handler2 = registerCertificateEventHandlers(mockEventBus);
      unregisterCertificateEventHandlers(mockEventBus, handler2);

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
      expect(mockEventBus.unsubscribe).toHaveBeenCalledTimes(2);
    });
  });
});
