import { describe, it, expect } from 'vitest';

import { createGameEvent } from '../handler-utils.js';

import type { DomainEvent } from '../handler-utils.js';

describe('createGameEvent', () => {
  it('should create an event with a valid UUID', () => {
    const event = createGameEvent('game.test.event', {}, '2024-01-01T00:00:00.000Z');

    expect(event.eventId).toBeDefined();
    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should create an event with the correct eventType', () => {
    const eventType = 'game.session.paused' as const;
    const event = createGameEvent(eventType, {}, '2024-01-01T00:00:00.000Z');

    expect(event.eventType).toBe('game.session.paused');
  });

  it('should create an event with the correct timestamp', () => {
    const timestamp = '2024-06-15T12:30:00.000Z';
    const event = createGameEvent('game.test.event', {}, timestamp);

    expect(event.timestamp).toBe('2024-06-15T12:30:00.000Z');
  });

  it('should create an event with the provided payload', () => {
    const payload = { userId: 'user-123', action: 'test' };
    const event = createGameEvent('game.test.event', payload, '2024-01-01T00:00:00.000Z');

    expect(event.payload).toEqual({ userId: 'user-123', action: 'test' });
  });

  it('should return an object that satisfies DomainEvent interface', () => {
    const event = createGameEvent('game.email.received', { emailId: 'email-1' }, '2024-01-01T00:00:00.000Z');

    const _typeCheck: DomainEvent = event;
    expect(_typeCheck.eventId).toBeDefined();
    expect(_typeCheck.eventType).toBe('game.email.received');
    expect(_typeCheck.timestamp).toBe('2024-01-01T00:00:00.000Z');
    expect(_typeCheck.payload).toEqual({ emailId: 'email-1' });
  });

  it('should create unique eventIds for multiple events', () => {
    const timestamp = '2024-01-01T00:00:00.000Z';
    const event1 = createGameEvent('game.test.event1', {}, timestamp);
    const event2 = createGameEvent('game.test.event2', {}, timestamp);
    const event3 = createGameEvent('game.test.event3', {}, timestamp);

    expect(event1.eventId).not.toBe(event2.eventId);
    expect(event2.eventId).not.toBe(event3.eventId);
    expect(event1.eventId).not.toBe(event3.eventId);
  });

  it('should handle empty payload objects', () => {
    const event = createGameEvent('game.session.started', {}, '2024-01-01T00:00:00.000Z');

    expect(event.eventType).toBe('game.session.started');
    expect(event.payload).toEqual({});
  });

  it('should handle complex nested payload objects', () => {
    const complexPayload = {
      user: { id: 'user-1', name: 'Test User' },
      nested: { deep: { value: 42 } },
      array: [1, 2, 3],
    };
    const event = createGameEvent('game.test.complex', complexPayload, '2024-01-01T00:00:00.000Z');

    expect(event.payload).toEqual(complexPayload);
  });

  it('should handle string payload', () => {
    const event = createGameEvent('game.test.string', 'simple string payload', '2024-01-01T00:00:00.000Z');

    expect(event.payload).toBe('simple string payload');
  });

  it('should handle null payload', () => {
    const event = createGameEvent('game.test.null', null, '2024-01-01T00:00:00.000Z');

    expect(event.payload).toBeNull();
  });

  it('should handle array payload', () => {
    const payload = [{ id: 1 }, { id: 2 }];
    const event = createGameEvent('game.test.array', payload, '2024-01-01T00:00:00.000Z');

    expect(event.payload).toEqual([{ id: 1 }, { id: 2 }]);
  });
});