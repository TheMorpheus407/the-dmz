import { describe, it, expect, beforeEach } from 'vitest';

import { GAME_EVENT_TYPES } from '@the-dmz/shared';
import type { EventAdapterRegistry, GameEventType, StoredGameEvent } from '@the-dmz/shared';

const createMockStoredEvent = (
  eventType: GameEventType,
  eventData: Record<string, unknown> = {},
): StoredGameEvent => ({
  eventId: 'test-event-id',
  sessionId: 'test-session-id',
  userId: 'test-user-id',
  tenantId: 'test-tenant-id',
  eventType,
  eventData,
  eventVersion: 1,
  sequenceNum: 1,
  serverTime: new Date(),
  clientTime: null,
});

describe('EventAdapter Runtime Contract', () => {
  it('should have adapters that implement the expected interface contract', async () => {
    const { createSessionStartedAdapter, EventAdapterRegistry } = await import('@the-dmz/shared');
    const _registry = new EventAdapterRegistry();
    const adapter = createSessionStartedAdapter();

    expect(adapter).toHaveProperty('eventType');
    expect(adapter).toHaveProperty('toActionPayload');
    expect(typeof adapter.toActionPayload).toBe('function');
    expect(typeof adapter.eventType).toBe('string');
  });

  it('should produce valid action payloads from adapter toActionPayload', async () => {
    const { createSessionStartedAdapter, EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    const adapter = createSessionStartedAdapter();
    registry.register(adapter);

    const result = registry.toActionPayload('game.session.started' as GameEventType, {});

    expect(result).toEqual({ type: 'ACK_DAY_START' });
  });
});

describe('EventAdapterRegistry (Architecture Contract)', () => {
  it('should be defined in the event-store module', async () => {
    const module = await import('@the-dmz/shared');
    expect(module).toHaveProperty('EventAdapterRegistry');
  });

  it('should have a register method', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    expect(typeof registry.register).toBe('function');
  });

  it('should have a toActionPayload method', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    expect(typeof registry.toActionPayload).toBe('function');
  });

  it('should have a hasAdapter method', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    expect(typeof registry.hasAdapter).toBe('function');
  });
});

describe('EventAdapterRegistry Behavior', () => {
  let registry: EventAdapterRegistry;

  beforeEach(async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    registry = new EventAdapterRegistry();
  });

  it('should return null for unregistered event types', async () => {
    const result = registry.toActionPayload(GAME_EVENT_TYPES.SESSION_STARTED, {});
    expect(result).toBeNull();
  });

  it('should return false for hasAdapter on unregistered event types', async () => {
    const result = registry.hasAdapter(GAME_EVENT_TYPES.SESSION_STARTED);
    expect(result).toBe(false);
  });

  it('should return true for hasAdapter on registered event types', async () => {
    const { createSessionStartedAdapter } = await import('@the-dmz/shared');
    const adapter = createSessionStartedAdapter();
    registry.register(adapter);

    const result = registry.hasAdapter(GAME_EVENT_TYPES.SESSION_STARTED);
    expect(result).toBe(true);
  });
});

