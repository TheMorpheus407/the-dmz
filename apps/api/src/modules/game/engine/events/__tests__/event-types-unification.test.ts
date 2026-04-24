import { describe, expect, it } from 'vitest';

import { GAME_EVENT_TYPES, GAME_EVENT_TYPE_ARRAY, isValidGameEventType } from '@the-dmz/shared';

import { GAME_ENGINE_EVENTS } from './shared-types.js';

describe('GAME_ENGINE_EVENTS unification', () => {
  describe('GAME_ENGINE_EVENTS values should be valid game event types', () => {
    const engineEventValues = Object.values(GAME_ENGINE_EVENTS) as readonly string[];

    it('should have all engine event values be valid game event types', () => {
      const invalidEvents = engineEventValues.filter(
        (eventValue) => !isValidGameEventType(eventValue),
      );

      expect(invalidEvents).toHaveLength(0);
      expect(invalidEvents).toEqual([]);
    });

    it('should include game.session.ended (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.SESSION_ENDED)).toBe(true);
    });

    it('should include game.day.phase.changed (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED)).toBe(true);
    });

    it('should include game.inbox.loaded (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.INBOX_LOADED)).toBe(true);
    });

    it('should include game.email.received (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.EMAIL_RECEIVED)).toBe(true);
    });

    it('should include game.email.header.viewed (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED)).toBe(true);
    });

    it('should include game.email.url.hovered (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED)).toBe(true);
    });

    it('should include game.email.attachment.previewed (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED)).toBe(true);
    });

    it('should include game.email.decision_evaluated (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED)).toBe(true);
    });

    it('should include game.decision.approved (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.DECISION_APPROVED)).toBe(true);
    });

    it('should include game.decision.denied (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.DECISION_DENIED)).toBe(true);
    });

    it('should include game.decision.flagged (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.DECISION_FLAGGED)).toBe(true);
    });

    it('should include game.decision.verification_requested (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED)).toBe(true);
    });

    it('should include game.verification.packet_opened (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED)).toBe(true);
    });

    it('should include game.verification.out_of_band_initiated (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED)).toBe(
        true,
      );
    });

    it('should include game.verification.result (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.VERIFICATION_RESULT)).toBe(true);
    });

    it('should include threat.attack.launched (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED)).toBe(true);
    });

    it('should include threat.attack.mitigated (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED)).toBe(true);
    });
  });

  describe('Additional game and threat events should be valid', () => {
    it('should include threat.attack.succeeded (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED)).toBe(true);
    });

    it('should include threat.breach.occurred (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.THREAT_BREACH_OCCURRED)).toBe(true);
    });

    it('should include threat.level.changed (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED)).toBe(true);
    });

    it('should include game.economy.intel_changed (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.INTEL_CHANGED)).toBe(true);
    });

    it('should include game.economy.level_up (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.LEVEL_UP)).toBe(true);
    });

    it('should include incident.response.action_taken (missing from GAME_EVENT_TYPES)', () => {
      expect(isValidGameEventType(GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN)).toBe(true);
    });
  });

  describe('Naming inconsistencies should be resolved', () => {
    it('game.session.breach_recovery should map to game.breach.recovery_started', () => {
      expect(GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED).toBe('game.breach.recovery_started');
    });

    it('game.economy.credits_changed should map to game.funds.modified', () => {
      expect(GAME_EVENT_TYPES.FUNDS_MODIFIED).toBe('game.funds.modified');
    });

    it('game.economy.trust_changed should map to game.trust.modified', () => {
      expect(GAME_EVENT_TYPES.TRUST_MODIFIED).toBe('game.trust.modified');
    });
  });

  describe('GAME_ENGINE_EVENTS should import from GAME_EVENT_TYPES (not duplicate)', () => {
    it('GAME_ENGINE_EVENTS.SESSION_STARTED should equal GAME_EVENT_TYPES.SESSION_STARTED', () => {
      expect(GAME_ENGINE_EVENTS.SESSION_STARTED).toBe(GAME_EVENT_TYPES.SESSION_STARTED);
    });

    it('GAME_ENGINE_EVENTS.SESSION_ENDED should exist in GAME_EVENT_TYPES', () => {
      expect(GAME_EVENT_TYPE_ARRAY).toContain(GAME_ENGINE_EVENTS.SESSION_ENDED);
    });

    it('GAME_ENGINE_EVENTS.BREACH_OCCURRED should equal GAME_EVENT_TYPES.BREACH_OCCURRED', () => {
      expect(GAME_ENGINE_EVENTS.BREACH_OCCURRED).toBe(GAME_EVENT_TYPES.BREACH_OCCURRED);
    });

    it('GAME_ENGINE_EVENTS.SESSION_GAME_OVER should equal GAME_EVENT_TYPES.GAME_OVER', () => {
      expect(GAME_ENGINE_EVENTS.SESSION_GAME_OVER).toBe(GAME_EVENT_TYPES.GAME_OVER);
    });
  });
});
