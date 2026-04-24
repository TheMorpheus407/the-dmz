import { describe, expect, it } from 'vitest';

import { GAME_EVENT_TYPE_ARRAY } from '@the-dmz/shared';

import { getEventOwnership, getAllOwnedEvents } from '../ownership-manifest.js';

describe('Ownership Manifest coverage for game events', () => {
  describe('All GAME_EVENT_TYPES should be registered in ownership manifest', () => {
    const gameEvents = getAllOwnedEvents('game');
    const registeredEventTypes = new Set(gameEvents.map((e) => e.eventType));

    GAME_EVENT_TYPE_ARRAY.forEach((eventType) => {
      it(`should register ${eventType}`, () => {
        expect(registeredEventTypes.has(eventType)).toBe(true);
      });
    });

    it('should have all 70 GAME_EVENT_TYPES registered', () => {
      const missingEvents = GAME_EVENT_TYPE_ARRAY.filter(
        (eventType) => !registeredEventTypes.has(eventType),
      );
      expect(missingEvents).toHaveLength(0);
      expect(gameEvents.length).toBeGreaterThanOrEqual(GAME_EVENT_TYPE_ARRAY.length);
    });
  });

  describe('Game events should be owned by the game module', () => {
    const gameEvents = getAllOwnedEvents('game');

    gameEvents.forEach((event) => {
      it(`event ${event.eventType} should be owned by 'game' module`, () => {
        const ownership = getEventOwnership(event.eventType);
        expect(ownership?.owningModule).toBe('game');
      });
    });
  });

  describe('Key events that were previously missing should be registered', () => {
    it('should register game.session.ended', () => {
      const ownership = getEventOwnership('game.session.ended');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.day.phase.changed', () => {
      const ownership = getEventOwnership('game.day.phase.changed');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.inbox.loaded', () => {
      const ownership = getEventOwnership('game.inbox.loaded');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.email.received', () => {
      const ownership = getEventOwnership('game.email.received');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register threat.attack.launched', () => {
      const ownership = getEventOwnership('threat.attack.launched');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register threat.attack.mitigated', () => {
      const ownership = getEventOwnership('threat.attack.mitigated');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register threat.attack.succeeded', () => {
      const ownership = getEventOwnership('threat.attack.succeeded');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register threat.breach.occurred', () => {
      const ownership = getEventOwnership('threat.breach.occurred');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register threat.level.changed', () => {
      const ownership = getEventOwnership('threat.level.changed');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.decision.approved', () => {
      const ownership = getEventOwnership('game.decision.approved');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.decision.denied', () => {
      const ownership = getEventOwnership('game.decision.denied');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.decision.flagged', () => {
      const ownership = getEventOwnership('game.decision.flagged');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.decision.verification_requested', () => {
      const ownership = getEventOwnership('game.decision.verification_requested');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.verification.packet_opened', () => {
      const ownership = getEventOwnership('game.verification.packet_opened');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.verification.out_of_band_initiated', () => {
      const ownership = getEventOwnership('game.verification.out_of_band_initiated');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.verification.result', () => {
      const ownership = getEventOwnership('game.verification.result');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.email.decision_evaluated', () => {
      const ownership = getEventOwnership('game.email.decision_evaluated');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.email.header.viewed', () => {
      const ownership = getEventOwnership('game.email.header.viewed');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.email.url.hovered', () => {
      const ownership = getEventOwnership('game.email.url.hovered');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.email.attachment.previewed', () => {
      const ownership = getEventOwnership('game.email.attachment.previewed');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });
  });

  describe('Additional key events should be registered', () => {
    it('should register game.economy.intel_changed', () => {
      const ownership = getEventOwnership('game.economy.intel_changed');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register game.economy.level_up', () => {
      const ownership = getEventOwnership('game.economy.level_up');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });

    it('should register incident.response.action_taken', () => {
      const ownership = getEventOwnership('incident.response.action_taken');
      expect(ownership).toBeDefined();
      expect(ownership?.owningModule).toBe('game');
    });
  });
});