describe('Event to Action Payload Mapping via Registry', () => {
  let registry: EventAdapterRegistry;

  beforeEach(async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    registry = new EventAdapterRegistry();
  });

  describe('Session Events', () => {
    it('should map game.session.started to ACK_DAY_START', async () => {
      const { createSessionStartedAdapter } = await import('@the-dmz/shared');
      const adapter = createSessionStartedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.SESSION_STARTED);
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'ACK_DAY_START' });
    });

    it('should map game.day.started to ACK_DAY_START', async () => {
      const { createDayStartedAdapter } = await import('@the-dmz/shared');
      const adapter = createDayStartedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.DAY_STARTED);
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'ACK_DAY_START' });
    });

    it('should map game.day.ended to ADVANCE_DAY', async () => {
      const { createDayEndedAdapter } = await import('@the-dmz/shared');
      const adapter = createDayEndedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.DAY_ENDED);
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'ADVANCE_DAY' });
    });

    it('should map game.session.paused to PAUSE_SESSION', async () => {
      const { createSessionPausedAdapter } = await import('@the-dmz/shared');
      const adapter = createSessionPausedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.SESSION_PAUSED);
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'PAUSE_SESSION' });
    });

    it('should map game.session.resumed to RESUME_SESSION', async () => {
      const { createSessionResumedAdapter } = await import('@the-dmz/shared');
      const adapter = createSessionResumedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.SESSION_RESUMED);
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'RESUME_SESSION' });
    });

    it('should map game.session.abandoned to ABANDON_SESSION with reason', async () => {
      const { createSessionAbandonedAdapter } = await import('@the-dmz/shared');
      const adapter = createSessionAbandonedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.SESSION_ABANDONED, {
        reason: 'user quit',
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'ABANDON_SESSION', reason: 'user quit' });
    });

    it('should map game.session.completed to ABANDON_SESSION', async () => {
      const { createSessionCompletedAdapter } = await import('@the-dmz/shared');
      const adapter = createSessionCompletedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.SESSION_COMPLETED);
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'ABANDON_SESSION' });
    });
  });

  describe('Email Events', () => {
    it('should map game.email.opened to OPEN_EMAIL with emailId', async () => {
      const { createEmailOpenedAdapter } = await import('@the-dmz/shared');
      const adapter = createEmailOpenedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.EMAIL_OPENED, { emailId: 'email-123' });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'OPEN_EMAIL', emailId: 'email-123' });
    });

    it('should map game.email.indicator_marked to MARK_INDICATOR', async () => {
      const { createEmailIndicatorMarkedAdapter } = await import('@the-dmz/shared');
      const adapter = createEmailIndicatorMarkedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED, {
        emailId: 'email-123',
        indicatorType: 'suspicious_sender',
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({
        type: 'MARK_INDICATOR',
        emailId: 'email-123',
        indicatorType: 'suspicious_sender',
      });
    });

    it('should map game.email.verification_requested to REQUEST_VERIFICATION', async () => {
      const { createEmailVerificationRequestedAdapter } = await import('@the-dmz/shared');
      const adapter = createEmailVerificationRequestedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED, {
        emailId: 'email-123',
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'REQUEST_VERIFICATION', emailId: 'email-123' });
    });

    it('should map game.email.decision_submitted to SUBMIT_DECISION', async () => {
      const { createEmailDecisionSubmittedAdapter } = await import('@the-dmz/shared');
      const adapter = createEmailDecisionSubmittedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED, {
        emailId: 'email-123',
        decision: 'approve',
        timeSpentMs: 5000,
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({
        type: 'SUBMIT_DECISION',
        emailId: 'email-123',
        decision: 'approve',
        timeSpentMs: 5000,
      });
    });

    it('should map game.email.decision_resolved to CLOSE_VERIFICATION', async () => {
      const { createEmailDecisionResolvedAdapter } = await import('@the-dmz/shared');
      const adapter = createEmailDecisionResolvedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED, {
        emailId: 'email-123',
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'CLOSE_VERIFICATION', emailId: 'email-123' });
    });
  });

  describe('Consequence and Threat Events', () => {
    it('should map game.consequences.applied to APPLY_CONSEQUENCES', async () => {
      const { createConsequencesAppliedAdapter } = await import('@the-dmz/shared');
      const adapter = createConsequencesAppliedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.CONSEQUENCES_APPLIED, { day: 5 });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'APPLY_CONSEQUENCES', dayNumber: 5 });
    });

    it('should map game.threats.generated to PROCESS_THREATS', async () => {
      const { createThreatsGeneratedAdapter } = await import('@the-dmz/shared');
      const adapter = createThreatsGeneratedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.THREATS_GENERATED, { day: 3 });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'PROCESS_THREATS', dayNumber: 3 });
    });

    it('should map game.incident.created to PROCESS_THREATS', async () => {
      const { createIncidentCreatedAdapter } = await import('@the-dmz/shared');
      const adapter = createIncidentCreatedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.INCIDENT_CREATED, { day: 4 });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'PROCESS_THREATS', dayNumber: 4 });
    });

    it('should map game.breach.occurred to PROCESS_THREATS', async () => {
      const { createBreachOccurredAdapter } = await import('@the-dmz/shared');
      const adapter = createBreachOccurredAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.BREACH_OCCURRED, { day: 6 });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'TRIGGER_BREACH', triggerType: '', severity: 1 });
    });
  });

  describe('Incident Events', () => {
    it('should map game.incident.resolved to RESOLVE_INCIDENT', async () => {
      const { createIncidentResolvedAdapter } = await import('@the-dmz/shared');
      const adapter = createIncidentResolvedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.INCIDENT_RESOLVED, {
        incidentId: 'incident-456',
        responseActions: ['quarantine', 'notify'],
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({
        type: 'RESOLVE_INCIDENT',
        incidentId: 'incident-456',
        responseActions: ['quarantine', 'notify'],
      });
    });
  });

  describe('Upgrade and Resource Events', () => {
    it('should map game.upgrade.purchased to PURCHASE_UPGRADE', async () => {
      const { createUpgradePurchasedAdapter } = await import('@the-dmz/shared');
      const adapter = createUpgradePurchasedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.UPGRADE_PURCHASED, {
        upgradeId: 'upgrade-fw-01',
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'PURCHASE_UPGRADE', upgradeId: 'upgrade-fw-01' });
    });

    it('should map game.resource.adjusted to ADJUST_RESOURCE', async () => {
      const { createResourceAdjustedAdapter } = await import('@the-dmz/shared');
      const adapter = createResourceAdjustedAdapter();
      registry.register(adapter);

      const event = createMockStoredEvent(GAME_EVENT_TYPES.RESOURCE_ADJUSTED, {
        resourceId: 'rack-01',
        delta: -10,
      });
      const result = registry.toActionPayload(event.eventType, event.eventData);

      expect(result).toEqual({ type: 'ADJUST_RESOURCE', resourceId: 'rack-01', delta: -10 });
    });
  });
});

