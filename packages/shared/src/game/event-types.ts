export const GAME_EVENT_TYPES = {
  SESSION_STARTED: 'game.session.started',
  DAY_STARTED: 'game.day.started',
  INBOX_GENERATED: 'game.inbox.generated',
  EMAIL_OPENED: 'game.email.opened',
  EMAIL_INDICATOR_MARKED: 'game.email.indicator_marked',
  EMAIL_VERIFICATION_REQUESTED: 'game.email.verification_requested',
  VERIFICATION_PACKET_GENERATED: 'game.verification.packet_generated',
  VERIFICATION_DISCREPANCY_FLAGGED: 'game.verification.discrepancy_flagged',
  EMAIL_DECISION_SUBMITTED: 'game.email.decision_submitted',
  EMAIL_DECISION_RESOLVED: 'game.email.decision_resolved',
  CONSEQUENCES_APPLIED: 'game.consequences.applied',
  THREATS_GENERATED: 'game.threats.generated',
  INCIDENT_CREATED: 'game.incident.created',
  INCIDENT_RESOLVED: 'game.incident.resolved',
  BREACH_OCCURRED: 'game.breach.occurred',
  UPGRADE_PURCHASED: 'game.upgrade.purchased',
  RESOURCE_ADJUSTED: 'game.resource.adjusted',
  DAY_ENDED: 'game.day.ended',
  SESSION_PAUSED: 'game.session.paused',
  SESSION_RESUMED: 'game.session.resumed',
  SESSION_ABANDONED: 'game.session.abandoned',
  SESSION_COMPLETED: 'game.session.completed',
} as const;

export type GameEventType = (typeof GAME_EVENT_TYPES)[keyof typeof GAME_EVENT_TYPES];

export const GAME_EVENT_TYPE_ARRAY: readonly GameEventType[] = [
  GAME_EVENT_TYPES.SESSION_STARTED,
  GAME_EVENT_TYPES.DAY_STARTED,
  GAME_EVENT_TYPES.INBOX_GENERATED,
  GAME_EVENT_TYPES.EMAIL_OPENED,
  GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED,
  GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED,
  GAME_EVENT_TYPES.VERIFICATION_PACKET_GENERATED,
  GAME_EVENT_TYPES.VERIFICATION_DISCREPANCY_FLAGGED,
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

export function isValidGameEventType(value: string): value is GameEventType {
  return GAME_EVENT_TYPE_ARRAY.includes(value as GameEventType);
}
