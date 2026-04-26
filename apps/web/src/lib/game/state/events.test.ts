import { describe, it, expect } from 'vitest';

import { GAME_EVENT_TYPES, isValidGameEventType } from '@the-dmz/shared';

import { createGameEvent } from './events';

describe('GameEvent type consistency with shared package', () => {
  describe('GAME_EVENT_TYPES from @the-dmz/shared should be used', () => {
    it('should use shared SESSION_STARTED event type', () => {
      expect(GAME_EVENT_TYPES.SESSION_STARTED).toBe('game.session.started');
    });

    it('should use shared DAY_STARTED event type', () => {
      expect(GAME_EVENT_TYPES.DAY_STARTED).toBe('game.day.started');
    });

    it('should use shared EMAIL_RECEIVED event type', () => {
      expect(GAME_EVENT_TYPES.EMAIL_RECEIVED).toBe('game.email.received');
    });

    it('should use shared DECISION_APPROVED event type', () => {
      expect(GAME_EVENT_TYPES.DECISION_APPROVED).toBe('game.decision.approved');
    });

    it('should use shared SESSION_BREACH_RECOVERY event type', () => {
      expect(GAME_EVENT_TYPES.SESSION_BREACH_RECOVERY).toBe('game.session.breach_recovery');
    });
  });

  describe('createGameEvent should produce events with valid shared event types', () => {
    it('should create session_started event with correct dot notation type', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.SESSION_STARTED,
        payload: { userId: 'user-1', sessionId: 'session-1', seed: 123, difficulty: 'normal' },
        sessionId: 'session-1',
      });

      expect(event.type).toBe('game.session.started');
      expect(isValidGameEventType(event.type)).toBe(true);
    });

    it('should create day_started event with correct dot notation type', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.DAY_STARTED,
        payload: { day: 1 },
        sessionId: 'session-1',
        day: 1,
      });

      expect(event.type).toBe('game.day.started');
      expect(isValidGameEventType(event.type)).toBe(true);
    });

    it('should create email_received event with correct dot notation type', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.EMAIL_RECEIVED,
        payload: {
          emailId: 'email-1',
          sender: 'test@example.com',
          senderDomain: 'example.com',
          urgency: 'low' as const,
          faction: 'test',
        },
        sessionId: 'session-1',
        day: 1,
      });

      expect(event.type).toBe('game.email.received');
      expect(isValidGameEventType(event.type)).toBe(true);
    });

    it('should create decision_approved event with correct dot notation type', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.DECISION_APPROVED,
        payload: {
          decisionId: 'decision-1',
          emailId: 'email-1',
          decisionType: 'approve' as const,
          timeSpent: 5000,
          indicatorsUsed: ['urgent_sender'],
        },
        sessionId: 'session-1',
        day: 1,
      });

      expect(event.type).toBe('game.decision.approved');
      expect(isValidGameEventType(event.type)).toBe(true);
    });

    it('should create session_completed event with correct dot notation type', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.SESSION_COMPLETED,
        payload: { reason: 'all_days_completed' },
        sessionId: 'session-1',
      });

      expect(event.type).toBe('game.session.completed');
      expect(isValidGameEventType(event.type)).toBe(true);
    });

    it('should create breach_occurred event with correct dot notation type', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.BREACH_OCCURRED,
        payload: {
          breachId: 'breach-1',
          RansomCost: 50000,
          recoveryDays: 3,
          clientAttrition: 10,
        },
        sessionId: 'session-1',
        day: 5,
      });

      expect(event.type).toBe('game.breach.occurred');
      expect(isValidGameEventType(event.type)).toBe(true);
    });
  });

  describe('Event type validation', () => {
    it('should validate shared event types as valid', () => {
      expect(isValidGameEventType(GAME_EVENT_TYPES.SESSION_STARTED)).toBe(true);
      expect(isValidGameEventType(GAME_EVENT_TYPES.DAY_STARTED)).toBe(true);
      expect(isValidGameEventType(GAME_EVENT_TYPES.EMAIL_RECEIVED)).toBe(true);
      expect(isValidGameEventType(GAME_EVENT_TYPES.DECISION_APPROVED)).toBe(true);
      expect(isValidGameEventType(GAME_EVENT_TYPES.DECISION_DENIED)).toBe(true);
      expect(isValidGameEventType(GAME_EVENT_TYPES.SESSION_COMPLETED)).toBe(true);
      expect(isValidGameEventType(GAME_EVENT_TYPES.BREACH_OCCURRED)).toBe(true);
    });

    it('should reject snake_case event types as invalid', () => {
      expect(isValidGameEventType('session_started')).toBe(false);
      expect(isValidGameEventType('day_started')).toBe(false);
      expect(isValidGameEventType('email_received')).toBe(false);
      expect(isValidGameEventType('decision_approved')).toBe(false);
    });
  });

  describe('Event structure', () => {
    it('should create events with required properties', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.SESSION_STARTED,
        payload: { userId: 'user-1', sessionId: 'session-1', seed: 123, difficulty: 'normal' },
        sessionId: 'session-1',
      });

      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('occurredAt');
      expect(event).toHaveProperty('payload');
      expect(event).toHaveProperty('sessionId');
      expect(event.type).toBe(GAME_EVENT_TYPES.SESSION_STARTED);
    });

    it('should include optional day and phase when provided', () => {
      const event = createGameEvent({
        type: GAME_EVENT_TYPES.DAY_STARTED,
        payload: { day: 1 },
        sessionId: 'session-1',
        day: 1,
        phase: 'EMAIL_TRIAGE',
      });

      expect(event.day).toBe(1);
      expect(event.phase).toBe('EMAIL_TRIAGE');
    });
  });
});