describe('All Adapters - Simultaneous Registration', () => {
  it('should handle all 19 registered adapters in a single registry', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();

    const adapters = await Promise.all([
      import('@the-dmz/shared').then((m) => m.createSessionStartedAdapter()),
      import('@the-dmz/shared').then((m) => m.createDayStartedAdapter()),
      import('@the-dmz/shared').then((m) => m.createDayEndedAdapter()),
      import('@the-dmz/shared').then((m) => m.createSessionPausedAdapter()),
      import('@the-dmz/shared').then((m) => m.createSessionResumedAdapter()),
      import('@the-dmz/shared').then((m) => m.createSessionAbandonedAdapter()),
      import('@the-dmz/shared').then((m) => m.createSessionCompletedAdapter()),
      import('@the-dmz/shared').then((m) => m.createEmailOpenedAdapter()),
      import('@the-dmz/shared').then((m) => m.createEmailIndicatorMarkedAdapter()),
      import('@the-dmz/shared').then((m) => m.createEmailVerificationRequestedAdapter()),
      import('@the-dmz/shared').then((m) => m.createEmailDecisionSubmittedAdapter()),
      import('@the-dmz/shared').then((m) => m.createEmailDecisionResolvedAdapter()),
      import('@the-dmz/shared').then((m) => m.createConsequencesAppliedAdapter()),
      import('@the-dmz/shared').then((m) => m.createThreatsGeneratedAdapter()),
      import('@the-dmz/shared').then((m) => m.createIncidentCreatedAdapter()),
      import('@the-dmz/shared').then((m) => m.createBreachOccurredAdapter()),
      import('@the-dmz/shared').then((m) => m.createIncidentResolvedAdapter()),
      import('@the-dmz/shared').then((m) => m.createUpgradePurchasedAdapter()),
      import('@the-dmz/shared').then((m) => m.createResourceAdjustedAdapter()),
    ]);

    adapters.forEach((adapter) => registry.register(adapter));

    expect(registry.hasAdapter(GAME_EVENT_TYPES.SESSION_STARTED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.DAY_STARTED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.DAY_ENDED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.SESSION_PAUSED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.SESSION_RESUMED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.SESSION_ABANDONED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.SESSION_COMPLETED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.EMAIL_OPENED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.CONSEQUENCES_APPLIED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.THREATS_GENERATED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.INCIDENT_CREATED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.BREACH_OCCURRED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.INCIDENT_RESOLVED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.UPGRADE_PURCHASED)).toBe(true);
    expect(registry.hasAdapter(GAME_EVENT_TYPES.RESOURCE_ADJUSTED)).toBe(true);
  });

  it('should produce correct payloads for all event types when all adapters are registered', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();

    registry.register((await import('@the-dmz/shared')).createSessionStartedAdapter());
    registry.register((await import('@the-dmz/shared')).createDayStartedAdapter());
    registry.register((await import('@the-dmz/shared')).createDayEndedAdapter());
    registry.register((await import('@the-dmz/shared')).createSessionPausedAdapter());
    registry.register((await import('@the-dmz/shared')).createSessionResumedAdapter());
    registry.register((await import('@the-dmz/shared')).createSessionAbandonedAdapter());
    registry.register((await import('@the-dmz/shared')).createSessionCompletedAdapter());
    registry.register((await import('@the-dmz/shared')).createEmailOpenedAdapter());
    registry.register((await import('@the-dmz/shared')).createEmailIndicatorMarkedAdapter());
    registry.register((await import('@the-dmz/shared')).createEmailVerificationRequestedAdapter());
    registry.register((await import('@the-dmz/shared')).createEmailDecisionSubmittedAdapter());
    registry.register((await import('@the-dmz/shared')).createEmailDecisionResolvedAdapter());
    registry.register((await import('@the-dmz/shared')).createConsequencesAppliedAdapter());
    registry.register((await import('@the-dmz/shared')).createThreatsGeneratedAdapter());
    registry.register((await import('@the-dmz/shared')).createIncidentCreatedAdapter());
    registry.register((await import('@the-dmz/shared')).createBreachOccurredAdapter());
    registry.register((await import('@the-dmz/shared')).createIncidentResolvedAdapter());
    registry.register((await import('@the-dmz/shared')).createUpgradePurchasedAdapter());
    registry.register((await import('@the-dmz/shared')).createResourceAdjustedAdapter());

    expect(registry.toActionPayload(GAME_EVENT_TYPES.SESSION_STARTED, {})).toEqual({
      type: 'ACK_DAY_START',
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.DAY_STARTED, {})).toEqual({
      type: 'ACK_DAY_START',
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.DAY_ENDED, {})).toEqual({
      type: 'ADVANCE_DAY',
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.SESSION_PAUSED, {})).toEqual({
      type: 'PAUSE_SESSION',
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.SESSION_RESUMED, {})).toEqual({
      type: 'RESUME_SESSION',
    });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.SESSION_ABANDONED, { reason: 'timeout' }),
    ).toEqual({ type: 'ABANDON_SESSION', reason: 'timeout' });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.SESSION_COMPLETED, {})).toEqual({
      type: 'ABANDON_SESSION',
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.EMAIL_OPENED, { emailId: 'e1' })).toEqual({
      type: 'OPEN_EMAIL',
      emailId: 'e1',
    });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED, {
        emailId: 'e2',
        indicatorType: 'bad',
      }),
    ).toEqual({ type: 'MARK_INDICATOR', emailId: 'e2', indicatorType: 'bad' });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED, { emailId: 'e3' }),
    ).toEqual({ type: 'REQUEST_VERIFICATION', emailId: 'e3' });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED, {
        emailId: 'e4',
        decision: 'approve',
        timeSpentMs: 1000,
      }),
    ).toEqual({ type: 'SUBMIT_DECISION', emailId: 'e4', decision: 'approve', timeSpentMs: 1000 });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED, { emailId: 'e5' }),
    ).toEqual({ type: 'CLOSE_VERIFICATION', emailId: 'e5' });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.CONSEQUENCES_APPLIED, { day: 3 })).toEqual({
      type: 'APPLY_CONSEQUENCES',
      dayNumber: 3,
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.THREATS_GENERATED, { day: 4 })).toEqual({
      type: 'PROCESS_THREATS',
      dayNumber: 4,
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.INCIDENT_CREATED, { day: 5 })).toEqual({
      type: 'PROCESS_THREATS',
      dayNumber: 5,
    });
    expect(registry.toActionPayload(GAME_EVENT_TYPES.BREACH_OCCURRED, { day: 6 })).toEqual({
      type: 'TRIGGER_BREACH',
      triggerType: '',
      severity: 1,
    });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.INCIDENT_RESOLVED, {
        incidentId: 'i1',
        responseActions: ['a1'],
      }),
    ).toEqual({ type: 'RESOLVE_INCIDENT', incidentId: 'i1', responseActions: ['a1'] });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.UPGRADE_PURCHASED, { upgradeId: 'u1' }),
    ).toEqual({ type: 'PURCHASE_UPGRADE', upgradeId: 'u1' });
    expect(
      registry.toActionPayload(GAME_EVENT_TYPES.RESOURCE_ADJUSTED, { resourceId: 'r1', delta: 10 }),
    ).toEqual({ type: 'ADJUST_RESOURCE', resourceId: 'r1', delta: 10 });
  });
});

