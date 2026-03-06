import { describe, expect, it } from 'vitest';

import {
  GAME_EVENT_TYPES,
  GAME_EVENT_TYPE_ARRAY,
  isValidGameEventType,
  type GameEventType,
} from '../event-types.js';

describe('GAME_EVENT_TYPES', () => {
  it('should have 22 event types', () => {
    expect(GAME_EVENT_TYPE_ARRAY).toHaveLength(22);
  });

  it('should contain game.session.started', () => {
    expect(GAME_EVENT_TYPES.SESSION_STARTED).toBe('game.session.started');
  });

  it('should contain game.day.started', () => {
    expect(GAME_EVENT_TYPES.DAY_STARTED).toBe('game.day.started');
  });

  it('should contain game.day.ended', () => {
    expect(GAME_EVENT_TYPES.DAY_ENDED).toBe('game.day.ended');
  });

  it('should contain game.email.opened', () => {
    expect(GAME_EVENT_TYPES.EMAIL_OPENED).toBe('game.email.opened');
  });

  it('should contain game.email.decision_submitted', () => {
    expect(GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED).toBe('game.email.decision_submitted');
  });

  it('should contain game.email.decision_resolved', () => {
    expect(GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED).toBe('game.email.decision_resolved');
  });

  it('should contain game.session.completed', () => {
    expect(GAME_EVENT_TYPES.SESSION_COMPLETED).toBe('game.session.completed');
  });

  it('should contain game.session.paused and game.session.resumed', () => {
    expect(GAME_EVENT_TYPES.SESSION_PAUSED).toBe('game.session.paused');
    expect(GAME_EVENT_TYPES.SESSION_RESUMED).toBe('game.session.resumed');
  });

  it('should contain game.session.abandoned', () => {
    expect(GAME_EVENT_TYPES.SESSION_ABANDONED).toBe('game.session.abandoned');
  });

  it('should contain game.inbox.generated', () => {
    expect(GAME_EVENT_TYPES.INBOX_GENERATED).toBe('game.inbox.generated');
  });

  it('should contain game.consequences.applied', () => {
    expect(GAME_EVENT_TYPES.CONSEQUENCES_APPLIED).toBe('game.consequences.applied');
  });

  it('should contain game.threats.generated', () => {
    expect(GAME_EVENT_TYPES.THREATS_GENERATED).toBe('game.threats.generated');
  });

  it('should contain game.incident.created and game.incident.resolved', () => {
    expect(GAME_EVENT_TYPES.INCIDENT_CREATED).toBe('game.incident.created');
    expect(GAME_EVENT_TYPES.INCIDENT_RESOLVED).toBe('game.incident.resolved');
  });

  it('should contain game.breach.occurred', () => {
    expect(GAME_EVENT_TYPES.BREACH_OCCURRED).toBe('game.breach.occurred');
  });

  it('should contain game.upgrade.purchased', () => {
    expect(GAME_EVENT_TYPES.UPGRADE_PURCHASED).toBe('game.upgrade.purchased');
  });

  it('should contain game.resource.adjusted', () => {
    expect(GAME_EVENT_TYPES.RESOURCE_ADJUSTED).toBe('game.resource.adjusted');
  });

  it('should contain game.email.indicator_marked and game.email.verification_requested', () => {
    expect(GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED).toBe('game.email.indicator_marked');
    expect(GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED).toBe('game.email.verification_requested');
  });
});

describe('isValidGameEventType', () => {
  it('should return true for valid event types', () => {
    expect(isValidGameEventType('game.session.started')).toBe(true);
    expect(isValidGameEventType('game.day.started')).toBe(true);
    expect(isValidGameEventType('game.email.opened')).toBe(true);
    expect(isValidGameEventType('game.session.completed')).toBe(true);
  });

  it('should return false for invalid event types', () => {
    expect(isValidGameEventType('invalid.event')).toBe(false);
    expect(isValidGameEventType('')).toBe(false);
    expect(isValidGameEventType('game.invalid')).toBe(false);
    expect(isValidGameEventType('session.started')).toBe(false);
  });

  it('should narrow type correctly', () => {
    const eventType = 'game.session.started' as string;
    if (isValidGameEventType(eventType)) {
      const typed: GameEventType = eventType;
      expect(typed).toBe('game.session.started');
    }
  });
});
