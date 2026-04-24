import { GAME_EVENT_TYPES } from './event-types.js';

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
  eventType: GAME_EVENT_TYPES.SESSION_STARTED,
  toActionPayload: () => ({ type: 'ACK_DAY_START' }) as AckDayStartPayload,
});

export const createDayStartedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.DAY_STARTED,
  toActionPayload: () => ({ type: 'ACK_DAY_START' }) as AckDayStartPayload,
});

export const createDayEndedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.DAY_ENDED,
  toActionPayload: () => ({ type: 'ADVANCE_DAY' }) as AdvanceDayPayload,
});

export const createSessionPausedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.SESSION_PAUSED,
  toActionPayload: () => ({ type: 'PAUSE_SESSION' }) as PauseSessionPayload,
});

export const createSessionResumedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.SESSION_RESUMED,
  toActionPayload: () => ({ type: 'RESUME_SESSION' }) as ResumeSessionPayload,
});

export const createSessionAbandonedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.SESSION_ABANDONED,
  toActionPayload: (eventData) =>
    ({
      type: 'ABANDON_SESSION',
      reason: (eventData as { reason?: string }).reason ?? '',
    }) as AbandonSessionPayload,
});

export const createSessionCompletedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.SESSION_COMPLETED,
  toActionPayload: () => ({ type: 'ABANDON_SESSION' }) as AbandonSessionPayload,
});

export const createEmailOpenedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.EMAIL_OPENED,
  toActionPayload: (eventData) =>
    ({
      type: 'OPEN_EMAIL',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
    }) as OpenEmailPayload,
});

export const createEmailIndicatorMarkedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED,
  toActionPayload: (eventData) => ({
    type: 'MARK_INDICATOR',
    emailId: (eventData as { emailId?: string }).emailId ?? '',
    indicatorType: (eventData as { indicatorType?: string }).indicatorType ?? '',
  }),
});

export const createEmailVerificationRequestedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED,
  toActionPayload: (eventData) =>
    ({
      type: 'REQUEST_VERIFICATION',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
    }) as RequestVerificationPayload,
});

export const createEmailDecisionSubmittedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED,
  toActionPayload: (eventData) =>
    ({
      type: 'SUBMIT_DECISION',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
      decision: ((eventData as { decision?: string }).decision as DecisionType) ?? 'deny',
      timeSpentMs: (eventData as { timeSpentMs?: number }).timeSpentMs ?? 0,
    }) as SubmitDecisionPayload,
});

export const createEmailDecisionResolvedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED,
  toActionPayload: (eventData) =>
    ({
      type: 'CLOSE_VERIFICATION',
      emailId: (eventData as { emailId?: string }).emailId ?? '',
    }) as CloseVerificationPayload,
});

export const createConsequencesAppliedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.CONSEQUENCES_APPLIED,
  toActionPayload: (eventData) =>
    ({
      type: 'APPLY_CONSEQUENCES',
      dayNumber: (eventData as { day?: number }).day ?? 1,
    }) as ApplyConsequencesPayload,
});

export const createThreatsGeneratedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.THREATS_GENERATED,
  toActionPayload: (eventData) =>
    ({
      type: 'PROCESS_THREATS',
      dayNumber: (eventData as { day?: number }).day ?? 1,
    }) as ProcessThreatsPayload,
});

export const createIncidentCreatedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.INCIDENT_CREATED,
  toActionPayload: (eventData) =>
    ({
      type: 'PROCESS_THREATS',
      dayNumber: (eventData as { day?: number }).day ?? 1,
    }) as ProcessThreatsPayload,
});

export const createBreachOccurredAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.BREACH_OCCURRED,
  toActionPayload: (eventData) =>
    ({
      type: 'TRIGGER_BREACH',
      triggerType: (eventData as { triggerType?: string }).triggerType ?? '',
      severity: (eventData as { severity?: number }).severity ?? 1,
    }) as TriggerBreachPayload,
});

export const createBreachRansomPaidAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.BREACH_RANSOM_PAID,
  toActionPayload: (eventData) =>
    ({
      type: 'PAY_RANSOM',
      amount: (eventData as { amount?: number }).amount ?? 0,
    }) as PayRansomPayload,
});

export const createBreachRansomRefusedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED,
  toActionPayload: () => ({ type: 'REFUSE_RANSOM' }) as RefuseRansomPayload,
});

export const createBreachRecoveryStartedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED,
  toActionPayload: () => ({ type: 'ADVANCE_RECOVERY' }) as AdvanceRecoveryPayload,
});

export const createBreachRecoveryCompletedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.BREACH_RECOVERY_COMPLETED,
  toActionPayload: () => ({ type: 'ADVANCE_RECOVERY' }) as AdvanceRecoveryPayload,
});

export const createBreachPostEffectsStartedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.BREACH_POST_EFFECTS_STARTED,
  toActionPayload: () => ({ type: 'ADVANCE_RECOVERY' }) as AdvanceRecoveryPayload,
});

export const createIncidentResolvedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.INCIDENT_RESOLVED,
  toActionPayload: (eventData) => ({
    type: 'RESOLVE_INCIDENT',
    incidentId: (eventData as { incidentId?: string }).incidentId ?? '',
    responseActions: (eventData as { responseActions?: string[] }).responseActions ?? [],
  }),
});

export const createUpgradePurchasedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.UPGRADE_PURCHASED,
  toActionPayload: (eventData) => ({
    type: 'PURCHASE_UPGRADE',
    upgradeId: (eventData as { upgradeId?: string }).upgradeId ?? '',
  }),
});

export const createResourceAdjustedAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.RESOURCE_ADJUSTED,
  toActionPayload: (eventData) => ({
    type: 'ADJUST_RESOURCE',
    resourceId: (eventData as { resourceId?: string }).resourceId ?? '',
    delta: (eventData as { delta?: number }).delta ?? 0,
  }),
});

export const createGameOverAdapter = (): EventAdapter => ({
  eventType: GAME_EVENT_TYPES.GAME_OVER,
  toActionPayload: () => ({ type: 'ACK_DAY_START' }) as AckDayStartPayload,
});