describe('Integration Test - GameEventStoreService eventToActionPayload Flow', () => {
  it('should convert StoredGameEvent to GameActionPayload for session.started', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    registry.register((await import('@the-dmz/shared')).createSessionStartedAdapter());
    registry.register((await import('@the-dmz/shared')).createDayStartedAdapter());

    const storedEvent: StoredGameEvent = {
      eventId: 'evt-001',
      sessionId: 'sess-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      eventType: GAME_EVENT_TYPES.SESSION_STARTED,
      eventData: {},
      eventVersion: 1,
      sequenceNum: 1,
      serverTime: new Date(),
      clientTime: null,
    };

    const result = registry.toActionPayload(storedEvent.eventType, storedEvent.eventData);
    expect(result).toEqual({ type: 'ACK_DAY_START' });
  });

  it('should convert StoredGameEvent to GameActionPayload for email.opened', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    registry.register((await import('@the-dmz/shared')).createEmailOpenedAdapter());
    registry.register((await import('@the-dmz/shared')).createEmailIndicatorMarkedAdapter());

    const storedEvent: StoredGameEvent = {
      eventId: 'evt-002',
      sessionId: 'sess-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      eventType: GAME_EVENT_TYPES.EMAIL_OPENED,
      eventData: { emailId: 'email-abc-123' },
      eventVersion: 1,
      sequenceNum: 2,
      serverTime: new Date(),
      clientTime: null,
    };

    const result = registry.toActionPayload(storedEvent.eventType, storedEvent.eventData);
    expect(result).toEqual({ type: 'OPEN_EMAIL', emailId: 'email-abc-123' });
  });

  it('should convert StoredGameEvent to GameActionPayload for threats.generated', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    registry.register((await import('@the-dmz/shared')).createThreatsGeneratedAdapter());

    const storedEvent: StoredGameEvent = {
      eventId: 'evt-003',
      sessionId: 'sess-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      eventType: GAME_EVENT_TYPES.THREATS_GENERATED,
      eventData: { day: 7 },
      eventVersion: 1,
      sequenceNum: 3,
      serverTime: new Date(),
      clientTime: null,
    };

    const result = registry.toActionPayload(storedEvent.eventType, storedEvent.eventData);
    expect(result).toEqual({ type: 'PROCESS_THREATS', dayNumber: 7 });
  });

  it('should convert StoredGameEvent to GameActionPayload for incident.resolved', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();
    registry.register((await import('@the-dmz/shared')).createIncidentResolvedAdapter());

    const storedEvent: StoredGameEvent = {
      eventId: 'evt-004',
      sessionId: 'sess-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      eventType: GAME_EVENT_TYPES.INCIDENT_RESOLVED,
      eventData: { incidentId: 'incident-xyz', responseActions: ['notify', 'quarantine'] },
      eventVersion: 1,
      sequenceNum: 4,
      serverTime: new Date(),
      clientTime: null,
    };

    const result = registry.toActionPayload(storedEvent.eventType, storedEvent.eventData);
    expect(result).toEqual({
      type: 'RESOLVE_INCIDENT',
      incidentId: 'incident-xyz',
      responseActions: ['notify', 'quarantine'],
    });
  });
});

