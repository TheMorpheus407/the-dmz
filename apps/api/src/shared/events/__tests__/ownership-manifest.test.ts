import { describe, expect, it } from 'vitest';

import {
  EVENT_OWNERSHIP_MANIFEST,
  getEventOwnership,
  isEventOwnedByModule,
  isCrossModuleEmissionAllowed,
  getAllOwnedEvents,
  validateEventVersion,
} from '../ownership-manifest.js';

describe('EVENT_OWNERSHIP_MANIFEST', () => {
  it('should have valid structure', () => {
    expect(EVENT_OWNERSHIP_MANIFEST.events).toBeDefined();
    expect(Array.isArray(EVENT_OWNERSHIP_MANIFEST.events)).toBe(true);
    expect(EVENT_OWNERSHIP_MANIFEST.events.length).toBeGreaterThan(0);
    expect(EVENT_OWNERSHIP_MANIFEST.versionPolicy).toBeDefined();
  });

  it('should contain auth events', () => {
    const authEvents = EVENT_OWNERSHIP_MANIFEST.events.filter(
      (e) => e.eventType.startsWith('auth.') || e.eventType.startsWith('authz.'),
    );
    expect(authEvents.length).toBeGreaterThan(0);
  });

  it('should contain game events', () => {
    const gameEvents = EVENT_OWNERSHIP_MANIFEST.events.filter((e) =>
      e.eventType.startsWith('game.'),
    );
    expect(gameEvents.length).toBeGreaterThan(0);
  });
});

describe('getEventOwnership', () => {
  it('should return ownership for registered event', () => {
    const ownership = getEventOwnership('auth.user.created');
    expect(ownership).toBeDefined();
    expect(ownership?.owningModule).toBe('auth');
    expect(ownership?.version).toBe(1);
  });

  it('should return undefined for unregistered event', () => {
    const ownership = getEventOwnership('unknown.event');
    expect(ownership).toBeUndefined();
  });
});

describe('isEventOwnedByModule', () => {
  it('should return true when module owns event', () => {
    expect(isEventOwnedByModule('auth.user.created', 'auth')).toBe(true);
    expect(isEventOwnedByModule('game.session.started', 'game')).toBe(true);
  });

  it('should return false when module does not own event', () => {
    expect(isEventOwnedByModule('auth.user.created', 'game')).toBe(false);
    expect(isEventOwnedByModule('game.session.started', 'auth')).toBe(false);
  });
});

describe('isCrossModuleEmissionAllowed', () => {
  it('should allow emitting own events', () => {
    expect(isCrossModuleEmissionAllowed('auth.user.created', 'auth')).toBe(true);
    expect(isCrossModuleEmissionAllowed('game.session.started', 'game')).toBe(true);
  });

  it('should block emitting events owned by other modules without exemption', () => {
    expect(isCrossModuleEmissionAllowed('auth.user.created', 'game')).toBe(false);
    expect(isCrossModuleEmissionAllowed('game.session.started', 'auth')).toBe(false);
  });
});

describe('getAllOwnedEvents', () => {
  it('should return all events owned by a module', () => {
    const authEvents = getAllOwnedEvents('auth');
    expect(authEvents.length).toBeGreaterThan(0);
    expect(
      authEvents.every((e) => e.eventType.startsWith('auth.') || e.eventType.startsWith('authz.')),
    ).toBe(true);

    const gameEvents = getAllOwnedEvents('game');
    expect(gameEvents.length).toBeGreaterThan(0);
    expect(gameEvents.every((e) => e.eventType.startsWith('game.'))).toBe(true);
  });

  it('should return empty array for module with no events', () => {
    const events = getAllOwnedEvents('unknown');
    expect(events).toEqual([]);
  });
});

describe('validateEventVersion', () => {
  it('should allow valid version', () => {
    const result = validateEventVersion('auth.user.created', 1);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject unregistered events', () => {
    const result = validateEventVersion('unknown.event', 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not registered');
  });
});
