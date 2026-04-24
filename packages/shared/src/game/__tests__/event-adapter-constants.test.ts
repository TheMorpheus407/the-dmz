import { describe, expect, it } from 'vitest';

import { GAME_EVENT_TYPES } from '@the-dmz/shared';

import {
  createSessionStartedAdapter,
  createDayStartedAdapter,
  createDayEndedAdapter,
  createSessionPausedAdapter,
  createSessionResumedAdapter,
  createSessionAbandonedAdapter,
  createSessionCompletedAdapter,
  createEmailOpenedAdapter,
  createEmailIndicatorMarkedAdapter,
  createEmailVerificationRequestedAdapter,
  createEmailDecisionSubmittedAdapter,
  createEmailDecisionResolvedAdapter,
  createConsequencesAppliedAdapter,
  createThreatsGeneratedAdapter,
  createIncidentCreatedAdapter,
  createBreachOccurredAdapter,
  createBreachRansomPaidAdapter,
  createBreachRansomRefusedAdapter,
  createBreachRecoveryStartedAdapter,
  createBreachRecoveryCompletedAdapter,
  createBreachPostEffectsStartedAdapter,
  createIncidentResolvedAdapter,
  createUpgradePurchasedAdapter,
  createResourceAdjustedAdapter,
  createGameOverAdapter,
} from '../event-adapter.js';