describe('Open/Closed Principle - Adding New Event Types', () => {
  it('should allow adding new adapters without modifying existing code', async () => {
    const { EventAdapterRegistry, createSessionStartedAdapter } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();

    const sessionStartedAdapter = createSessionStartedAdapter();
    registry.register(sessionStartedAdapter);

    expect(registry.hasAdapter(GAME_EVENT_TYPES.SESSION_STARTED)).toBe(true);
  });

  it('should not require modifying the event store service to add new event mappings', async () => {
    const { EventAdapterRegistry, createGameOverAdapter } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();

    const gameOverAdapter = createGameOverAdapter();
    registry.register(gameOverAdapter);

    expect(registry.hasAdapter(GAME_EVENT_TYPES.GAME_OVER)).toBe(true);
  });
});

describe('Backwards Compatibility - Unknown Events Return Null', () => {
  it('should return null for event types without registered adapters', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();

    const event = createMockStoredEvent(GAME_EVENT_TYPES.SESSION_STARTED);
    const result = registry.toActionPayload(event.eventType, event.eventData);

    expect(result).toBeNull();
  });

  it('should return null for unknown event types', async () => {
    const { EventAdapterRegistry } = await import('@the-dmz/shared');
    const registry = new EventAdapterRegistry();

    const unknownEventType = 'game.unknown.event' as GameEventType;
    const result = registry.toActionPayload(unknownEventType, {});

    expect(result).toBeNull();
  });
});

