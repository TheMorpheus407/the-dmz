import type { GameEventType } from './event-types.js';
import type {
  GameActionPayload,
  AckDayStartPayload,
  AdvanceDayPayload,
  OpenEmailPayload,
  RequestVerificationPayload,
  CloseVerificationPayload,
  SubmitDecisionPayload,
  ApplyConsequencesPayload,
  ProcessThreatsPayload,
  PauseSessionPayload,
  ResumeSessionPayload,
  AbandonSessionPayload,
  TriggerBreachPayload,
  PayRansomPayload,
  RefuseRansomPayload,
  AdvanceRecoveryPayload,
} from '../types/game-state.js';
import type { DecisionType } from '../types/game-engine.js';

export interface EventAdapter {
  readonly eventType: GameEventType;
  toActionPayload(eventData: Record<string, unknown>): GameActionPayload | null;
}

export class EventAdapterRegistry {
  private adapters: Map<GameEventType, EventAdapter> = new Map();

  register(adapter: EventAdapter): void {
    this.adapters.set(adapter.eventType, adapter);
  }

  hasAdapter(eventType: GameEventType): boolean {
    return this.adapters.has(eventType);
  }

  toActionPayload(
    eventType: GameEventType,
    eventData: Record<string, unknown>,
  ): GameActionPayload | null {
    const adapter = this.adapters.get(eventType);
    if (!adapter) {
      return null;
    }
    return adapter.toActionPayload(eventData);
  }
}

export const createSessionStartedAdapter = (): EventAdapter => ({
  eventType: 'game.session.started',
  toActionPayload: () => ({ type: 'ACK_DAY_START' }) as AckDayStartPayload,
});

export const createDayStartedAdapter = (): EventAdapter => ({
  eventType: 'game.day.started',
  toActionPayload: () => ({ type: 'ACK_DAY_START' }) as AckDayStartPayload,
});

export const createDayEndedAdapter = (): EventAdapter => ({
  eventType: 'game.day.ended',
  toActionPayload: () => ({ type: 'ADVANCE_DAY' }) as AdvanceDayPayload,
});

export const createSessionPausedAdapter = (): EventAdapter => ({
  eventType: 'game.session.paused',
  toActionPayload: () => ({ type: 'PAUSE_SESSION' }) as PauseSessionPayload,
});

export const createSessionResumedAdapter = (): EventAdapter => ({
  eventType: 'game.session.resumed',
  toActionPayload: () => ({ type: 'RESUME_SESSION' }) as ResumeSessionPayload,
});

export const createSessionAbandonedAdapter = (): EventAdapter => ({
  eventType: 'game.session.abandoned',
  toActionPayload: (eventData) =>
    ({
      type: 'ABANDON_SESSION',
      reason: (eventData as { reason?: string }).reason ?? '',
    }) as AbandonSessionPayload,
});

export const createSessionCompletedAdapter = (): EventAdapter => ({
  eventType: 'game.session.completed',
  toActionPayload: () => ({ type: 'ABANDON_SESSION' }) as AbandonSessionPayload,
});

export const createEmailOpenedAdapter = (): EventAdapter => ({
  eventType: 'game.email.opened',
  toActionPayload: (eventData) =>
    ({
      type: 'OPEN_EMAIL',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
    }) as OpenEmailPayload,
});

export const createEmailIndicatorMarkedAdapter = (): EventAdapter => ({
  eventType: 'game.email.indicator_marked',
  toActionPayload: (eventData) => ({
    type: 'MARK_INDICATOR',
    emailId: (eventData as { emailId?: string }).emailId ?? '',
    indicatorType: (eventData as { indicatorType?: string }).indicatorType ?? '',
  }),
});

export const createEmailVerificationRequestedAdapter = (): EventAdapter => ({
  eventType: 'game.email.verification_requested',
  toActionPayload: (eventData) =>
    ({
      type: 'REQUEST_VERIFICATION',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
    }) as RequestVerificationPayload,
});

export const createEmailDecisionSubmittedAdapter = (): EventAdapter => ({
  eventType: 'game.email.decision_submitted',
  toActionPayload: (eventData) =>
    ({
      type: 'SUBMIT_DECISION',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
      decision: ((eventData as { decision?: string }).decision as DecisionType) ?? 'deny',
      timeSpentMs: (eventData as { timeSpentMs?: number }).timeSpentMs ?? 0,
    }) as SubmitDecisionPayload,
});

