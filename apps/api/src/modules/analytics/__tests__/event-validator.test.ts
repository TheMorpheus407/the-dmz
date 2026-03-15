import { describe, it, expect } from 'vitest';

import { validateIncomingEvent, isDuplicateEventError } from '../event-validator.js';

describe('validateIncomingEvent', () => {
  describe('valid events', () => {
    it('should validate a complete event', () => {
      const event = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        event_name: 'game.session.started',
        event_version: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440002',
        session_id: '550e8400-e29b-41d4-a716-446655440003',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
        payload: {
          difficulty_tier: 'tier_1',
          competency_tags: ['phishing_detection'],
          outcome: 'correct',
        },
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.eventId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.eventName).toBe('game.session.started');
      expect(result.errors).toHaveLength(0);
    });

    it('should extract event properties from payload', () => {
      const event = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        event_name: 'game.decision.approved',
        event_version: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440002',
        session_id: '550e8400-e29b-41d4-a716-446655440003',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
        payload: {
          difficulty_tier: 'tier_3',
          threat_tier: 'high',
          competency_tags: ['phishing_detection', 'data_handling'],
          outcome: 'correct',
          time_to_decision_ms: 5000,
        },
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.eventProperties).toEqual({
        difficulty_tier: 'tier_3',
        threat_tier: 'high',
        competency_tags: ['phishing_detection', 'data_handling'],
        outcome: 'correct',
        time_to_decision_ms: 5000,
      });
    });
  });

  describe('invalid events', () => {
    it('should reject event with missing required fields', () => {
      const event = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        event_name: 'game.session.started',
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid UUID', () => {
      const event = {
        event_id: 'invalid-uuid',
        event_name: 'game.session.started',
        event_version: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440002',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(false);
    });

    it('should reject event with invalid event version', () => {
      const event = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        event_name: 'game.session.started',
        event_version: -1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440002',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('should detect missing event_id', () => {
      const event = {
        event_name: 'game.session.started',
        event_version: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440002',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'event_id')).toBe(true);
    });

    it('should detect missing tenant_id', () => {
      const event = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        event_name: 'game.session.started',
        event_version: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'tenant_id')).toBe(true);
    });
  });
});

describe('isDuplicateEventError', () => {
  it('should detect duplicate key errors', () => {
    const error = new Error('duplicate key value violates unique constraint');
    expect(isDuplicateEventError(error)).toBe(true);
  });

  it('should detect unique constraint errors', () => {
    const error = { message: 'UNIQUE constraint failed: event_id' };
    expect(isDuplicateEventError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    const error = new Error('connection refused');
    expect(isDuplicateEventError(error)).toBe(false);
  });
});