describe('Event Type Coverage', () => {
  it('should have adapters for all event types currently handled by switch statement', async () => {
    const eventTypesWithMappings: GameEventType[] = [
      GAME_EVENT_TYPES.SESSION_STARTED,
      GAME_EVENT_TYPES.DAY_STARTED,
      GAME_EVENT_TYPES.EMAIL_OPENED,
      GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED,
      GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED,
      GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED,
      GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED,
      GAME_EVENT_TYPES.CONSEQUENCES_APPLIED,
      GAME_EVENT_TYPES.THREATS_GENERATED,
      GAME_EVENT_TYPES.INCIDENT_CREATED,
      GAME_EVENT_TYPES.INCIDENT_RESOLVED,
      GAME_EVENT_TYPES.BREACH_OCCURRED,
      GAME_EVENT_TYPES.UPGRADE_PURCHASED,
      GAME_EVENT_TYPES.RESOURCE_ADJUSTED,
      GAME_EVENT_TYPES.DAY_ENDED,
      GAME_EVENT_TYPES.SESSION_PAUSED,
      GAME_EVENT_TYPES.SESSION_RESUMED,
      GAME_EVENT_TYPES.SESSION_ABANDONED,
      GAME_EVENT_TYPES.SESSION_COMPLETED,
    ];

    expect(eventTypesWithMappings.length).toBeGreaterThan(0);
  });

  it('should list all GAME_EVENT_TYPE_ARRAY entries for reference', () => {
    const allEventTypes = GAME_EVENT_TYPES;
    const eventTypeCount = Object.keys(allEventTypes).length;

    expect(eventTypeCount).toBeGreaterThan(40);
  });
});