describe('Event Adapters should use GAME_EVENT_TYPES constants', () => {
  describe('Session adapters', () => {
    it('createSessionStartedAdapter should use GAME_EVENT_TYPES.SESSION_STARTED', () => {
      const adapter = createSessionStartedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.SESSION_STARTED);
      expect(adapter.eventType).toBe('game.session.started');
    });

    it('createDayStartedAdapter should use GAME_EVENT_TYPES.DAY_STARTED', () => {
      const adapter = createDayStartedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.DAY_STARTED);
      expect(adapter.eventType).toBe('game.day.started');
    });

    it('createDayEndedAdapter should use GAME_EVENT_TYPES.DAY_ENDED', () => {
      const adapter = createDayEndedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.DAY_ENDED);
      expect(adapter.eventType).toBe('game.day.ended');
    });

    it('createSessionPausedAdapter should use GAME_EVENT_TYPES.SESSION_PAUSED', () => {
      const adapter = createSessionPausedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.SESSION_PAUSED);
      expect(adapter.eventType).toBe('game.session.paused');
    });

    it('createSessionResumedAdapter should use GAME_EVENT_TYPES.SESSION_RESUMED', () => {
      const adapter = createSessionResumedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.SESSION_RESUMED);
      expect(adapter.eventType).toBe('game.session.resumed');
    });

    it('createSessionAbandonedAdapter should use GAME_EVENT_TYPES.SESSION_ABANDONED', () => {
      const adapter = createSessionAbandonedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.SESSION_ABANDONED);
      expect(adapter.eventType).toBe('game.session.abandoned');
    });

    it('createSessionCompletedAdapter should use GAME_EVENT_TYPES.SESSION_COMPLETED', () => {
      const adapter = createSessionCompletedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.SESSION_COMPLETED);
      expect(adapter.eventType).toBe('game.session.completed');
    });

    it('createGameOverAdapter should use GAME_EVENT_TYPES.GAME_OVER', () => {
      const adapter = createGameOverAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.GAME_OVER);
      expect(adapter.eventType).toBe('game.session.game_over');
    });
  });

  describe('Email adapters', () => {
    it('createEmailOpenedAdapter should use GAME_EVENT_TYPES.EMAIL_OPENED', () => {
      const adapter = createEmailOpenedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.EMAIL_OPENED);
      expect(adapter.eventType).toBe('game.email.opened');
    });

    it('createEmailIndicatorMarkedAdapter should use GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED', () => {
      const adapter = createEmailIndicatorMarkedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED);
      expect(adapter.eventType).toBe('game.email.indicator_marked');
    });

    it('createEmailVerificationRequestedAdapter should use GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED', () => {
      const adapter = createEmailVerificationRequestedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED);
      expect(adapter.eventType).toBe('game.email.verification_requested');
    });

    it('createEmailDecisionSubmittedAdapter should use GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED', () => {
      const adapter = createEmailDecisionSubmittedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED);
      expect(adapter.eventType).toBe('game.email.decision_submitted');
    });

    it('createEmailDecisionResolvedAdapter should use GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED', () => {
      const adapter = createEmailDecisionResolvedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED);
      expect(adapter.eventType).toBe('game.email.decision_resolved');
    });
  });

  describe('Consequence and threat adapters', () => {
    it('createConsequencesAppliedAdapter should use GAME_EVENT_TYPES.CONSEQUENCES_APPLIED', () => {
      const adapter = createConsequencesAppliedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.CONSEQUENCES_APPLIED);
      expect(adapter.eventType).toBe('game.consequences.applied');
    });

    it('createThreatsGeneratedAdapter should use GAME_EVENT_TYPES.THREATS_GENERATED', () => {
      const adapter = createThreatsGeneratedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.THREATS_GENERATED);
      expect(adapter.eventType).toBe('game.threats.generated');
    });
  });

  describe('Incident adapters', () => {
    it('createIncidentCreatedAdapter should use GAME_EVENT_TYPES.INCIDENT_CREATED', () => {
      const adapter = createIncidentCreatedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.INCIDENT_CREATED);
      expect(adapter.eventType).toBe('game.incident.created');
    });

    it('createIncidentResolvedAdapter should use GAME_EVENT_TYPES.INCIDENT_RESOLVED', () => {
      const adapter = createIncidentResolvedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.INCIDENT_RESOLVED);
      expect(adapter.eventType).toBe('game.incident.resolved');
    });
  });

  describe('Breach adapters', () => {
    it('createBreachOccurredAdapter should use GAME_EVENT_TYPES.BREACH_OCCURRED', () => {
      const adapter = createBreachOccurredAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.BREACH_OCCURRED);
      expect(adapter.eventType).toBe('game.breach.occurred');
    });

    it('createBreachRansomPaidAdapter should use GAME_EVENT_TYPES.BREACH_RANSOM_PAID', () => {
      const adapter = createBreachRansomPaidAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.BREACH_RANSOM_PAID);
      expect(adapter.eventType).toBe('game.breach.ransom_paid');
    });

    it('createBreachRansomRefusedAdapter should use GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED', () => {
      const adapter = createBreachRansomRefusedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED);
      expect(adapter.eventType).toBe('game.breach.ransom_refused');
    });

    it('createBreachRecoveryStartedAdapter should use GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED', () => {
      const adapter = createBreachRecoveryStartedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED);
      expect(adapter.eventType).toBe('game.breach.recovery_started');
    });

    it('createBreachRecoveryCompletedAdapter should use GAME_EVENT_TYPES.BREACH_RECOVERY_COMPLETED', () => {
      const adapter = createBreachRecoveryCompletedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.BREACH_RECOVERY_COMPLETED);
      expect(adapter.eventType).toBe('game.breach.recovery_completed');
    });

    it('createBreachPostEffectsStartedAdapter should use GAME_EVENT_TYPES.BREACH_POST_EFFECTS_STARTED', () => {
      const adapter = createBreachPostEffectsStartedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.BREACH_POST_EFFECTS_STARTED);
      expect(adapter.eventType).toBe('game.breach.post_effects_started');
    });
  });

  describe('Upgrade and resource adapters', () => {
    it('createUpgradePurchasedAdapter should use GAME_EVENT_TYPES.UPGRADE_PURCHASED', () => {
      const adapter = createUpgradePurchasedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.UPGRADE_PURCHASED);
      expect(adapter.eventType).toBe('game.upgrade.purchased');
    });

    it('createResourceAdjustedAdapter should use GAME_EVENT_TYPES.RESOURCE_ADJUSTED', () => {
      const adapter = createResourceAdjustedAdapter();
      expect(adapter.eventType).toBe(GAME_EVENT_TYPES.RESOURCE_ADJUSTED);
      expect(adapter.eventType).toBe('game.resource.adjusted');
    });
  });
});
