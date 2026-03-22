import { describe, expect, it, vi, beforeEach } from 'vitest';

import { GameEngineService } from '../engine.service.js';
import { GAME_ENGINE_EVENTS } from '../engine.events.js';

import type { IEventBus } from '../../../../shared/events/event-types.js';

describe('mapToDomainEvents', () => {
  let mockEventBus: IEventBus;
  let service: GameEngineService;

  beforeEach(() => {
    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
    service = new GameEngineService(mockEventBus);
  });

  const mockEvents: Array<{
    eventId: string;
    eventType: string;
    timestamp: string;
    payload: Record<string, unknown>;
  }> = [
    {
      eventId: '1',
      eventType: GAME_ENGINE_EVENTS.SESSION_STARTED,
      timestamp: '2024-01-01T00:00:00Z',
      payload: { sessionId: 's1', userId: 'u1', tenantId: 't1', day: 1, seed: 123 },
    },
    {
      eventId: '2',
      eventType: GAME_ENGINE_EVENTS.SESSION_PAUSED,
      timestamp: '2024-01-01T00:01:00Z',
      payload: { sessionId: 's1', userId: 'u1' },
    },
    {
      eventId: '3',
      eventType: GAME_ENGINE_EVENTS.SESSION_RESUMED,
      timestamp: '2024-01-01T00:02:00Z',
      payload: { sessionId: 's1', userId: 'u1' },
    },
    {
      eventId: '4',
      eventType: GAME_ENGINE_EVENTS.SESSION_ABANDONED,
      timestamp: '2024-01-01T00:03:00Z',
      payload: { sessionId: 's1', userId: 'u1', reason: 'user quit' },
    },
    {
      eventId: '5',
      eventType: GAME_ENGINE_EVENTS.DAY_STARTED,
      timestamp: '2024-01-01T00:04:00Z',
      payload: { sessionId: 's1', day: 2 },
    },
    {
      eventId: '6',
      eventType: GAME_ENGINE_EVENTS.DAY_ENDED,
      timestamp: '2024-01-01T00:05:00Z',
      payload: { sessionId: 's1', day: 1 },
    },
    {
      eventId: '7',
      eventType: GAME_ENGINE_EVENTS.EMAIL_OPENED,
      timestamp: '2024-01-01T00:06:00Z',
      payload: { sessionId: 's1', emailId: 'e1' },
    },
    {
      eventId: '8',
      eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED,
      timestamp: '2024-01-01T00:07:00Z',
      payload: { sessionId: 's1', emailId: 'e1', decision: 'safe', timeSpentMs: 5000 },
    },
    {
      eventId: '9',
      eventType: GAME_ENGINE_EVENTS.INCIDENT_CREATED,
      timestamp: '2024-01-01T00:08:00Z',
      payload: { sessionId: 's1', incidentId: 'i1', severity: 3, type: 'phishing' },
    },
    {
      eventId: '10',
      eventType: GAME_ENGINE_EVENTS.INCIDENT_RESOLVED,
      timestamp: '2024-01-01T00:09:00Z',
      payload: { sessionId: 's1', incidentId: 'i1', responseActions: ['blocked'] },
    },
    {
      eventId: '11',
      eventType: GAME_ENGINE_EVENTS.BREACH_OCCURRED,
      timestamp: '2024-01-01T00:10:00Z',
      payload: { sessionId: 's1', userId: 'u1', severity: 5 },
    },
  ];

  it('maps all known event types to domain events', () => {
    const result = service['mapToDomainEvents'](mockEvents, 'user-123', 'tenant-456');
    expect(result).toHaveLength(11);
  });

  it('filters out unknown event types', () => {
    const eventsWithUnknown = [
      ...mockEvents,
      {
        eventId: '12',
        eventType: 'game.unknown.event',
        timestamp: '2024-01-01T00:11:00Z',
        payload: {},
      },
    ];
    const result = service['mapToDomainEvents'](eventsWithUnknown, 'user-123', 'tenant-456');
    expect(result).toHaveLength(11);
  });

  it('returns empty array for empty input', () => {
    const result = service['mapToDomainEvents']([], 'user-123', 'tenant-456');
    expect(result).toHaveLength(0);
  });

  it('sets source to game-engine for all events', () => {
    const result = service['mapToDomainEvents'](mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { source: string }).source).toBe('game-engine');
    }
  });

  it('sets correlationId for all events', () => {
    const result = service['mapToDomainEvents'](mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { correlationId: string }).correlationId).toBeDefined();
      expect((event as { correlationId: string }).correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });

  it('sets tenantId from parameters', () => {
    const result = service['mapToDomainEvents'](mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { tenantId: string }).tenantId).toBe('tenant-456');
    }
  });

  it('sets userId from parameters', () => {
    const result = service['mapToDomainEvents'](mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { userId: string }).userId).toBe('user-123');
    }
  });

  it('sets version to 1 for all events', () => {
    const result = service['mapToDomainEvents'](mockEvents, 'user-123', 'tenant-456');
    for (const event of result) {
      expect((event as { version: number }).version).toBe(1);
    }
  });

  it('preserves eventType in mapped events', () => {
    const result = service['mapToDomainEvents'](mockEvents, 'user-123', 'tenant-456');
    const eventTypes = result.map((e) => (e as { eventType: string }).eventType);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_STARTED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_PAUSED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_RESUMED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.SESSION_ABANDONED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.DAY_STARTED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.DAY_ENDED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.EMAIL_OPENED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.INCIDENT_CREATED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.INCIDENT_RESOLVED);
    expect(eventTypes).toContain(GAME_ENGINE_EVENTS.BREACH_OCCURRED);
  });

  it('maps game.session.started event correctly', () => {
    const sessionEvent = mockEvents[0]!;
    const result = service['mapToDomainEvents']([sessionEvent], 'user-123', 'tenant-456');
    expect(result).toHaveLength(1);
    const mapped = result[0] as { eventType: string; payload: { sessionId: string; day: number } };
    expect(mapped.eventType).toBe(GAME_ENGINE_EVENTS.SESSION_STARTED);
    expect(mapped.payload.sessionId).toBe('s1');
    expect(mapped.payload.day).toBe(1);
  });

  it('maps game.email.decision_submitted event correctly', () => {
    const emailEvent = mockEvents[7]!;
    const result = service['mapToDomainEvents']([emailEvent], 'user-123', 'tenant-456');
    expect(result).toHaveLength(1);
    const mapped = result[0] as {
      eventType: string;
      payload: { emailId: string; decision: string };
    };
    expect(mapped.eventType).toBe(GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED);
    expect(mapped.payload.emailId).toBe('e1');
    expect(mapped.payload.decision).toBe('safe');
  });

  it('maps game.breach.occurred event correctly', () => {
    const breachEvent = mockEvents[10]!;
    const result = service['mapToDomainEvents']([breachEvent], 'user-123', 'tenant-456');
    expect(result).toHaveLength(1);
    const mapped = result[0] as { eventType: string; payload: { severity: number } };
    expect(mapped.eventType).toBe(GAME_ENGINE_EVENTS.BREACH_OCCURRED);
    expect(mapped.payload.severity).toBe(5);
  });

  it('handles mixed known and unknown events', () => {
    const mixedEvents: Array<{
      eventId: string;
      eventType: string;
      timestamp: string;
      payload: Record<string, unknown>;
    }> = [
      mockEvents[0]!,
      {
        eventId: 'unknown',
        eventType: 'game.unknown.type',
        timestamp: '2024-01-01T00:00:00Z',
        payload: {},
      },
      mockEvents[1]!,
    ];
    const result = service['mapToDomainEvents'](mixedEvents, 'user-123', 'tenant-456');
    expect(result).toHaveLength(2);
  });
});
