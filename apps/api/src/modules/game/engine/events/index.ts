export {
  GAME_ENGINE_EVENTS,
  type GameEngineEventType,
  type BaseGameEngineEventParams,
  type GameEngineDomainEvent,
  type GameEngineEventPayloadMap,
} from './shared-types.js';

export {
  createSessionStartedEvent,
  createSessionEndedEvent,
  createSessionPausedEvent,
  createSessionResumedEvent,
  createSessionCompletedEvent,
  createSessionAbandonedEvent,
  createSessionBreachRecoveryEvent,
  createDayStartedEvent,
  createDayPhaseChangedEvent,
  createDayEndedEvent,
} from './events.session.js';
export type {
  SessionStartedPayload,
  SessionEndedPayload,
  SessionPausedPayload,
  SessionResumedPayload,
  SessionCompletedPayload,
  SessionAbandonedPayload,
  SessionBreachRecoveryPayload,
  DayStartedPayload,
  DayPhaseChangedPayload,
  DayEndedPayload,
} from './events.session.js';

export {
  createEmailReceivedEvent,
  createEmailOpenedEvent,
  createEmailIndicatorMarkedEvent,
  createEmailHeaderViewedEvent,
  createEmailUrlHoveredEvent,
  createEmailAttachmentPreviewedEvent,
  createEmailVerificationRequestedEvent,
  createEmailDecisionSubmittedEvent,
  createEmailDecisionResolvedEvent,
} from './events.email.js';
export type {
  EmailReceivedPayload,
  EmailOpenedPayload,
  EmailIndicatorMarkedPayload,
  EmailHeaderViewedPayload,
  EmailUrlHoveredPayload,
  EmailAttachmentPreviewedPayload,
  EmailVerificationRequestedPayload,
  EmailDecisionSubmittedPayload,
  EmailDecisionResolvedPayload,
} from './events.email.js';

export {
  createDecisionApprovedEvent,
  createDecisionDeniedEvent,
  createDecisionFlaggedEvent,
  createDecisionVerificationRequestedEvent,
  createVerificationPacketOpenedEvent,
  createVerificationOutOfBandInitiatedEvent,
  createVerificationResultEvent,
} from './events.decision.js';
export type {
  DecisionApprovedPayload,
  DecisionDeniedPayload,
  DecisionFlaggedPayload,
  DecisionVerificationRequestedPayload,
  VerificationPacketOpenedPayload,
  VerificationOutOfBandInitiatedPayload,
  VerificationResultPayload,
} from './events.decision.js';

export {
  createThreatsGeneratedEvent,
  createThreatAttackLaunchedEvent,
  createThreatAttackMitigatedEvent,
  createThreatAttackSucceededEvent,
  createThreatBreachOccurredEvent,
  createThreatLevelChangedEvent,
} from './events.threat.js';
export type {
  ThreatsGeneratedPayload,
  ThreatAttackLaunchedPayload,
  ThreatAttackMitigatedPayload,
  ThreatAttackSucceededPayload,
  ThreatLevelChangedPayload,
} from './events.threat.js';

export {
  createBreachOccurredEvent,
  createIncidentCreatedEvent,
  createIncidentResolvedEvent,
  createIncidentResponseActionTakenEvent,
} from './events.breach.js';
export type {
  BreachOccurredPayload,
  IncidentCreatedPayload,
  IncidentResolvedPayload,
  IncidentResponseActionTakenPayload,
} from './events.breach.js';

export {
  createUpgradePurchasedEvent,
  createResourceAdjustedEvent,
  createCreditsChangedEvent,
  createTrustChangedEvent,
  createIntelChangedEvent,
  createLevelUpEvent,
  createConsequencesAppliedEvent,
} from './events.economy.js';
export type {
  UpgradePurchasedPayload,
  ResourceAdjustedPayload,
  CreditsChangedPayload,
  TrustChangedPayload,
  IntelChangedPayload,
  LevelUpPayload,
  ConsequencesAppliedPayload,
} from './events.economy.js';
