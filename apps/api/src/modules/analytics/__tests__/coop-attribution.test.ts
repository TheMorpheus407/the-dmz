import { describe, it, expect } from 'vitest';

import { validateIncomingEvent } from '../event-validator.js';

describe('validateIncomingEvent - Coop Party Attribution', () => {
  describe('valid events with party attribution', () => {
    it('should extract partyId and coopRole from valid coop event', () => {
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
        party_id: '550e8400-e29b-41d4-a716-446655440005',
        coop_role: 'triage_lead',
        payload: {
          sessionId: '550e8400-e29b-41d4-a716-446655440003',
          partyId: '550e8400-e29b-41d4-a716-446655440005',
          coopRole: 'triage_lead',
          emailId: 'email-123',
          decision: 'approve',
          timeToDecisionMs: 5000,
          outcome: 'correct',
          competencyTags: ['phishing_detection'],
        },
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.partyId).toBe('550e8400-e29b-41d4-a716-446655440005');
      expect(result.coopRole).toBe('triage_lead');
      expect(result.errors).toHaveLength(0);
    });

    it('should extract partyId and coopRole with verification_lead role', () => {
      const event = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        event_name: 'game.verification.packet_opened',
        event_version: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440002',
        session_id: '550e8400-e29b-41d4-a716-446655440003',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
        party_id: '550e8400-e29b-41d4-a716-446655440005',
        coop_role: 'verification_lead',
        payload: {
          sessionId: '550e8400-e29b-41d4-a716-446655440003',
          partyId: '550e8400-e29b-41d4-a716-446655440005',
          coopRole: 'verification_lead',
          emailId: 'email-456',
          packetId: 'packet-789',
        },
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.partyId).toBe('550e8400-e29b-41d4-a716-446655440005');
      expect(result.coopRole).toBe('verification_lead');
    });

    it('should extract partyId and coopRole with authority role', () => {
      const event = {
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        event_name: 'game.day.advanced',
        event_version: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440002',
        session_id: '550e8400-e29b-41d4-a716-446655440003',
        correlation_id: '550e8400-e29b-41d4-a716-446655440004',
        timestamp: '2026-03-15T10:00:00Z',
        source: 'game-engine',
        party_id: '550e8400-e29b-41d4-a716-446655440005',
        coop_role: 'authority',
        payload: {
          sessionId: '550e8400-e29b-41d4-a716-446655440003',
          partyId: '550e8400-e29b-41d4-a716-446655440005',
          coopRole: 'authority',
          day: 3,
        },
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.partyId).toBe('550e8400-e29b-41d4-a716-446655440005');
      expect(result.coopRole).toBe('authority');
    });

    it('should handle partyId as numeric string in payload', () => {
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
        party_id: '550e8400-e29b-41d4-a716-446655440005',
        coop_role: 'triage_lead',
        payload: {
          sessionId: '550e8400-e29b-41d4-a716-446655440003',
          partyId: '550e8400-e29b-41d4-a716-446655440005',
          coopRole: 'triage_lead',
          emailId: 'email-123',
          decision: 'approve',
        },
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.partyId).toBe('550e8400-e29b-41d4-a716-446655440005');
      expect(result.coopRole).toBe('triage_lead');
    });
  });

  describe('events without party attribution', () => {
    it('should return undefined partyId and coopRole for single-player event', () => {
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
        },
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.partyId).toBeUndefined();
      expect(result.coopRole).toBeUndefined();
    });

    it('should return undefined when party_id is omitted (not present) in event', () => {
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
        payload: {},
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.partyId).toBeUndefined();
      expect(result.coopRole).toBeUndefined();
    });
  });

  describe('coop role validation', () => {
    it('should accept valid coop_role values', () => {
      const validRoles = ['triage_lead', 'verification_lead', 'authority'];

      for (const role of validRoles) {
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
          coop_role: role,
          payload: {},
        };

        const result = validateIncomingEvent(event);
        expect(result.valid).toBe(true);
        expect(result.coopRole).toBe(role);
      }
    });

    it('should accept any string value for coop_role (validation at application level)', () => {
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
        coop_role: 'invalid_role',
        payload: {},
      };

      const result = validateIncomingEvent(event);
      expect(result.valid).toBe(true);
      expect(result.coopRole).toBe('invalid_role');
    });
  });
});
