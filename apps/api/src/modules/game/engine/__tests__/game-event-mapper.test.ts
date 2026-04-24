import { describe, expect, it, vi, beforeEach } from 'vitest';

import { GameEventMapper } from '../game-event-mapper.js';
import { GAME_ENGINE_EVENTS } from '../engine.events.js';

import type { EventBus } from '../../../../shared/events/event-types.js';

describe('GameEventMapper - mapToDomainEvents', () => {
  let mapper: GameEventMapper;

  beforeEach(() => {
    mapper = new GameEventMapper();
  });

  const mockEvents: Array<{
    eventId: string;
    eventType: string;
    timestamp: string;
    payload: Record<string, unknown>;
  }> = [
    {
      eventId: 'event-1',
      eventType: GAME_ENGINE_EVENTS.SESSION_STARTED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', userId: 'user-1', tenantId: 'tenant-1', day: 1, seed: 123 },
    },
    {
      eventId: 'event-2',
      eventType: GAME_ENGINE_EVENTS.SESSION_PAUSED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', userId: 'user-1' },
    },
    {
      eventId: 'event-3',
      eventType: GAME_ENGINE_EVENTS.SESSION_RESUMED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', userId: 'user-1' },
    },
    {
      eventId: 'event-4',
      eventType: GAME_ENGINE_EVENTS.SESSION_COMPLETED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', userId: 'user-1', reason: 'completed' },
    },
    {
      eventId: 'event-5',
      eventType: GAME_ENGINE_EVENTS.SESSION_ABANDONED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', userId: 'user-1', reason: 'abandoned' },
    },
    {
      eventId: 'event-6',
      eventType: GAME_ENGINE_EVENTS.DAY_STARTED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', day: 1 },
    },
    {
      eventId: 'event-7',
      eventType: GAME_ENGINE_EVENTS.DAY_ENDED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', day: 1 },
    },
    {
      eventId: 'event-8',
      eventType: GAME_ENGINE_EVENTS.EMAIL_OPENED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', emailId: 'email-1' },
    },
    {
      eventId: 'event-9',
      eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED,
      timestamp: new Date().toISOString(),
      payload: {
        sessionId: 'sess-1',
        emailId: 'email-1',
        decision: 'approve',
        timeSpentMs: 1000,
      },
    },
    {
      eventId: 'event-10',
      eventType: GAME_ENGINE_EVENTS.INCIDENT_CREATED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', incidentId: 'inc-1', severity: 5, type: 'breach' },
    },
    {
      eventId: 'event-11',
      eventType: GAME_ENGINE_EVENTS.BREACH_OCCURRED,
      timestamp: new Date().toISOString(),
      payload: { sessionId: 'sess-1', userId: 'user-1', severity: 8 },
    },
  ];

  it('maps all known event types to domain events', () => {
    const result = mapper.mapToDomainEvents(mockEvents, 'user-123', 'tenant-456');
    expect(result).toHaveLength(11);
  });

  it('filters out unknown event types', () => {
    const eventsWithUnknown = [
      ...mockEvents,
      {
        eventId: 'event-unknown',
        eventType: 'game.unknown.event',
        timestamp: new Date().toISOString(),
        payload: {},
      },
    ];
    const result = mapper.mapToDomainEvents(eventsWithUnknown, 'user-123', 'tenant-456');
    expect(result).toHaveLength(11);
  });

  it('returns empty array for empty input', () => {
    const result = mapper.mapToDomainEvents([], 'user-123', 'tenant-456');
    expect(result).toHaveLength(0);
  });

  it('sets source to game-engine for all events', () => {
    const result = mapper.mapToDomainEvents(mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { source: string }).source).toBe('game-engine');
    }
  });

  it('sets correlationId for all events', () => {
    const result = mapper.mapToDomainEvents(mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { correlationId: string }).correlationId).toBeDefined();
      expect((event as { correlationId: string }).correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });

  it('sets tenantId from parameters', () => {
    const result = mapper.mapToDomainEvents(mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { tenantId: string }).tenantId).toBe('tenant-456');
    }
  });

  it('sets userId from parameters', () => {
    const result = mapper.mapToDomainEvents(mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { userId: string }).userId).toBe('user-123');
    }
  });

  it('sets version to 1 for all events', () => {
    const result = mapper.mapToDomainEvents(mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { version: number }).version).toBe(1);
    }
  });

  it('preserves eventType in mapped events', () => {
    const result = mapper.mapToDomainEvents(mockEvents, 'user-123', 'tenant-456');
    const eventTypes = result.map((e: unknown) => (e as { eventType: string }).eventType);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_STARTED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_PAUSED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_RESUMED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_COMPLETED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_ABANDONED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.DAY_STARTED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.DAY_ENDED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.EMAIL_OPENED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.INCIDENT_CREATED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.BREACH_OCCURRED);
  });

  it('maps game.session.started event correctly', () => {
    const sessionEvent = mockEvents[0]!;
    const result = mapper.mapToDomainEvents([sessionEvent], 'user-123', 'tenant-456');
    expect(result).toHaveLength(1);
    const mapped = result[0] as { eventType: string; payload: { sessionId: string; day: number } };
    expect(mapped.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_STARTED);
    expect(mapped.payload.sessionId).toBe('sess-1');
    expect(mapped.payload.day).toBe(1);
  });

  it('maps game.email.decision_submitted event correctly', () => {
    const emailEvent = mockEvents[8]!;
    const result = mapper.mapToDomainEvents([emailEvent], 'user-123', 'tenant-456');
    expect(result).toHaveLength(1);
    const mapped = result[0] as {
      eventType: string;
      payload: { sessionId: string; emailId: string; decision: string; timeSpentMs: number };
    };
    expect(mapped.eventType).toBe(GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED);
    expect(mapped.payload.sessionId).toBe('sess-1');
    expect(mapped.payload.emailId).toBe('email-1');
    expect(mapped.payload.decision).toBe('approve');
    expect(mapped.payload.timeSpentMs).toBe(1000);
  });

  it('maps game.breach.occurred event correctly', () => {
    const breachEvent = mockEvents[10]!;
    const result = mapper.mapToDomainEvents([breachEvent], 'user-123', 'tenant-456');
    expect(result).toHaveLength(1);
    const mapped = result[0] as { eventType: string; payload: { severity: number } };
    expect(mapped.eventType).toBe(GAME_ENGINE_EVENTS.BREACH_OCCURRED);
    expect(mapped.payload.severity).toBe(8);
  });

  it('maps multiple events correctly', () => {
    const mixedEvents = [
      {
        eventId: 'event-a',
        eventType: GAME_ENGINE_EVENTS.SESSION_STARTED,
        timestamp: new Date().toISOString(),
        payload: { sessionId: 'sess-1', userId: 'user-1', tenantId: 'tenant-1', day: 1, seed: 123 },
      },
      mockEvents[1]!,
    ];
    const result = mapper.mapToDomainEvents(mixedEvents, 'user-123', 'tenant-456');
    expect(result).toHaveLength(2);
  });
});

describe('GameEventMapper - publishEvents', () => {
  let mockEventBus: EventBus;

  beforeEach(() => {
    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
  });

  it('publishes all events to eventBus when provided', () => {
    const mapper = new GameEventMapper();
    const events = [
      { eventType: 'test.event.1', payload: {} },
      { eventType: 'test.event.2', payload: {} },
    ];
    mapper.publishEvents(mockEventBus, events);
    expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    expect(mockEventBus.publish).toHaveBeenCalledWith(events[0]);
    expect(mockEventBus.publish).toHaveBeenCalledWith(events[1]);
  });

  it('does not throw when eventBus is undefined', () => {
    const mapper = new GameEventMapper();
    const events = [{ eventType: 'test.event', payload: {} }];
    expect(() => mapper.publishEvents(undefined, events)).not.toThrow();
  });

  it('does not call publish when events array is empty', () => {
    const mapper = new GameEventMapper();
    mapper.publishEvents(mockEventBus, []);
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