export const createEmailDecisionResolvedAdapter = (): EventAdapter => ({
  eventType: 'game.email.decision_resolved',
  toActionPayload: (eventData) =>
    ({
      type: 'CLOSE_VERIFICATION',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
    }) as CloseVerificationPayload,
});

export const createConsequencesAppliedAdapter = (): EventAdapter => ({
  eventType: 'game.consequences.applied',
  toActionPayload: (eventData) =>
    ({
      type: 'APPLY_CONSEQUENCES',
      dayNumber: (eventData as { day?: number }).day ?? 1,
    }) as ApplyConsequencesPayload,
});

export const createThreatsGeneratedAdapter = (): EventAdapter => ({
  eventType: 'game.threats.generated',
  toActionPayload: (eventData) =>
    ({
      type: 'PROCESS_THREATS',
      dayNumber: (eventData as { day?: number }).day ?? 1,
    }) as ProcessThreatsPayload,
});

export const createIncidentCreatedAdapter = (): EventAdapter => ({
  eventType: 'game.incident.created',
  toActionPayload: (eventData) =>
    ({
      type: 'PROCESS_THREATS',
      dayNumber: (eventData as { day?: number }).day ?? 1,
    }) as ProcessThreatsPayload,
});

export const createBreachOccurredAdapter = (): EventAdapter => ({
  eventType: 'game.breach.occurred',
  toActionPayload: (eventData) =>
    ({
      type: 'TRIGGER_BREACH',
      triggerType: (eventData as { triggerType?: string }).triggerType ?? '',
      severity: (eventData as { severity?: number }).severity ?? 1,
    }) as TriggerBreachPayload,
});

export const createBreachRansomPaidAdapter = (): EventAdapter => ({
  eventType: 'game.breach.ransom_paid',
  toActionPayload: (eventData) =>
    ({
      type: 'PAY_RANSOM',
      amount: (eventData as { amount?: number }).amount ?? 0,
    }) as PayRansomPayload,
});

export const createBreachRansomRefusedAdapter = (): EventAdapter => ({
  eventType: 'game.breach.ransom_refused',
  toActionPayload: () => ({ type: 'REFUSE_RANSOM' }) as RefuseRansomPayload,
});

export const createBreachRecoveryStartedAdapter = (): EventAdapter => ({
  eventType: 'game.breach.recovery_started',
  toActionPayload: () => ({ type: 'ADVANCE_RECOVERY' }) as AdvanceRecoveryPayload,
});

export const createBreachRecoveryCompletedAdapter = (): EventAdapter => ({
  eventType: 'game.breach.recovery_completed',
  toActionPayload: () => ({ type: 'ADVANCE_RECOVERY' }) as AdvanceRecoveryPayload,
});

export const createBreachPostEffectsStartedAdapter = (): EventAdapter => ({
  eventType: 'game.breach.post_effects_started',
  toActionPayload: () => ({ type: 'ADVANCE_RECOVERY' }) as AdvanceRecoveryPayload,
});

export const createIncidentResolvedAdapter = (): EventAdapter => ({
  eventType: 'game.incident.resolved',
  toActionPayload: (eventData) => ({
    type: 'RESOLVE_INCIDENT',
    incidentId: (eventData as { incidentId?: string }).incidentId ?? '',
    responseActions: (eventData as { responseActions?: string[] }).responseActions ?? [],
  }),
});

export const createUpgradePurchasedAdapter = (): EventAdapter => ({
  eventType: 'game.upgrade.purchased',
  toActionPayload: (eventData) => ({
    type: 'PURCHASE_UPGRADE',
    upgradeId: (eventData as { upgradeId?: string }).upgradeId ?? '',
  }),
});

export const createResourceAdjustedAdapter = (): EventAdapter => ({
  eventType: 'game.resource.adjusted',
  toActionPayload: (eventData) => ({
    type: 'ADJUST_RESOURCE',
    resourceId: (eventData as { resourceId?: string }).resourceId ?? '',
    delta: (eventData as { delta?: number }).delta ?? 0,
  }),
});

export const createGameOverAdapter = (): EventAdapter => ({
  eventType: 'game.session.game_over',
  toActionPayload: () => ({ type: 'ACK_DAY_START' }) as AckDayStartPayload,
});
