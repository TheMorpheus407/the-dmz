import { describe, it, expect } from 'vitest';

import { GAME_ENGINE_EVENTS } from '../../events/index.js';

describe('email-handlers constants', () => {
  it('should use GAME_ENGINE_EVENTS constants for event types', () => {
    expect(GAME_ENGINE_EVENTS.EMAIL_OPENED).toBe('game.email.opened');
    expect(GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED).toBe('game.email.indicator_marked');
    expect(GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED).toBe(
      'game.email.verification_requested',
    );
    expect(GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED).toBe('game.email.decision_submitted');
    expect(GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED).toBe('game.email.decision_evaluated');
  });

  it('should have INBOX_LOADED constant', () => {
    expect(GAME_ENGINE_EVENTS.INBOX_LOADED).toBe('game.inbox.loaded');
  });

  it('should have VERIFICATION_PACKET_GENERATED constant', () => {
    expect(GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED).toBe(
      'game.verification.packet_generated',
    );
  });

  it('should have DAY_STARTED constant', () => {
    expect(GAME_ENGINE_EVENTS.DAY_STARTED).toBe('game.day.started');
  });

  it('should have economy constants', () => {
    expect(GAME_ENGINE_EVENTS.CREDITS_CHANGED).toBe('game.economy.credits_changed');
    expect(GAME_ENGINE_EVENTS.TRUST_CHANGED).toBe('game.economy.trust_changed');
    expect(GAME_ENGINE_EVENTS.LEVEL_UP).toBe('game.economy.level_up');
  });
});
